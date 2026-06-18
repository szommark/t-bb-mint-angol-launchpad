import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { extractLeadToken, verifyLeadToken } from "@/lib/placement-auth.server";
import { buildReview, type StoredQuestion } from "@/lib/placement-review.server";

const SubmitSchema = z.object({
  leadId: z.string().uuid(),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
});

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function deriveCefr(questions: StoredQuestion[], answers: Record<string, number>) {
  const byLevel: Record<string, { correct: number; total: number }> = {};
  for (const l of LEVELS) byLevel[l] = { correct: 0, total: 0 };
  for (const q of questions) {
    byLevel[q.cefr].total += 1;
    if (answers[q.id] === q.correctIndex) byLevel[q.cefr].correct += 1;
  }
  // Walk up: user passes a band if they got >=60% at that band AND has cleared all below
  let level: (typeof LEVELS)[number] = "A1";
  for (const l of LEVELS) {
    const { correct, total } = byLevel[l];
    if (total === 0) continue;
    if (correct / total >= 0.6) level = l;
    else break;
  }
  const totalCorrect = Object.values(byLevel).reduce((s, b) => s + b.correct, 0);
  const totalQ = questions.length;
  return { level, totalCorrect, totalQ, byLevel };
}

export const Route = createFileRoute("/api/public/placement/submit")({
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
        if (!parsed.success) {
          return Response.json({ error: "Validation failed" }, { status: 400 });
        }
        const { leadId, answers } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: lead, error } = await supabaseAdmin
          .from("leads")
          .select("id, test_questions, language, intake, session_token_hash")
          .eq("id", leadId)
          .maybeSingle();
        if (error || !lead) return Response.json({ error: "Lead not found" }, { status: 404 });
        if (!verifyLeadToken(token, lead.session_token_hash)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!lead.test_questions) return Response.json({ error: "No test in progress" }, { status: 400 });

        const questions = lead.test_questions as StoredQuestion[];
        const { level, totalCorrect, totalQ, byLevel } = deriveCefr(questions, answers);

        const summary = `${totalCorrect}/${totalQ} correct overall. Strongest at ${
          Object.entries(byLevel)
            .filter(([, v]) => v.total > 0)
            .sort((a, b) => b[1].correct / Math.max(b[1].total, 1) - a[1].correct / Math.max(a[1].total, 1))[0]?.[0] ?? level
        } level items.`;

        const { error: updErr } = await supabaseAdmin
          .from("leads")
          .update({
            test_answers: answers,
            cefr_level: level,
            score_summary: summary,
            completed_at: new Date().toISOString(),
          })
          .eq("id", leadId);
        if (updErr) {
          console.error("[placement/submit] save error", updErr);
          return Response.json({ error: "Could not save your result" }, { status: 500 });
        }

        return Response.json({
          ok: true,
          level,
          totalCorrect,
          totalQ,
          summary,
          byLevel,
          review: buildReview(questions, answers),
        });
      },
    },
  },
});