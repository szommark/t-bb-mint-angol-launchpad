import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// Gates every admin server function. Throws plainly (unlike the teacher/student
// "Not found" obfuscation) since admin routes are meant to be visibly restricted.
export async function requireAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile?.is_admin) throw new Error("Unauthorized");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { isAdmin: !!profile?.is_admin };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, name, email, is_teacher, is_admin, company_id, companies ( company_name )")
      .order("name");
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      userId: row.user_id,
      name: row.name,
      email: row.email,
      isTeacher: row.is_teacher,
      isAdmin: row.is_admin,
      companyId: row.company_id,
      companyName: (row.companies as unknown as { company_name: string } | null)?.company_name ?? null,
    }));
  });

const SetUserCompanySchema = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable(),
});

export const adminSetUserCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof SetUserCompanySchema>) => SetUserCompanySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ company_id: data.companyId })
      .eq("user_id", data.userId);
    if (updateErr) throw new Error(updateErr.message);

    // Company changed (or cleared): drop any course rosters that now belong
    // to a company this user is no longer part of, rather than leaving them
    // stranded on a course whose company they no longer share.
    const { data: staleRows, error: staleErr } = await supabaseAdmin
      .from("course_participants")
      .select("id, courses ( name, company_id )")
      .eq("participant_id", data.userId);
    if (staleErr) throw new Error(staleErr.message);

    const toRemove = (staleRows ?? []).filter((row) => {
      const course = row.courses as unknown as { company_id: string } | null;
      return !course || course.company_id !== data.companyId;
    });

    if (toRemove.length > 0) {
      const { error: deleteErr } = await supabaseAdmin
        .from("course_participants")
        .delete()
        .in("id", toRemove.map((r) => r.id));
      if (deleteErr) throw new Error(deleteErr.message);
    }

    const removedCourseNames = toRemove
      .map((r) => (r.courses as unknown as { name: string } | null)?.name)
      .filter((n): n is string => !!n);

    return { ok: true as const, removedCourseNames };
  });
