import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { randomUUID } from "crypto";

const NOTIFY_EMAIL = "szombathelyi.mark@tobbmintangol.hu";

const CourseInquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  companyName: z.string().trim().min(1).max(200).optional(),
  course: z.string().trim().min(1).max(200),
  language: z.enum(["en", "hu", "de"]).default("hu"),
});

export const Route = createFileRoute("/api/public/course-inquiry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = CourseInquirySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", issues: parsed.error.flatten() },
            { status: 400 },
          );
        }
        const data = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Storage is best-effort: a DB hiccup must never stop the inquiry
        // notification email below from going out to the team.
        try {
          if (data.companyName) {
            // Corporate English & German inquiry: recorded as a company contact,
            // never touches the users table.
            const { error } = await supabaseAdmin.from("companies").insert({
              company_name: data.companyName,
              contact_name: data.name,
              contact_email: data.email,
            });
            if (error) console.error("[course-inquiry] companies insert error", error);
          } else {
            // Only record name/email (no password, no placement test data) for
            // people who aren't already a known user.
            const { data: existingProfile } = await supabaseAdmin
              .from("profiles")
              .select("user_id")
              .eq("email", data.email)
              .maybeSingle();

            if (!existingProfile) {
              const { data: existingUser } = await supabaseAdmin
                .from("users")
                .select("id")
                .eq("email", data.email)
                .maybeSingle();

              if (!existingUser) {
                const { error } = await supabaseAdmin.from("users").insert({
                  name: data.name,
                  email: data.email,
                });
                if (error) console.error("[course-inquiry] users insert error", error);
              }
            }
          }
        } catch (e) {
          console.error("[course-inquiry] storage failed", e);
        }

        // Best-effort notification email to the team. Will start sending once
        // the project's email domain is configured (Cloud → Emails).
        try {
          const origin = new URL(request.url).origin;
          const res = await fetch(`${origin}/lovable/email/transactional/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
            },
            body: JSON.stringify({
              templateName: "course-inquiry-notification",
              recipientEmail: NOTIFY_EMAIL,
              idempotencyKey: `course-inquiry-${randomUUID()}`,
              templateData: {
                name: data.name,
                email: data.email,
                companyName: data.companyName ?? "",
                course: data.course,
                language: data.language,
              },
            }),
          });
          if (!res.ok) {
            console.warn("[course-inquiry] email send skipped", res.status, await res.text().catch(() => ""));
          }
        } catch (e) {
          console.warn("[course-inquiry] email send failed", e);
        }

        return Response.json({ ok: true });
      },
    },
  },
});
