import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadAttemptDetail } from "@/lib/attempt-detail.server";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, name, email, language, focus, preferred_skills, is_teacher")
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

export type AttemptSource = "placement" | "grammar";

export const listMyAttempts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [placementRes, grammarRes] = await Promise.all([
      supabase
        .from("test_attempts")
        .select("id, created_at, final_level, score, total_questions")
        .eq("user_id", userId),
      supabase
        .from("grammar_test_attempts")
        .select("id, created_at, final_level, score, total_questions")
        .eq("user_id", userId),
    ]);
    if (placementRes.error) throw new Error(placementRes.error.message);
    if (grammarRes.error) throw new Error(grammarRes.error.message);

    const placement = (placementRes.data ?? []).map((a) => ({ ...a, source: "placement" as const }));
    const grammar = (grammarRes.data ?? []).map((a) => ({ ...a, source: "grammar" as const }));
    return [...placement, ...grammar].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  });

export const getAttemptDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => {
    if (!input?.attemptId || typeof input.attemptId !== "string") throw new Error("attemptId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    return loadAttemptDetail(supabase, data.attemptId, userId);
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
    await supabaseAdmin.from("grammar_test_attempts").update({ user_id: userId }).eq("anonymous_session_id", data.anonymousSessionId);
    return { ok: true };
  });