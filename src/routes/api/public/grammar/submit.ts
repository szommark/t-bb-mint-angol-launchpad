// Timeout / early-submit path. Finalizes using whatever answers the user
// has recorded server-side. Adaptive answers are recorded via /next.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { extractLeadToken, verifyLeadToken } from "@/lib/placement-auth.server";
import { buildReview, type StoredQuestion } from "@/lib/placement-review.server";
import {
  deriveFinalGrammarResult,
  isGrammarTestState,
  type GrammarTestState,
} from "@/lib/grammar-blueprint.server";

const SubmitSchema = z.object({
  leadId: z.string().uuid(),
});

export const Route = createFileRoute("/api/public/grammar/submit")({
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
        const parsed = SubmitSchema.safeParse(raw);
        if (!parsed.success) return Response.json({ error: "Validation failed" }, { status: 400 });
        const { leadId } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: lead, error } = await supabaseAdmin
          .from("anonymous_sessions")
          .select(
            "id, grammar_test_questions, grammar_test_answers, session_token_hash, grammar_completed_at, grammar_cefr_level, grammar_score_summary",
          )
          .eq("id", leadId)
          .maybeSingle();
        if (error || !lead) return Response.json({ error: "Lead not found" }, { status: 404 });
        if (!verifyLeadToken(token, lead.session_token_hash)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (
          !Array.isArray(lead.grammar_test_questions) ||
          !isGrammarTestState(lead.grammar_test_answers)
        ) {
          return Response.json({ error: "No test in progress" }, { status: 400 });
        }
        const questions = lead.grammar_test_questions as StoredQuestion[];
        const state = lead.grammar_test_answers as GrammarTestState;

        // If already completed, just return the cached result.
        if (lead.grammar_completed_at && lead.grammar_cefr_level) {
          const { totalCorrect, totalQ, byLevel } = deriveFinalGrammarResult(
            state,
            questions,
            state.answers,
          );
          return Response.json({
            ok: true,
            level: lead.grammar_cefr_level,
            totalCorrect,
            totalQ,
            summary: lead.grammar_score_summary ?? "",
            byLevel,
            review: buildReview(questions, state.answers),
          });
        }

        const { level, totalCorrect, totalQ, byLevel, summary } = deriveFinalGrammarResult(
          state,
          questions,
          state.answers,
        );

        const { error: updErr } = await supabaseAdmin
          .from("anonymous_sessions")
          .update({
            grammar_cefr_level: level,
            grammar_score_summary: summary,
            grammar_completed_at: new Date().toISOString(),
          })
          .eq("id", leadId);
        if (updErr) {
          console.error("[grammar/submit] save error", updErr);
          return Response.json({ error: "Could not save your result" }, { status: 500 });
        }

        try {
          const { data: attempt, error: attemptErr } = await supabaseAdmin
            .from("grammar_test_attempts")
            .insert({
              anonymous_session_id: leadId,
              final_level: level,
              score: totalCorrect,
              total_questions: totalQ,
            })
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
                selected_answer: userIdx !== undefined ? (q.options[userIdx] ?? null) : null,
                is_correct: userIdx === q.correctIndex,
              };
            });
          if (rows.length > 0) {
            const { error: ansErr } = await supabaseAdmin
              .from("grammar_attempt_answers")
              .insert(rows);
            if (ansErr) throw ansErr;
          }
        } catch (logErr) {
          console.error("[grammar/submit] attempt logging failed", logErr);
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
