import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, name, email, language, focus, preferred_skills")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const UpdateProfileSchema = z.object({
  focus: z.string().trim().max(120).nullable().optional(),
  preferred_skills: z.array(z.enum(["reading", "writing", "speaking", "listening"])).max(4).optional(),
  language: z.enum(["en", "hu", "de"]).optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof UpdateProfileSchema>) => UpdateProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload: { focus?: string | null; preferred_skills?: string[]; language?: string } = {};
    if (data.focus !== undefined) payload.focus = data.focus;
    if (data.preferred_skills !== undefined) payload.preferred_skills = data.preferred_skills;
    if (data.language !== undefined) payload.language = data.language;
    const { error } = await supabase.from("profiles").update(payload).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyAttempts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("test_attempts")
      .select("id, created_at, final_level, score, total_questions")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAttemptDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => {
    if (!input?.attemptId || typeof input.attemptId !== "string") throw new Error("attemptId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: attempt, error: aErr } = await supabase
      .from("test_attempts")
      .select("id, created_at, final_level, score, total_questions, anonymous_session_id, user_id")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!attempt || attempt.user_id !== userId) throw new Error("Not found");

    const { data: answers, error: ansErr } = await supabase
      .from("attempt_answers")
      .select("id, is_correct, selected_answer, question_id, questions ( id, question_text, options, correct_answer, explanation, level, skill )")
      .eq("attempt_id", attempt.id);
    if (ansErr) throw new Error(ansErr.message);

    // Build byLevel + review shape compatible with results screen
    const byLevel: Record<string, { correct: number; total: number }> = {
      A1: { correct: 0, total: 0 }, A2: { correct: 0, total: 0 }, B1: { correct: 0, total: 0 },
      B2: { correct: 0, total: 0 }, C1: { correct: 0, total: 0 }, C2: { correct: 0, total: 0 },
    };
    const review = (answers ?? []).map((a) => {
      const q = a.questions as { id: string; question_text: string; options: unknown; correct_answer: string; explanation: string; level: string; skill: string } | null;
      const opts = Array.isArray(q?.options) ? (q!.options as string[]) : [];
      const level = (q?.level ?? "A1") as string;
      if (byLevel[level]) {
        byLevel[level].total += 1;
        if (a.is_correct) byLevel[level].correct += 1;
      }
      const correctIndex = opts.findIndex((o) => o === q?.correct_answer);
      const userIndex = opts.findIndex((o) => o === a.selected_answer);
      return {
        id: q?.id ?? a.id,
        prompt: q?.question_text ?? "",
        cefr: level,
        options: opts,
        userIndex: userIndex >= 0 ? userIndex : null,
        userAnswer: a.selected_answer ?? null,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        correctAnswer: q?.correct_answer ?? "",
        explanation: q?.explanation ?? "",
      };
    });

    return { attempt, byLevel, review };
  });

// Called right after signup, to link any anonymous session results the user
// completed anonymously to their new user_id.
export const claimAnonymousSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { anonymousSessionId: string }) => {
    if (!input?.anonymousSessionId) throw new Error("anonymousSessionId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("anonymous_sessions").update({ claimed_by_user_id: userId }).eq("id", data.anonymousSessionId);
    await supabaseAdmin.from("test_attempts").update({ user_id: userId }).eq("anonymous_session_id", data.anonymousSessionId);
    return { ok: true };
  });