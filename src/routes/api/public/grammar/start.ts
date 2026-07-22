import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { extractLeadToken, verifyLeadToken } from "@/lib/placement-auth.server";
import {
  initialGrammarTestState,
  SEED_LEVEL,
  type GrammarTestState,
} from "@/lib/grammar-blueprint.server";
import {
  getPreviouslyAnsweredGrammarBankIds,
  pickGrammarQuestionForSlot,
} from "@/lib/grammar-selector.server";
import type { StoredQuestion } from "@/lib/placement-review.server";

const StartSchema = z.object({
  leadId: z.string().uuid(),
});

function publicOf(q: StoredQuestion) {
  return { id: q.id, prompt: q.prompt, options: q.options, skill: q.skill, cefr: q.cefr };
}

export const Route = createFileRoute("/api/public/grammar/start")({
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
        const parsed = StartSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", issues: parsed.error.flatten() },
            { status: 400 },
          );
        }
        const { leadId } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: lead, error: leadErr } = await supabaseAdmin
          .from("anonymous_sessions")
          .select("id, email, session_token_hash")
          .eq("id", leadId)
          .maybeSingle();
        if (leadErr || !lead) return Response.json({ error: "Lead not found" }, { status: 404 });
        if (!verifyLeadToken(token, lead.session_token_hash)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Exclude questions this student has already answered in past
        // completed grammar attempts, so a retake doesn't repeat the same items.
        const priorBankIds = lead.email
          ? await getPreviouslyAnsweredGrammarBankIds(supabaseAdmin, lead.email)
          : [];

        // Always start a fresh test on intake submission. Q1 always seeds
        // at B1 (the staircase midpoint) — no self-assessment involved.
        const first = await pickGrammarQuestionForSlot({
          supabaseAdmin,
          slotId: "q1",
          level: SEED_LEVEL,
          usedBankIds: priorBankIds,
        });
        if ("error" in first) {
          return Response.json({ error: first.error }, { status: 502 });
        }

        const state: GrammarTestState = {
          ...initialGrammarTestState(),
          answers: {},
          usedBankIds: [...priorBankIds, first.bankId],
          usedTags: first.tag ? [first.tag] : [],
        };

        const firstStored: StoredQuestion & { bankId: string; tag: string | null } = {
          id: first.id,
          prompt: first.prompt,
          options: first.options,
          correctIndex: first.correctIndex,
          skill: "grammar",
          cefr: first.cefr,
          explanation: first.explanation,
          explanationHu: first.explanationHu,
          bankId: first.bankId,
          tag: first.tag,
        };

        const { error: updErr } = await supabaseAdmin
          .from("anonymous_sessions")
          .update({
            grammar_test_questions: [firstStored],
            grammar_test_answers: state,
            grammar_cefr_level: null,
            grammar_score_summary: null,
            grammar_completed_at: null,
          })
          .eq("id", leadId);
        if (updErr) {
          console.error("[grammar/start] save error", updErr);
          return Response.json({ error: "Could not start the test" }, { status: 500 });
        }

        return Response.json({
          ok: true,
          current: publicOf(firstStored),
          answeredCount: 0,
          totalPlanned: state.totalPlanned,
        });
      },
    },
  },
});
