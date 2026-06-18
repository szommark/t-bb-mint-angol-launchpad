import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";

const LeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  focus: z.string().trim().max(120).optional().nullable(),
  language: z.enum(["en", "hu", "de"]).default("en"),
});

const CONFIRMATIONS: Record<"en" | "hu" | "de", { subject: string; intro: string; body: string; signoff: string }> = {
  en: {
    subject: "Your placement test request — Több mint angol",
    intro: "Thanks for signing up",
    body: "We received your free placement test request. One of our coach-trainers will reach out within 1 business day to schedule your assessment.",
    signoff: "Looking forward to meeting you,\nThe Több mint angol team",
  },
  hu: {
    subject: "Szintfelmérő jelentkezésed — Több mint angol",
    intro: "Köszönjük a jelentkezésed",
    body: "Megkaptuk az ingyenes szintfelmérőre szóló jelentkezésed. Munkatársunk 1 munkanapon belül felveszi veled a kapcsolatot az időpont egyeztetéséhez.",
    signoff: "Várunk szeretettel,\nA Több mint angol csapata",
  },
  de: {
    subject: "Deine Einstufungstest-Anfrage — Több mint angol",
    intro: "Danke für deine Anmeldung",
    body: "Wir haben deine Anfrage für den kostenlosen Einstufungstest erhalten. Wir melden uns innerhalb eines Werktags, um einen Termin zu vereinbaren.",
    signoff: "Bis bald,\nDein Több mint angol Team",
  },
};

export const Route = createFileRoute("/api/public/leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = LeadSchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", issues: parsed.error.flatten() },
            { status: 400 },
          );
        }
        const data = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Issue a one-time session token that the client must present on every
        // subsequent placement API call. Only the SHA-256 hash is stored.
        const sessionToken = randomBytes(32).toString("base64url");
        const sessionTokenHash = createHash("sha256").update(sessionToken).digest("hex");

        const { data: inserted, error } = await supabaseAdmin
          .from("leads")
          .insert({
            name: data.name,
            email: data.email,
            focus: data.focus ?? null,
            language: data.language,
            session_token_hash: sessionTokenHash,
          })
          .select("id")
          .single();

        if (error) {
          console.error("[leads] insert error", error);
          return Response.json({ error: "Could not save your request" }, { status: 500 });
        }

        // Best-effort confirmation email. Will start sending once the
        // project's email domain is configured (Cloud → Emails).
        const copy = CONFIRMATIONS[data.language];
        try {
          const origin = new URL(request.url).origin;
          const res = await fetch(`${origin}/lovable/email/transactional/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
            },
            body: JSON.stringify({
              templateName: "placement-confirmation",
              recipientEmail: data.email,
              idempotencyKey: `placement-confirm-${inserted.id}`,
              templateData: {
                name: data.name,
                focus: data.focus ?? "",
                language: data.language,
                subject: copy.subject,
                intro: copy.intro,
                body: copy.body,
                signoff: copy.signoff,
              },
            }),
          });
          if (!res.ok) {
            console.warn("[leads] email send skipped", res.status, await res.text().catch(() => ""));
          }
        } catch (e) {
          console.warn("[leads] email send failed", e);
        }

        return Response.json({ ok: true, id: inserted.id, sessionToken });
      },
    },
  },
});