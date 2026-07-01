// Timeout / early-submit path. Finalizes using whatever answers the user
// has recorded server-side. Adaptive answers are recorded via /next.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { extractLeadToken, verifyLeadToken } from "@/lib/placement-auth.server";
import { buildReview, computeByLevel, type StoredQuestion } from "@/lib/placement-review.server";
import { isTestState, type TestState } from "@/lib/placement-blueprint.server";

const SubmitSchema = z.object({
  leadId: z.string().uuid(),
});

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
  return { level, totalCorrect, totalQ, byLevel };
}

export const Route = createFileRoute("/api/public/placement/submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = extractLeadToken(request);
        let raw: unknown;
        try { raw = await request.json(); } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = SubmitSchema.safeParse(raw);
        if (!parsed.success) return Response.json({ error: "Validation failed" }, { status: 400 });
        const { leadId } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: lead, error } = await supabaseAdmin
          .from("leads")
          .select("id, test_questions, test_answers, session_token_hash, completed_at, cefr_level, score_summary")
          .eq("id", leadId)
          .maybeSingle();
        if (error || !lead) return Response.json({ error: "Lead not found" }, { status: 404 });
        if (!verifyLeadToken(token, lead.session_token_hash)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!Array.isArray(lead.test_questions) || !isTestState(lead.test_answers)) {
          return Response.json({ error: "No test in progress" }, { status: 400 });
        }
        const questions = lead.test_questions as StoredQuestion[];
        const state = lead.test_answers as TestState;

        // If already completed, just return the cached result.
        if (lead.completed_at && lead.cefr_level) {
          const { totalCorrect, totalQ, byLevel } = derive(questions, state.answers);
          return Response.json({
            ok: true,
            level: lead.cefr_level,
            totalCorrect,
            totalQ,
            summary: lead.score_summary ?? "",
            byLevel,
            review: buildReview(questions, state.answers),
          });
        }

        const { level, totalCorrect, totalQ, byLevel } = derive(questions, state.answers);
        const strongest = Object.entries(byLevel)
          .filter(([, v]) => v.total > 0)
          .sort((a, b) => b[1].correct / Math.max(b[1].total, 1) - a[1].correct / Math.max(a[1].total, 1))[0]?.[0] ?? level;
        const summary = `${totalCorrect}/${totalQ} correct overall. Strongest at ${strongest} level items.`;

        const { error: updErr } = await supabaseAdmin
          .from("leads")
          .update({
            cefr_level: level,
            score_summary: summary,
            completed_at: new Date().toISOString(),
          })
          .eq("id", leadId);
        if (updErr) {
          console.error("[placement/submit] save error", updErr);
          return Response.json({ error: "Could not save your result" }, { status: 500 });
        }

        try {
          const { data: attempt, error: attemptErr } = await supabaseAdmin
            .from("test_attempts")
            .insert({ lead_id: leadId, final_level: level, score: totalCorrect, total_questions: totalQ })
            .select("id")
            .single();
          if (attemptErr || !attempt) throw attemptErr ?? new Error("no attempt id");
          const rows = (questions as Array<StoredQuestion & { bankId?: string }>)
            .filter((q) => !!q.bankId && typeof state.answers[q.id] === "number")
            .map((q) => {
              const userIdx = state.answers[q.id];
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
          console.error("[placement/submit] attempt logging failed", logErr);
        }

        return Response.json({
          ok: true,
          level,
          totalCorrect,
          totalQ,
          summary,
          byLevel,
          review: buildReview(questions, state.answers),
        });
      },
    },
  },
});
