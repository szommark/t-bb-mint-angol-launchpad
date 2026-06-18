import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & Trust — Több mint angol" },
      { name: "description", content: "How Több mint angol handles your data, security, and privacy." },
      { property: "og:title", content: "Privacy & Trust — Több mint angol" },
      { property: "og:description", content: "How Több mint angol handles your data, security, and privacy." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Privacy & Trust</h1>
        <p className="mt-4 text-muted-foreground">
          This page is maintained by Több mint angol to answer common security and privacy
          questions about our placement test and lead intake. It is editable project content,
          not an independent certification.
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="text-2xl font-semibold">What we collect</h2>
          <p>
            When you request a free placement test we store your name, email, language
            preference, chosen focus area, your self-assessed intake answers, and the
            answers and CEFR result of your AI-generated placement test.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-semibold">How we use it</h2>
          <p>
            We use this information solely to deliver your placement result, match you
            with the right program, and follow up about your training. We do not sell
            your data.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-semibold">Access controls</h2>
          <p>
            Lead and test records are stored in a managed Postgres database with row-level
            security enabled. Direct database access from anonymous and signed-in browser
            roles is denied. All reads and writes are performed by our trusted server
            endpoints, which validate input before touching the database.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-semibold">Sub-processors</h2>
          <p>
            We rely on Lovable Cloud (managed Supabase) for application hosting, database
            and authentication, and on Lovable AI for generating placement test questions
            and feedback. Secrets are stored server-side and never shipped to the browser.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-semibold">Your rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at
            any time by emailing{" "}
            <a className="underline" href="mailto:info@tobbmintangol.hu">info@tobbmintangol.hu</a>.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-semibold">Contact</h2>
          <p>
            Security or privacy questions:{" "}
            <a className="underline" href="mailto:szombathelyi.mark@tobbmintangol.hu">
              szombathelyi.mark@tobbmintangol.hu
            </a>
          </p>
        </section>

        <p className="mt-12 text-xs text-muted-foreground">
          Adult education registry number: B/2020/002545
        </p>
      </div>
    </div>
  );
}