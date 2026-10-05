import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin.functions";
import { ParticipantRecordSchema } from "@/lib/participant-import";

export const adminListCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("courses")
      .select(
        "id, name, description, start_date, end_date, company_id, companies ( company_name ), course_participants ( profiles ( email ) ), course_participant_records ( email )",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      // Accounts on the roster and uploaded records are the same person when
      // their emails match, so count unique emails.
      const accountEmails = (row.course_participants as unknown as { profiles: { email: string } | null }[])
        .map((p) => p.profiles?.email.toLowerCase())
        .filter((e): e is string => !!e);
      const recordEmails = (row.course_participant_records as unknown as { email: string }[]).map((r) => r.email);
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        startDate: row.start_date,
        endDate: row.end_date,
        companyId: row.company_id,
        companyName: (row.companies as unknown as { company_name: string } | null)?.company_name ?? null,
        participantCount: new Set([...accountEmails, ...recordEmails]).size,
      };
    });
  });

const CourseIdSchema = z.object({ courseId: z.string().uuid() });

type RosterEntry = {
  email: string;
  name: string;
  // Set when the person was added to the course as an account.
  userId: string | null;
  // Set when official participant data was uploaded for them.
  recordId: string | null;
  hasAccount: boolean;
  addedAt: string;
};

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

    const { data: rosterRows, error: rosterErr } = await supabaseAdmin
      .from("course_participants")
      .select("participant_id, added_at, profiles ( user_id, name, email )")
      .eq("course_id", data.courseId)
      .order("added_at", { ascending: false });
    if (rosterErr) throw new Error(rosterErr.message);

    const { data: records, error: recordsErr } = await supabaseAdmin
      .from("course_participant_records")
      .select("id, profile_id, highest_education, current_name, birth_name, mother_name, birth_country, birth_place, birth_date, email, non_hu_citizen_without_hu_address, created_at")
      .eq("course_id", data.courseId)
      .order("current_name");
    if (recordsErr) throw new Error(recordsErr.message);

    // Match uploaded records to accounts by email at read time, so someone who
    // registers after the upload shows up as having an account.
    const recordEmails = (records ?? []).map((r) => r.email);
    const accountEmails = new Set<string>();
    if (recordEmails.length > 0) {
      const { data: accounts, error: accountsErr } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .in("email", recordEmails);
      if (accountsErr) throw new Error(accountsErr.message);
      for (const a of accounts ?? []) accountEmails.add(a.email.toLowerCase());
    }

    // One roster row per person: accounts added to the course and uploaded
    // records, merged on email.
    const roster = new Map<string, RosterEntry>();
    for (const row of rosterRows ?? []) {
      const profile = row.profiles as unknown as { user_id: string; name: string; email: string } | null;
      if (!profile) continue;
      const email = profile.email.toLowerCase();
      roster.set(email, {
        email,
        name: profile.name,
        userId: profile.user_id,
        recordId: null,
        hasAccount: true,
        addedAt: row.added_at as string,
      });
    }
    for (const r of records ?? []) {
      const existing = roster.get(r.email);
      if (existing) {
        existing.recordId = r.id;
        existing.name = r.current_name;
        if (r.created_at < existing.addedAt) existing.addedAt = r.created_at;
      } else {
        roster.set(r.email, {
          email: r.email,
          name: r.current_name,
          userId: null,
          recordId: r.id,
          hasAccount: accountEmails.has(r.email),
          addedAt: r.created_at,
        });
      }
    }

    return {
      id: course.id,
      name: course.name,
      description: course.description,
      startDate: course.start_date,
      endDate: course.end_date,
      companyId: course.company_id,
      companyName: (course.companies as unknown as { company_name: string } | null)?.company_name ?? null,
      roster: [...roster.values()].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, "hu")),
      participantRecords: (records ?? []).map((r) => ({
        id: r.id,
        profileId: r.profile_id,
        highestEducation: r.highest_education,
        currentName: r.current_name,
        birthName: r.birth_name,
        motherName: r.mother_name,
        birthCountry: r.birth_country,
        birthPlace: r.birth_place,
        birthDate: r.birth_date,
        email: r.email,
        nonHuCitizenWithoutHuAddress: r.non_hu_citizen_without_hu_address,
      })),
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

const ImportParticipantsSchema = z.object({
  courseId: z.string().uuid(),
  records: z.array(ParticipantRecordSchema).min(1).max(1000),
});

