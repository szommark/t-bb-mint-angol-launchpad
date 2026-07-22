import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadAttemptDetail } from "@/lib/attempt-detail.server";
import type { Database } from "@/integrations/supabase/types";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

function generateTeacherCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

type StudentRow = { user_id: string; name: string; email: string; cefr_level: string | null };

export const ensureTeacherProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("is_teacher")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileErr) throw new Error(profileErr.message);
    if (!profile?.is_teacher) return { isTeacher: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let teacherProfile = (
      await supabaseAdmin.from("teacher_profiles").select("id, teacher_code").eq("profile_id", userId).maybeSingle()
    ).data;

    if (!teacherProfile) {
      for (let attempt = 0; attempt < 5 && !teacherProfile; attempt++) {
        const { data, error } = await supabaseAdmin
          .from("teacher_profiles")
          .insert({ profile_id: userId, teacher_code: generateTeacherCode() })
          .select("id, teacher_code")
          .single();
        if (data) teacherProfile = data;
        else if (error && error.code !== "23505") throw new Error(error.message);
      }
      if (!teacherProfile) throw new Error("Could not generate a unique teacher code. Please try again.");
    }

    const { data: links, error: linksErr } = await supabaseAdmin
      .from("teacher_students")
      .select("student_id, joined_at, profiles ( user_id, name, email, cefr_level )")
      .eq("teacher_id", teacherProfile.id)
      .order("joined_at", { ascending: false });
    if (linksErr) throw new Error(linksErr.message);

    const students = (links ?? [])
      .map((l) => l.profiles as unknown as StudentRow | null)
      .filter((s): s is StudentRow => !!s)
      .map((s, i) => ({ ...s, joinedAt: (links ?? [])[i]?.joined_at as string }));

    return { isTeacher: true as const, teacherCode: teacherProfile.teacher_code, students };
  });

const ConnectSchema = z.object({ teacherCode: z.string().trim().min(1).max(20) });

export const connectToTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof ConnectSchema>) => ConnectSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const code = data.teacherCode.trim().toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: teacherProfile, error: findErr } = await supabaseAdmin
      .from("teacher_profiles")
      .select("id, profile_id")
      .eq("teacher_code", code)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (!teacherProfile) throw new Error("That teacher code doesn't exist. Double-check it and try again.");
    if (teacherProfile.profile_id === userId) throw new Error("You can't connect to your own teacher code.");

    const { error: insertErr } = await supabaseAdmin
      .from("teacher_students")
      .insert({ teacher_id: teacherProfile.id, student_id: userId });
    if (insertErr && insertErr.code !== "23505") throw new Error(insertErr.message);

    return { ok: true };
  });

export const getMyTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("teacher_students")
      .select("joined_at, teacher_profiles ( profile_id, profiles ( name, email ) )")
      .eq("student_id", userId)
      .order("joined_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? [])
      .map((row) => {
        const tp = row.teacher_profiles as unknown as { profiles: { name: string; email: string } | null } | null;
        if (!tp?.profiles) return null;
        return { name: tp.profiles.name, email: tp.profiles.email, joinedAt: row.joined_at as string };
      })
      .filter((t): t is { name: string; email: string; joinedAt: string } => !!t);
  });

const StudentIdSchema = z.object({ studentId: z.string().uuid() });

// Confirms the caller is a teacher connected to this student. Throws
// "Not found" (rather than a permission error) so a probing request can't
// distinguish "not your student" from "no such student", matching the
// pattern already used by getStudentDashboard below.
async function verifyTeacherOwnsStudent(
  supabase: SupabaseClient<Database>,
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  studentId: string,
) {
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("is_teacher")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileErr) throw new Error(profileErr.message);
  if (!profile?.is_teacher) throw new Error("Not found");

  const { data: teacherProfile, error: tpErr } = await supabaseAdmin
    .from("teacher_profiles")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (tpErr) throw new Error(tpErr.message);
  if (!teacherProfile) throw new Error("Not found");

  const { data: link, error: linkErr } = await supabaseAdmin
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", teacherProfile.id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (linkErr) throw new Error(linkErr.message);
  if (!link) throw new Error("Not found");
}

export const getStudentDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof StudentIdSchema>) => StudentIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await verifyTeacherOwnsStudent(supabase, supabaseAdmin, userId, data.studentId);

    const { data: student, error: studentErr } = await supabaseAdmin
      .from("profiles")
      .select("name, email, cefr_level, focus")
      .eq("user_id", data.studentId)
      .maybeSingle();
    if (studentErr) throw new Error(studentErr.message);
    if (!student) throw new Error("Not found");

    const [placementRes, grammarRes] = await Promise.all([
      supabaseAdmin
        .from("test_attempts")
        .select("id, created_at, final_level, score, total_questions")
        .eq("user_id", data.studentId),
      supabaseAdmin
        .from("grammar_test_attempts")
        .select("id, created_at, final_level, score, total_questions")
        .eq("user_id", data.studentId),
    ]);
    if (placementRes.error) throw new Error(placementRes.error.message);
    if (grammarRes.error) throw new Error(grammarRes.error.message);

    const placement = (placementRes.data ?? []).map((a) => ({ ...a, source: "placement" as const }));
    const grammar = (grammarRes.data ?? []).map((a) => ({ ...a, source: "grammar" as const }));
    const attempts = [...placement, ...grammar].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return { student, attempts };
  });

const StudentAttemptSchema = z.object({ studentId: z.string().uuid(), attemptId: z.string().uuid() });

export const getStudentAttemptDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof StudentAttemptSchema>) => StudentAttemptSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await verifyTeacherOwnsStudent(supabase, supabaseAdmin, userId, data.studentId);
    return loadAttemptDetail(supabaseAdmin, data.attemptId, data.studentId);
  });
