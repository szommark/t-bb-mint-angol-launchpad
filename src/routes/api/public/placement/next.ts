import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { extractLeadToken, verifyLeadToken } from "@/lib/placement-auth.server";
import {
  allowedBankSkills,
  chooseSlotLevel,
  isTestState,
  nextAdaptiveLevel,
  type IntakeSkill,
  type Level,
  type TestState,
} from "@/lib/placement-blueprint.server";
import { pickQuestionForSlot } from "@/lib/placement-selector.server";
import { buildReview, computeByLevel, type StoredQuestion } from "@/lib/placement-review.server";

const Schema = z.object({
  leadId: z.string().uuid(),
  questionId: z.string(),
  selectedIndex: z.number().int().min(0).max(3),
});

function publicOf(q: StoredQuestion) {
  return { id: q.id, prompt: q.prompt, options: q.options, skill: q.skill, cefr: q.cefr };
}

export const Route = createFileRoute("/api/public/placement/next")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = extractLeadToken(request);
        let raw: unknown;
        try { raw = await request.json(); } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = Schema.safeParse(raw);
        if (!parsed.success) return Response.json({ error: "Validation failed" }, { status: 400 });
        const { leadId, questionId, selectedIndex } = parsed.data;

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "AI not configured" }, { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: lead, error } = await supabaseAdmin
          .from("leads")
          .select("id, intake, test_questions, test_answers, session_token_hash, completed_at")
          .eq("id", leadId)
          .maybeSingle();
        if (error || !lead) return Response.json({ error: "Lead not found" }, { status: 404 });
        if (!verifyLeadToken(token, lead.session_token_hash)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (lead.completed_at) return Response.json({ error: "Test already completed" }, { status: 400 });
        if (!isTestState(lead.test_answers) || !Array.isArray(lead.test_questions)) {
          return Response.json({ error: "No test in progress" }, { status: 400 });
        }

        const state = lead.test_answers as TestState;
        const questions = lead.test_questions as StoredQuestion[];
        const intake = (lead.intake ?? {}) as { selfLevel?: Level; focus?: string | null; skills?: IntakeSkill[] };
        const selfLevel = (intake.selfLevel ?? state.currentLevel) as Level;
        const allowed = allowedBankSkills(intake.skills ?? ["reading", "writing", "speaking", "listening"]);

        const answered = questions.find((q) => q.id === questionId);
        if (!answered) return Response.json({ error: "Unknown question" }, { status: 400 });
        if (typeof state.answers[questionId] === "number") {
          return Response.json({ error: "Question already answered" }, { status: 400 });
        }

        // Record the answer + update adaptive counters/level.
        state.answers[questionId] = selectedIndex;
        const isCorrect = selectedIndex === answered.correctIndex;
        const step = nextAdaptiveLevel(state.currentLevel, isCorrect, state.consecCorrect, state.consecWrong, selfLevel);
        state.currentLevel = step.level;
        state.consecCorrect = step.consecCorrect;
        state.consecWrong = step.consecWrong;

        const answeredCount = Object.keys(state.answers).length;

        // Finalize if we've reached the plan.
        if (answeredCount >= state.totalPlanned) {
          return await finalize(supabaseAdmin, leadId, questions, state);
        }

        // Pick next slot level using adaptive target + remaining budgets.
        const slotLevel = chooseSlotLevel(state.currentLevel, state.budgets);
        if (!slotLevel) {
          return await finalize(supabaseAdmin, leadId, questions, state);
        }
        const preferredSkill = allowed[state.skillRotation % allowed.length];
        const nextIdx = questions.length + 1;
        const next = await pickQuestionForSlot({
          supabaseAdmin,
          slotId: `q${nextIdx}`,
          level: slotLevel,
          preferredSkill,
          allowedSkills: allowed,
          usedBankIds: state.usedBankIds,
          focus: intake.focus ?? null,
          lovableApiKey: key,
        });
        if (!next) return Response.json({ error: "Could not prepare next question." }, { status: 502 });

        state.budgets[next.cefr] = Math.max(0, (state.budgets[next.cefr] ?? 0) - 1);
        state.usedBankIds.push(next.bankId);
        state.skillRotation += 1;

        const updated = [...questions, next];
        const { error: updErr } = await supabaseAdmin
          .from("leads")
          .update({ test_questions: updated, test_answers: state })
          .eq("id", leadId);
        if (updErr) {
          console.error("[placement/next] save error", updErr);
          return Response.json({ error: "Could not save progress" }, { status: 500 });
        }

        return Response.json({
          ok: true,
          current: publicOf(next),
          answeredCount,
          totalPlanned: state.totalPlanned,
        });
      },
    },
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function finalize(supabaseAdmin: any, leadId: string, questions: StoredQuestion[], state: TestState) {
  const { level, totalCorrect, totalQ, byLevel, summary } = derive(questions, state.answers);
  const { error: updErr } = await supabaseAdmin
    .from("leads")
    .update({
      test_questions: questions,
      test_answers: state,
      cefr_level: level,
      score_summary: summary,
      completed_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (updErr) {
    console.error("[placement/next] finalize save error", updErr);
    return Response.json({ error: "Could not save result" }, { status: 500 });
  }
  await logAttempt(supabaseAdmin, leadId, questions, state.answers, level, totalCorrect, totalQ);
  return Response.json({
    ok: true,
    done: true,
    level,
    totalCorrect,
    totalQ,
    summary,
    byLevel,
    review: buildReview(questions, state.answers),
  });
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function derive(questions: StoredQuestion[], answers: Record<string, number>) {
  const { byLevel, totalCorrect, totalQ } = computeByLevel(questions, answers);
  let level: (typeof LEVELS)[number] = "A1";
  for (const l of LEVELS) {
    const { correct, total } = byLevel[l];
    if (total === 0) continue;
    if (correct / total >= 0.6) level = l;
    else break;
  }
  const strongest = Object.entries(byLevel)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].correct / Math.max(b[1].total, 1) - a[1].correct / Math.max(a[1].total, 1))[0]?.[0] ?? level;
  const summary = `${totalCorrect}/${totalQ} correct overall. Strongest at ${strongest} level items.`;
  return { level, totalCorrect, totalQ, byLevel, summary };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAttempt(supabaseAdmin: any, leadId: string, questions: StoredQuestion[], answers: Record<string, number>, level: string, totalCorrect: number, totalQ: number) {
  try {
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from("test_attempts")
      .insert({ lead_id: leadId, final_level: level, score: totalCorrect, total_questions: totalQ })
      .select("id")
      .single();
    if (attemptErr || !attempt) throw attemptErr ?? new Error("no attempt id");
    const rows = (questions as Array<StoredQuestion & { bankId?: string }>)
      .filter((q) => !!q.bankId && typeof answers[q.id] === "number")
      .map((q) => {
        const userIdx = answers[q.id];
        return {
          attempt_id: attempt.id,
          question_id: q.bankId!,
          selected_answer: userIdx !== undefined ? q.options[userIdx] ?? null : null,
          is_correct: userIdx === q.correctIndex,
        };
      });
    if (rows.length > 0) {
      const { error: ansErr } = await supabaseAdmin.from("attempt_answers").insert(rows);
      if (ansErr) throw ansErr;
    }
  } catch (logErr) {
    console.error("[placement/next] attempt logging failed", logErr);
  }
}
