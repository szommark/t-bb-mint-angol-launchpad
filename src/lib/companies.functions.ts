import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin.functions";

export const adminListCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("id, company_name, contact_name, contact_email, created_at")
      .order("company_name");
    if (error) throw new Error(error.message);
    return data;
  });

const CreateCompanySchema = z.object({ companyName: z.string().trim().min(1).max(200) });

export const adminCreateCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof CreateCompanySchema>) => CreateCompanySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: inserted, error } = await supabaseAdmin
      .from("companies")
      .insert({ company_name: data.companyName, contact_name: null, contact_email: null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: inserted.id as string };
  });

const UpdateCompanySchema = z.object({ id: z.string().uuid(), companyName: z.string().trim().min(1).max(200) });

export const adminUpdateCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof UpdateCompanySchema>) => UpdateCompanySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("companies")
      .update({ company_name: data.companyName })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const DeleteCompanySchema = z.object({ id: z.string().uuid() });

export const adminDeleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof DeleteCompanySchema>) => DeleteCompanySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("companies").delete().eq("id", data.id);
    if (error) {
      if (error.code === "23503") {
        throw new Error("Cannot delete a company that still has courses. Delete or reassign its courses first.");
      }
      throw new Error(error.message);
    }
    return { ok: true as const };
  });
