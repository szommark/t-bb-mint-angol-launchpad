import { createFileRoute } from "@tanstack/react-router";
import { generateObject } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const IntakeSchema = z.object({
  leadId: z.string().uuid(),
  intake: z.object({
    selfLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    focus: z.string().trim().max(120).optional().nullable(),
    yearsStudied: z.string().trim().max(60),
    lastUsed: z.string().trim().max(60),
    skills: z.array(z.enum(["reading", "writing", "speaking", "listening"])).min(1).max(4),
    language: z.enum(["en", "hu", "de"]).default("en"),
  }),
});

const QuestionSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string(),
        prompt: z.string(),
        options: z.array(z.string()).length(4),
        correctIndex: z.number().int().min(0).max(3),
        skill: z.enum(["grammar", "vocabulary", "reading"]),
        cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
      }),
    )
    .length(20),
});

export const Route = createFileRoute("/api/public/placement/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = IntakeSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", issues: parsed.error.flatten() },
            { status: 400 },
          );
        }
        const { leadId, intake } = parsed.data;

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return Response.json({ error: "AI not configured" }, { status: 500 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: lead, error: leadErr } = await supabaseAdmin
          .from("leads")
          .select("id, test_questions, completed_at")
          .eq("id", leadId)
          .maybeSingle();
        if (leadErr || !lead) {
          return Response.json({ error: "Lead not found" }, { status: 404 });
        }

        // Reuse cached questions if already generated
        if (lead.test_questions && Array.isArray(lead.test_questions)) {
          const sanitized = (lead.test_questions as Array<{ correctIndex: number } & Record<string, unknown>>).map(
            ({ correctIndex: _c, ...rest }) => rest,
          );
          await supabaseAdmin.from("leads").update({ intake }).eq("id", leadId);
          return Response.json({ ok: true, questions: sanitized });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const sys = `You are an expert English placement test designer. Generate exactly 20 multiple-choice questions to estimate a learner's CEFR level (A1-C2). Distribute across CEFR levels roughly: 3 A1, 3 A2, 4 B1, 4 B2, 3 C1, 3 C2. Mix grammar, vocabulary, and short reading-comprehension items. Each question has exactly 4 distinct plausible options and one correct answer. Questions and options must be in English (the test measures English ability). Prompts must be self-contained, unambiguous, and free of trick wording.`;

        const userPrompt = `Learner profile:
- Self-assessed level: ${intake.selfLevel}
- Focus area: ${intake.focus ?? "general"}
- Years studied: ${intake.yearsStudied}
- Last actively used English: ${intake.lastUsed}
- Skills they want to develop: ${intake.skills.join(", ")}

Bias question topics toward the learner's focus area where natural (e.g. business vocabulary if focus is professional). Use ids q1..q20.`;

        let questions;
        try {
          const result = await generateObject({
            model,
            schema: QuestionSchema,
            system: sys,
            prompt: userPrompt,
          });
          questions = result.object.questions;
        } catch (e) {
          console.error("[placement/start] AI error", e);
          return Response.json({ error: "Could not generate the test. Please try again." }, { status: 502 });
        }

        const { error: updErr } = await supabaseAdmin
          .from("leads")
          .update({ intake, test_questions: questions })
          .eq("id", leadId);
        if (updErr) {
          console.error("[placement/start] save error", updErr);
          return Response.json({ error: "Could not save the test" }, { status: 500 });
        }

        const sanitized = questions.map(({ correctIndex: _c, ...rest }) => rest);
        return Response.json({ ok: true, questions: sanitized });
      },
    },
  },
});