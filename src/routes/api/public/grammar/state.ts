import { createFileRoute } from "@tanstack/react-router";
import { extractLeadToken, verifyLeadToken } from "@/lib/placement-auth.server";
import { buildReview, computeByLevel, type StoredQuestion } from "@/lib/placement-review.server";
import { isGrammarTestState, type GrammarTestState } from "@/lib/grammar-blueprint.server";

export const Route = createFileRoute("/api/public/grammar/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const leadId = url.searchParams.get("leadId");
        if (!leadId || !/^[0-9a-f-]{36}$/i.test(leadId)) {
          return Response.json({ error: "Invalid leadId" }, { status: 400 });
        }
        const token = extractLeadToken(request);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("anonymous_sessions")
          .select("id, name, language, grammar_intake, grammar_test_questions, grammar_test_answers, grammar_cefr_level, grammar_score_summary, grammar_completed_at, session_token_hash")
          .eq("id", leadId)
          .maybeSingle();
        if (error || !data) return Response.json({ error: "Not found" }, { status: 404 });
        if (!verifyLeadToken(token, data.session_token_hash)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const hasState = isGrammarTestState(data.grammar_test_answers) && Array.isArray(data.grammar_test_questions);
        const state = hasState ? (data.grammar_test_answers as GrammarTestState) : null;
        const questions = hasState ? (data.grammar_test_questions as StoredQuestion[]) : [];

        let review: ReturnType<typeof buildReview> | null = null;
        let byLevel: ReturnType<typeof computeByLevel>["byLevel"] | null = null;
        let totalCorrect = 0;
        let totalQ = 0;
        let current: { id: string; prompt: string; options: string[]; skill: string; cefr: string } | null = null;
        let answeredCount = 0;
        let totalPlanned = 0;

        if (data.grammar_completed_at && state) {
          review = buildReview(questions, state.answers);
          const stats = computeByLevel(questions, state.answers);
          byLevel = stats.byLevel;
          totalCorrect = stats.totalCorrect;
          totalQ = stats.totalQ;
        } else if (state) {
          answeredCount = Object.keys(state.answers).length;
          totalPlanned = state.totalPlanned;
          // Serve the last unanswered question (most recently added slot).
          const unanswered = questions.find((q) => typeof state.answers[q.id] !== "number");
          if (unanswered) {
            current = { id: unanswered.id, prompt: unanswered.prompt, options: unanswered.options, skill: unanswered.skill, cefr: unanswered.cefr };
          }
        }

        return Response.json({
          id: data.id,
          name: data.name,
          language: data.language,
          intake: data.grammar_intake,
          cefrLevel: data.grammar_cefr_level,
          summary: data.grammar_score_summary,
          completedAt: data.grammar_completed_at,
          current,
          answeredCount,
          totalPlanned,
          review,
          byLevel,
          totalCorrect,
          totalQ,
        });
      },
    },
  },
});
