import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { translations } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";
import { PRESENTATION_COURSE_INDEX } from "@/lib/courses";
import { SITE_URL } from "@/lib/site";
import awardImg1 from "@/assets/toastmasters-award-1.jpg";
import awardImg2 from "@/assets/toastmasters-award-2.jpg";
import awardImg3 from "@/assets/toastmasters-award-3.jpg";

export const Route = createFileRoute("/presentations")({
  head: () => ({
    meta: [
      { title: "Előadások és prezentáció angolul — Több mint angol" },
      { name: "description", content: "Legyél hatással a közönségedre. Bűvöld el őket. Felkészítés angol nyelvű előadásokra, a beszéd megírásától az előadói stílus csiszolásáig." },
      { property: "og:title", content: "Előadások és prezentáció angolul — Több mint angol" },
      { property: "og:description", content: "Legyél hatással a közönségedre. Bűvöld el őket." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/presentations` }],
  }),
  component: PresentationsPage,
});

function PresentationsPage() {
  const { lang } = useLanguage();
  const t = translations[lang];
  const p = t.presentations;
  const course = t.courses.items[PRESENTATION_COURSE_INDEX];

  const [form, setForm] = useState({ name: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name) return toast.error(t.inquiry.nameError);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error(t.inquiry.emailError);

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/course-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, course: course.title, language: lang }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmitted(true);
      setForm({ name: "", email: "" });
      toast.success(t.inquiry.success);
    } catch (err) {
      console.error(err);
      toast.error(t.inquiry.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-5">
          <Link to="/" hash="courses" className="group flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--gradient-hero)] text-xs font-bold text-primary-foreground shadow-[var(--shadow-card)]">T</span>
            <span className="text-[15px] font-semibold tracking-tight">Több mint angol</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-12">
        <Link to="/" hash="courses" className="text-sm text-muted-foreground hover:text-foreground">
          {p.back}
        </Link>

        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1fr_minmax(0,380px)]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal-accent-strong)]">{t.courses.kicker}</span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
            <p className="mt-4 text-xl font-medium leading-snug text-[var(--teal-accent-strong)]">{course.desc}</p>
            <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-foreground/90">
              {p.body.map((para) => <p key={para}>{para}</p>)}
            </div>
          </div>
          <img src={awardImg3} alt={p.photoAlts[2]}
            className="w-full rounded-2xl object-cover shadow-[var(--shadow-card)]" />
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <img src={awardImg1} alt={p.photoAlts[0]}
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-[var(--shadow-card)]" />
          <img src={awardImg2} alt={p.photoAlts[1]}
            className="aspect-[4/3] w-full rounded-2xl object-cover object-[center_60%] shadow-[var(--shadow-card)]" />
        </div>

        <section className="mx-auto mt-16 max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">{p.closing}</h2>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="presentations-name">{t.inquiry.name}</Label>
              <Input id="presentations-name" required maxLength={120} value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="presentations-email">{t.inquiry.email}</Label>
              <Input id="presentations-email" type="email" required maxLength={255} value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="h-11" />
            </div>
            <Button type="submit" disabled={submitting}
              className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {submitting ? "…" : t.inquiry.submit} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            {submitted && (
              <p className="text-center text-sm text-[var(--teal-accent-strong)]">{t.inquiry.success}</p>
            )}
          </form>
        </section>
      </div>

      <LanguageSwitcher />
    </div>
  );
}
