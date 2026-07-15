import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { extractLeadToken, verifyLeadToken } from "@/lib/placement-auth.server";
import {
  advanceStaircase,
  deriveFinalGrammarResult,
  isGrammarTestState,
  type GrammarTestState,
} from "@/lib/grammar-blueprint.server";
import { pickGrammarQuestionForSlot } from "@/lib/grammar-selector.server";
import { buildReview, type StoredQuestion } from "@/lib/placement-review.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

const Schema = z.object({
  leadId: z.string().uuid(),
  questionId: z.string(),
  selectedIndex: z.number().int().min(0).max(3),
});

function publicOf(q: StoredQuestion) {
  return { id: q.id, prompt: q.prompt, options: q.options, skill: q.skill, cefr: q.cefr };
}

export const Route = createFileRoute("/api/public/grammar/next")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = extractLeadToken(request);
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = Schema.safeParse(raw);
        if (!parsed.success) return Response.json({ error: "Validation failed" }, { status: 400 });
        const { leadId, questionId, selectedIndex } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: lead, error } = await supabaseAdmin
          .from("anonymous_sessions")
          .select(
            "id, grammar_test_questions, grammar_test_answers, session_token_hash, grammar_completed_at, claimed_by_user_id",
          )
          .eq("id", leadId)
          .maybeSingle();
        if (error || !lead) return Response.json({ error: "Lead not found" }, { status: 404 });
        if (!verifyLeadToken(token, lead.session_token_hash)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (lead.grammar_completed_at)
          return Response.json({ error: "Test already completed" }, { status: 400 });
        if (
          !isGrammarTestState(lead.grammar_test_answers) ||
          !Array.isArray(lead.grammar_test_questions)
        ) {
          return Response.json({ error: "No test in progress" }, { status: 400 });
        }

        let state = lead.grammar_test_answers as GrammarTestState;
        const questions = lead.grammar_test_questions as StoredQuestion[];

        const answered = questions.find((q) => q.id === questionId);
        if (!answered) return Response.json({ error: "Unknown question" }, { status: 400 });
        if (typeof state.answers[questionId] === "number") {
          return Response.json({ error: "Question already answered" }, { status: 400 });
        }

        // Record the answer, then step the staircase (moves the level,
        // tracks reversals, freezes at the boundary, or tallies a confirm item).
        state = { ...state, answers: { ...state.answers, [questionId]: selectedIndex } };
        const isCorrect = selectedIndex === answered.correctIndex;
        state = advanceStaircase(state, isCorrect);

        const answeredCount = Object.keys(state.answers).length;

        // Finalize if we've reached the plan.
        if (answeredCount >= state.totalPlanned) {
          return await finalize(
            supabaseAdmin,
            leadId,
            questions,
            state,
            lead.claimed_by_user_id ?? null,
          );
        }

        const nextIdx = questions.length + 1;
        const next = await pickGrammarQuestionForSlot({
          supabaseAdmin,
          slotId: `q${nextIdx}`,
          level: state.currentLevel,
          usedBankIds: state.usedBankIds,
          usedTags: state.usedTags,
        });
        if ("error" in next) return Response.json({ error: next.error }, { status: 502 });

        state = {
          ...state,
          usedBankIds: [...state.usedBankIds, next.bankId],
          usedTags: next.tag ? [...state.usedTags, next.tag] : state.usedTags,
        };

        const nextStored: StoredQuestion & { bankId: string } = {
          id: next.id,
          prompt: next.prompt,
          options: next.options,
          correctIndex: next.correctIndex,
          skill: "grammar",
          cefr: next.cefr,
          explanation: next.explanation,
          bankId: next.bankId,
        };

        const updated = [...questions, nextStored];
        const { error: updErr } = await supabaseAdmin
          .from("anonymous_sessions")
          .update({ grammar_test_questions: updated, grammar_test_answers: state })
          .eq("id", leadId);
        if (updErr) {
          console.error("[grammar/next] save error", updErr);
          return Response.json({ error: "Could not save progress" }, { status: 500 });
        }

        return Response.json({
          ok: true,
          current: publicOf(nextStored),
          answeredCount,
          totalPlanned: state.totalPlanned,
        });
      },
    },
  },
});

async function finalize(
  supabaseAdmin: Admin,
  leadId: string,
  questions: StoredQuestion[],
  state: GrammarTestState,
  claimedByUserId: string | null,
) {
  const { level, totalCorrect, totalQ, byLevel, summary } = deriveFinalGrammarResult(
    state,
    questions,
    state.answers,
  );
  const { error: updErr } = await supabaseAdmin
    .from("anonymous_sessions")
    .update({
      grammar_test_questions: questions,
      grammar_test_answers: state,
      grammar_cefr_level: level,
      grammar_score_summary: summary,
      grammar_completed_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (updErr) {
    console.error("[grammar/next] finalize save error", updErr);
    return Response.json({ error: "Could not save result" }, { status: 500 });
  }
  await logAttempt(
    supabaseAdmin,
    leadId,
    questions,
    state.answers,
    level,
    totalCorrect,
    totalQ,
    claimedByUserId,
  );
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

async function logAttempt(
  supabaseAdmin: Admin,
  leadId: string,
  questions: StoredQuestion[],
  answers: Record<string, number>,
  level: string,
  totalCorrect: number,
  totalQ: number,
  claimedByUserId: string | null,
) {
  try {
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from("grammar_test_attempts")
      .insert({
        anonymous_session_id: leadId,
        final_level: level,
        score: totalCorrect,
        total_questions: totalQ,
        user_id: claimedByUserId,
      })
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
          selected_answer: userIdx !== undefined ? (q.options[userIdx] ?? null) : null,
          is_correct: userIdx === q.correctIndex,
        };
      });
    if (rows.length > 0) {
      const { error: ansErr } = await supabaseAdmin.from("grammar_attempt_answers").insert(rows);
      if (ansErr) throw ansErr;
    }
  } catch (logErr) {
    console.error("[grammar/next] attempt logging failed", logErr);
  }
}
