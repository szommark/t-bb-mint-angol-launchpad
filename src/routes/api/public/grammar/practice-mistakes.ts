// "Practice the mistakes" — a lightweight, throwaway 5-question drill built
// from the CEFR level + grammar tag of the questions the student missed on
// their last completed Grammar Test. Unlike the main test, this is fully
// stateless and answer-authoritative-on-the-client: nothing about it is
// written to anonymous_sessions, grammar_test_attempts, or
// grammar_attempt_answers, so it never appears in attempt history anywhere.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { extractLeadToken, verifyLeadToken } from "@/lib/placement-auth.server";
import {
  isGrammarTestState,
  type GrammarLevel,
  type GrammarTestState,
} from "@/lib/grammar-blueprint.server";
import { pickPracticeQuestion } from "@/lib/grammar-selector.server";
import type { StoredQuestion } from "@/lib/placement-review.server";

const Schema = z.object({
  leadId: z.string().uuid(),
});

const PRACTICE_SIZE = 5;
const MAX_ATTEMPTS = 40;

type StoredGrammarQuestion = StoredQuestion & { bankId?: string; tag?: string | null };

export const Route = createFileRoute("/api/public/grammar/practice-mistakes")({
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
        const { leadId } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: lead, error } = await supabaseAdmin
          .from("anonymous_sessions")
          .select(
            "id, grammar_test_questions, grammar_test_answers, grammar_completed_at, session_token_hash",
          )
          .eq("id", leadId)
          .maybeSingle();
        if (error || !lead) return Response.json({ error: "Lead not found" }, { status: 404 });
        if (!verifyLeadToken(token, lead.session_token_hash)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (
          !lead.grammar_completed_at ||
          !isGrammarTestState(lead.grammar_test_answers) ||
          !Array.isArray(lead.grammar_test_questions)
        ) {
          return Response.json({ error: "No completed test found" }, { status: 400 });
        }

        const questions = lead.grammar_test_questions as StoredGrammarQuestion[];
        const state = lead.grammar_test_answers as GrammarTestState;

        const mistakes = questions.filter((q) => state.answers[q.id] !== q.correctIndex);
        if (mistakes.length === 0) {
          return Response.json({ ok: true, questions: [] });
        }

        // Dedup {level, tag} pairs in order of first appearance so the
        // practice set is drawn from the same level+category combinations
        // the student actually got wrong.
        const seen = new Set<string>();
        const pairs: { level: GrammarLevel; tag: string | null }[] = [];
        for (const m of mistakes) {
          const tag = m.tag ?? null;
          const key = `${m.cefr}|${tag ?? ""}`;
          if (seen.has(key)) continue;
          seen.add(key);
          pairs.push({ level: m.cefr as GrammarLevel, tag });
        }

        const excludeIds = questions.map((q) => q.bankId).filter((id): id is string => !!id);

        const picked: Array<{
          id: string;
          prompt: string;
          options: string[];
          correctIndex: number;
          cefr: GrammarLevel;
          explanation: string;
          explanationHu: string;
        }> = [];

        let attempts = 0;
        while (picked.length < PRACTICE_SIZE && attempts < MAX_ATTEMPTS) {
          const pair = pairs[attempts % pairs.length];
          attempts += 1;
          const result = await pickPracticeQuestion({
            supabaseAdmin,
            slotId: `p${picked.length + 1}`,
            level: pair.level,
            tag: pair.tag,
            excludeIds,
          });
          if ("error" in result) continue;
          if (excludeIds.includes(result.bankId)) continue;
          picked.push({
            id: result.id,
            prompt: result.prompt,
            options: result.options,
            correctIndex: result.correctIndex,
            cefr: result.cefr,
            explanation: result.explanation,
            explanationHu: result.explanationHu,
          });
          excludeIds.push(result.bankId);
        }

        return Response.json({ ok: true, questions: picked });
      },
    },
  },
});
