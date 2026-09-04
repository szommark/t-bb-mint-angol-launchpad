import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin.functions";

export const adminListCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("id, name, description, start_date, end_date, company_id, companies ( company_name ), course_participants ( count )")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      companyId: row.company_id,
      companyName: (row.companies as unknown as { company_name: string } | null)?.company_name ?? null,
      participantCount: (row.course_participants as unknown as { count: number }[])[0]?.count ?? 0,
    }));
  });

const CourseIdSchema = z.object({ courseId: z.string().uuid() });

export const adminGetCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof CourseIdSchema>) => CourseIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("id, name, description, start_date, end_date, company_id, companies ( company_name )")
      .eq("id", data.courseId)
      .maybeSingle();
    if (courseErr) throw new Error(courseErr.message);
    if (!course) throw new Error("Not found");

    const { data: roster, error: rosterErr } = await supabaseAdmin
      .from("course_participants")
      .select("participant_id, added_at, profiles ( user_id, name, email )")
      .eq("course_id", data.courseId)
      .order("added_at", { ascending: false });
    if (rosterErr) throw new Error(rosterErr.message);

    return {
      id: course.id,
      name: course.name,
      description: course.description,
      startDate: course.start_date,
      endDate: course.end_date,
      companyId: course.company_id,
      companyName: (course.companies as unknown as { company_name: string } | null)?.company_name ?? null,
      participants: (roster ?? [])
        .map((row) => {
          const profile = row.profiles as unknown as { user_id: string; name: string; email: string } | null;
          if (!profile) return null;
          return { userId: profile.user_id, name: profile.name, email: profile.email, addedAt: row.added_at as string };
        })
        .filter((p): p is { userId: string; name: string; email: string; addedAt: string } => !!p),
    };
  });

const SaveCourseSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  startDate: z.string().date().nullable().optional(),
  endDate: z.string().date().nullable().optional(),
});

export const adminSaveCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof SaveCourseSchema>) => SaveCourseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      company_id: data.companyId,
      name: data.name,
      description: data.description ?? null,
      start_date: data.startDate ?? null,
      end_date: data.endDate ?? null,
    };

    if (data.id) {
      const { data: existing, error: existingErr } = await supabaseAdmin
        .from("courses")
        .select("company_id")
        .eq("id", data.id)
        .maybeSingle();
      if (existingErr) throw new Error(existingErr.message);
      if (!existing) throw new Error("Not found");

      if (existing.company_id !== data.companyId) {
        const { count, error: countErr } = await supabaseAdmin
          .from("course_participants")
          .select("id", { count: "exact", head: true })
          .eq("course_id", data.id);
        if (countErr) throw new Error(countErr.message);
        if (count && count > 0) {
          throw new Error("Remove all participants before changing this course's company.");
        }
      }

      const { error } = await supabaseAdmin.from("courses").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }

    const { data: inserted, error } = await supabaseAdmin.from("courses").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: inserted.id as string };
  });

export const adminDeleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof CourseIdSchema>) => CourseIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("courses").delete().eq("id", data.courseId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminListEligibleParticipants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof CourseIdSchema>) => CourseIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("company_id")
      .eq("id", data.courseId)
      .maybeSingle();
    if (courseErr) throw new Error(courseErr.message);
    if (!course) throw new Error("Not found");

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("course_participants")
      .select("participant_id")
      .eq("course_id", data.courseId);
    if (existingErr) throw new Error(existingErr.message);
    const existingIds = (existing ?? []).map((r) => r.participant_id);

    let query = supabaseAdmin
      .from("profiles")
      .select("user_id, name, email")
      .eq("company_id", course.company_id)
      .order("name");
    if (existingIds.length > 0) {
      query = query.not("user_id", "in", `(${existingIds.join(",")})`);
    }
    const { data: eligible, error: eligibleErr } = await query;
    if (eligibleErr) throw new Error(eligibleErr.message);

    return (eligible ?? []).map((p) => ({ userId: p.user_id, name: p.name, email: p.email }));
  });

const AddParticipantSchema = z.object({ courseId: z.string().uuid(), participantId: z.string().uuid() });

export const adminAddCourseParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof AddParticipantSchema>) => AddParticipantSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: course, error: courseErr }, { data: participant, error: participantErr }] = await Promise.all([
      supabaseAdmin.from("courses").select("company_id").eq("id", data.courseId).maybeSingle(),
      supabaseAdmin.from("profiles").select("company_id").eq("user_id", data.participantId).maybeSingle(),
    ]);
    if (courseErr) throw new Error(courseErr.message);
    if (participantErr) throw new Error(participantErr.message);
    if (!course) throw new Error("Not found");
    if (!participant) throw new Error("Not found");

    if (!participant.company_id || participant.company_id !== course.company_id) {
      throw new Error("This user does not belong to the course's company.");
    }

    const { error: insertErr } = await supabaseAdmin
      .from("course_participants")
      .insert({ course_id: data.courseId, participant_id: data.participantId });
    if (insertErr && insertErr.code !== "23505") throw new Error(insertErr.message);

    return { ok: true as const };
  });

export const adminRemoveCourseParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof AddParticipantSchema>) => AddParticipantSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("course_participants")
      .delete()
      .eq("course_id", data.courseId)
      .eq("participant_id", data.participantId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
