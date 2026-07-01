import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { extractLeadToken, verifyLeadToken } from "@/lib/placement-auth.server";
import {
  allowedBankSkills,
  buildBudget,
  intakeSignature,
  TOTAL_PLANNED,
  type IntakeSkill,
  type Level,
  type TestState,
} from "@/lib/placement-blueprint.server";
import { pickQuestionForSlot } from "@/lib/placement-selector.server";
import type { StoredQuestion } from "@/lib/placement-review.server";

function sanitizeFocus(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\p{L}\p{N}\s,.\-/&()'"!?]/gu, "")
    .trim()
    .slice(0, 120);
}

const IntakeSchema = z.object({
  leadId: z.string().uuid(),
  intake: z.object({
    selfLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    focus: z.string().trim().max(120).optional().nullable(),
    skills: z.array(z.enum(["reading", "writing", "speaking", "listening"])).min(1).max(4),
    language: z.enum(["en", "hu", "de"]).default("en"),
  }),
});

function publicOf(q: StoredQuestion) {
  return { id: q.id, prompt: q.prompt, options: q.options, skill: q.skill, cefr: q.cefr };
}

export const Route = createFileRoute("/api/public/placement/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = extractLeadToken(request);
        let raw: unknown;
        try { raw = await request.json(); } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = IntakeSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
        }
        const { leadId, intake } = parsed.data;
        const safeIntake = { ...intake, focus: sanitizeFocus(intake.focus) || null };

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "AI not configured" }, { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: lead, error: leadErr } = await supabaseAdmin
          .from("leads")
          .select("id, session_token_hash")
          .eq("id", leadId)
          .maybeSingle();
        if (leadErr || !lead) return Response.json({ error: "Lead not found" }, { status: 404 });
        if (!verifyLeadToken(token, lead.session_token_hash)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Always start a fresh test on intake submission. Intake changes
        // must produce a new question set — never reuse a cached one.
        const selfLevel = safeIntake.selfLevel as Level;
        const skills = safeIntake.skills as IntakeSkill[];
        const budgets = buildBudget(selfLevel);
        const allowed = allowedBankSkills(skills);
        const sig = intakeSignature({ selfLevel, focus: safeIntake.focus, skills });

        // Pick the first question at the self-assessed level.
        const first = await pickQuestionForSlot({
          supabaseAdmin,
          slotId: "q1",
          level: selfLevel,
          preferredSkill: allowed[0],
          allowedSkills: allowed,
          usedBankIds: [],
          focus: safeIntake.focus,
          lovableApiKey: key,
        });
        if (!first) {
          return Response.json({ error: "Could not prepare the first question." }, { status: 502 });
        }
        budgets[first.cefr] = Math.max(0, budgets[first.cefr] - 1);

        const state: TestState = {
          v: 2,
          answers: {},
          currentLevel: selfLevel,
          consecCorrect: 0,
          consecWrong: 0,
          totalPlanned: TOTAL_PLANNED,
          budgets,
          intakeSig: sig,
          skillRotation: 1,
          usedBankIds: [first.bankId],
        };

        const { error: updErr } = await supabaseAdmin
          .from("leads")
          .update({
            intake: safeIntake,
            test_questions: [first],
            test_answers: state,
            cefr_level: null,
            score_summary: null,
            completed_at: null,
          })
          .eq("id", leadId);
        if (updErr) {
          console.error("[placement/start] save error", updErr);
          return Response.json({ error: "Could not start the test" }, { status: 500 });
        }

        return Response.json({
          ok: true,
          current: publicOf(first),
          answeredCount: 0,
          totalPlanned: TOTAL_PLANNED,
        });
      },
    },
  },
});