// Upserts official participant data by (course, email). Records whose email
// matches an existing account are linked to it, and accounts from the course's
// company are also put on the roster.
export const adminImportCourseParticipants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof ImportParticipantsSchema>) => ImportParticipantsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const emails = [...new Set(data.records.map((r) => r.email))];
    if (emails.length !== data.records.length) throw new Error("Each email may appear only once in the file.");

    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("company_id")
      .eq("id", data.courseId)
      .maybeSingle();
    if (courseErr) throw new Error(courseErr.message);
    if (!course) throw new Error("Not found");

    const { data: profiles, error: profilesErr } = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, company_id")
      .in("email", emails);
    if (profilesErr) throw new Error(profilesErr.message);
    const profileByEmail = new Map((profiles ?? []).map((p) => [p.email.toLowerCase(), p]));

    const { error: upsertErr } = await supabaseAdmin.from("course_participant_records").upsert(
      data.records.map((r) => ({
        course_id: data.courseId,
        profile_id: profileByEmail.get(r.email)?.user_id ?? null,
        highest_education: r.highestEducation,
        current_name: r.currentName,
        birth_name: r.birthName,
        mother_name: r.motherName,
        birth_country: r.birthCountry,
        birth_place: r.birthPlace,
        birth_date: r.birthDate,
        email: r.email,
        non_hu_citizen_without_hu_address: r.nonHuCitizenWithoutHuAddress,
      })),
      { onConflict: "course_id,email" },
    );
    if (upsertErr) throw new Error(upsertErr.message);

    const linked = [...profileByEmail.values()];
    const rosterIds = linked.filter((p) => p.company_id === course.company_id).map((p) => p.user_id);
    if (rosterIds.length > 0) {
      const { error: rosterErr } = await supabaseAdmin
        .from("course_participants")
        .upsert(
          rosterIds.map((participantId) => ({ course_id: data.courseId, participant_id: participantId })),
          { onConflict: "course_id,participant_id", ignoreDuplicates: true },
        );
      if (rosterErr) throw new Error(rosterErr.message);
    }

    return {
      ok: true as const,
      imported: data.records.length,
      linkedAccounts: linked.length,
      addedToRoster: rosterIds.length,
      otherCompanyAccounts: linked.length - rosterIds.length,
    };
  });

const ParticipantRecordIdSchema = z.object({ courseId: z.string().uuid(), recordId: z.string().uuid() });

export const adminDeleteCourseParticipantRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof ParticipantRecordIdSchema>) => ParticipantRecordIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("course_participant_records")
      .delete()
      .eq("course_id", data.courseId)
      .eq("id", data.recordId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Everyone uploaded from participant spreadsheets, one row per person (email)
// with the courses they were uploaded to.
export const adminListParticipants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: records, error } = await supabaseAdmin
      .from("course_participant_records")
      .select("email, current_name, birth_date, birth_place, updated_at, courses ( id, name, companies ( company_name ) )")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);

    const emails = [...new Set((records ?? []).map((r) => r.email))];
    const accountEmails = new Set<string>();
    if (emails.length > 0) {
      const { data: accounts, error: accountsErr } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .in("email", emails);
      if (accountsErr) throw new Error(accountsErr.message);
      for (const a of accounts ?? []) accountEmails.add(a.email.toLowerCase());
    }

    type Participant = {
      email: string;
      name: string;
      birthDate: string;
      birthPlace: string;
      hasAccount: boolean;
      courses: { id: string; name: string; companyName: string | null }[];
    };
    // Records are newest first, so the first one seen per email carries the
    // most recently uploaded name and birth details.
    const byEmail = new Map<string, Participant>();
    for (const r of records ?? []) {
      const course = r.courses as unknown as { id: string; name: string; companies: { company_name: string } | null } | null;
      let participant = byEmail.get(r.email);
      if (!participant) {
        participant = {
          email: r.email,
          name: r.current_name,
          birthDate: r.birth_date,
          birthPlace: r.birth_place,
          hasAccount: accountEmails.has(r.email),
          courses: [],
        };
        byEmail.set(r.email, participant);
      }
      if (course) {
        participant.courses.push({ id: course.id, name: course.name, companyName: course.companies?.company_name ?? null });
      }
    }

    return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name, "hu"));
  });
