import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import {
  Brain, GraduationCap, Zap, MessagesSquare, BookOpen, Briefcase, Crown,
  ArrowRight, Check, Globe, Menu, X, Mail, Phone, ChevronUp, Star, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import heroCafeImg from "@/assets/hero-collage-cafe.jpg";
import heroCallImg from "@/assets/hero-collage-call.jpg";
import heroMobileImg from "@/assets/hero-collage-mobile.jpg";
import heroTravelImg from "@/assets/hero-collage-travel.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Több mint angol — Premium English Training for Professionals" },
      { name: "description", content: "Tailor-made, coaching-oriented English training for adults, managers and company leaders. Beyond language — preparation for a new era." },
      { property: "og:title", content: "Több mint angol — Premium English Training" },
      { property: "og:description", content: "Coaching-oriented professional English training for executives and driven adults." },
    ],
  }),
  component: Index,
});

type Lang = "en" | "hu" | "de";

const translations = {
  en: {
    nav: { courses: "Courses", about: "About Us", reviews: "Reviews", blog: "Blog", contact: "Contact", cta: "Free Placement Test" },
    hero: {
      eyebrow: "Premium English for a new era",
      title1: "Connect to the world.",
      title2: "Speak with ease.",
      title3: "Learn the trendiest way.",
      subtitle: "Tailor-made, coaching-oriented professional and general English language training for adults, managers, and company leaders.",
      ctaPrimary: "Start Your Journey",
      ctaSecondary: "Explore Courses",
    },
    value: {
      kicker: "Why choose us",
      title: "More than English — a competitive advantage",
      body: "Designed for driven professionals who want to go beyond basic language practice. We prepare you to understand, adapt, grow and flourish in a challenging global economy — through a blend of language education, real-world context and coaching techniques.",
      pills: ["Coaching mindset", "Real business context", "Measurable progress", "Executive-grade delivery"],
    },
    courses: { kicker: "Our courses", title: "Programs engineered for outcomes" },
    form: {
      kicker: "Free placement test",
      title: "Find your starting line",
      sub: "Create your account and we'll match you with the right track.",
      name: "Full name", email: "Email", password: "Password",
      focus: "What is your main focus area?",
      focusPh: "Select a focus area",
      focusOptions: ["General English", "Professional / Business English", "Fast Track", "Speaking confidence", "Executive 1-on-1"],
      submit: "Get my placement",
    },
    about: { kicker: "About us", title: "Meet your instructors" },
    testimonials: { kicker: "Reviews", title: "What our clients say" },
    footer: { rights: "All rights reserved.", privacy: "Privacy Policy", imp: "Impressum", reg: "Adult education registry number: B/2020/002545" },
  },
  hu: {
    nav: { courses: "Kurzusok", about: "Rólunk", reviews: "Vélemények", blog: "Blog", contact: "Kapcsolat", cta: "Ingyenes szintfelmérő" },
    hero: {
      eyebrow: "Prémium angol egy új korszakra",
      title1: "Kapcsolódj a világhoz.",
      title2: "Beszélj könnyedén.",
      title3: "Tanulj a legtrendibb módon.",
      subtitle: "Személyre szabott, coaching szemléletű szakmai és általános angol nyelvi képzés felnőtteknek, vezetőknek és cégtulajdonosoknak.",
      ctaPrimary: "Indítsd az utad",
      ctaSecondary: "Kurzusok",
    },
    value: {
      kicker: "Miért minket válassz",
      title: "Több mint angol — versenyelőny",
      body: "Olyan, motivált ügyfeleknek készült, akik túl akarnak lépni az alap nyelvi gyakorláson. Felkészítünk arra, hogy megértsd, alkalmazkodj, fejlődj és kibontakozz a kihívásokkal teli globális gazdaságban — nyelvoktatás, valós kontextus és coaching technikák ötvözésével.",
      pills: ["Coaching szemlélet", "Valós üzleti kontextus", "Mérhető fejlődés", "Vezetői szintű minőség"],
    },
    courses: { kicker: "Kurzusaink", title: "Eredményekre tervezve" },
    form: {
      kicker: "Ingyenes szintfelmérő",
      title: "Találd meg a kiindulópontod",
      sub: "Hozd létre a fiókod és a megfelelő képzésre irányítunk.",
      name: "Teljes név", email: "Email", password: "Jelszó",
      focus: "Mi a fő fókuszterületed?",
      focusPh: "Válassz fókuszt",
      focusOptions: ["Általános angol", "Szakmai / üzleti angol", "Fast Track", "Beszédbiztonság", "Vezetői 1-az-1-ben"],
      submit: "Szintfelmérés indítása",
    },
    about: { kicker: "Rólunk", title: "Ismerd meg az oktatókat" },
    testimonials: { kicker: "Vélemények", title: "Mit mondanak ügyfeleink" },
    footer: { rights: "Minden jog fenntartva.", privacy: "Adatvédelem", imp: "Impresszum", reg: "Felnőttképzési nyilvántartási szám: B/2020/002545" },
  },
  de: {
    nav: { courses: "Kurse", about: "Über uns", reviews: "Bewertungen", blog: "Blog", contact: "Kontakt", cta: "Kostenloser Einstufungstest" },
    hero: {
      eyebrow: "Premium-Englisch für eine neue Ära",
      title1: "Verbinde dich mit der Welt.",
      title2: "Sprich mit Leichtigkeit.",
      title3: "Lerne auf die trendigste Art.",
      subtitle: "Maßgeschneidertes, coaching-orientiertes Business- und Allgemeinenglisch für Erwachsene, Manager und Führungskräfte.",
      ctaPrimary: "Starte deine Reise",
      ctaSecondary: "Kurse entdecken",
    },
    value: {
      kicker: "Warum wir",
      title: "Mehr als Englisch — ein Wettbewerbsvorteil",
      body: "Für ambitionierte Berufstätige, die über klassisches Sprachtraining hinausgehen wollen. Wir bereiten dich darauf vor, in einer fordernden globalen Wirtschaft zu verstehen, dich anzupassen, zu wachsen und zu glänzen — durch Sprache, realen Kontext und Coaching.",
      pills: ["Coaching-Ansatz", "Realer Geschäftskontext", "Messbarer Fortschritt", "Executive-Qualität"],
    },
    courses: { kicker: "Unsere Kurse", title: "Programme für echte Ergebnisse" },
    form: {
      kicker: "Kostenloser Einstufungstest",
      title: "Finde deinen Startpunkt",
      sub: "Erstelle dein Konto und wir finden den passenden Kurs.",
      name: "Voller Name", email: "E-Mail", password: "Passwort",
      focus: "Was ist dein Hauptfokus?",
      focusPh: "Fokus wählen",
      focusOptions: ["Allgemeines Englisch", "Business-Englisch", "Fast Track", "Sprechsicherheit", "Executive 1-zu-1"],
      submit: "Einstufung erhalten",
    },
    about: { kicker: "Über uns", title: "Lerne deine Trainer kennen" },
    testimonials: { kicker: "Bewertungen", title: "Was unsere Kunden sagen" },
    footer: { rights: "Alle Rechte vorbehalten.", privacy: "Datenschutz", imp: "Impressum", reg: "Erwachsenenbildungsregisternummer: B/2020/002545" },
  },
} as const;

const courseList = [
  { icon: Brain, title: "Self-Awareness Course in English", desc: "Self-knowledge, communication and personality development.", tag: "Mindset" },
  { icon: GraduationCap, title: "General English", desc: "Structured progression from beginner to advanced levels.", tag: "Core" },
  { icon: Zap, title: "Fast Track English™", desc: "Ultra-fast language courses — 25 hours per course level.", tag: "25h" },
  { icon: MessagesSquare, title: "Mostly Speaking English™", desc: "Speech-centered language courses — 45 hours per course level.", tag: "45h" },
  { icon: BookOpen, title: "English as it is™", desc: "Traditional, comprehensive language courses — 60 hours per course level.", tag: "60h" },
  { icon: Briefcase, title: "Professional English", desc: "Tailored ESP tracks: Logistics, Accounting, Marketing, Purchasing, HR, Law, Tourism, Health, Commercial, Technical.", tag: "ESP", featured: true },
  { icon: Crown, title: "Exclusive English", desc: "Bespoke schedules, flexible class length, integrated executive coaching: objectives, conflict, EQ, motivation, strategy.", tag: "1:1", featured: true },
];

const instructors = [
  {
    name: "Márk Szombathelyi",
    role: "Founder & Lead Coach-Trainer",
    bio: "Teaching adults since 2007. History degree, systems programming qualification, certified professional coach, and extensive experience writing economic language exam tasks.",
    initials: "MS",
  },
  {
    name: "Marcell Mándli",
    role: "Senior Language Trainer",
    bio: "Focuses on cultural differences, the historical background of the language and interdisciplinary connections — broadening students' worldviews in English.",
    initials: "MM",
  },
];

const testimonials = [
  { name: "Réka Förhécz-Mihályi", role: "Purchaser", quote: "The one-on-one lesson helped me a lot in being able to deliver my professional presentation in a versatile style." },
  { name: "Attila", role: "Mechanical / Design Engineer", quote: "I speak English much more naturally and confidently — even in unexpected situations." },
  { name: "Adrienn Varga-Horváth", role: "Manager & Coach", quote: "We always talk about the things that concern me at the moment. Conveying my own thoughts helps me speak more fluently." },
  { name: "Imi", role: "Company Manager, Electrical Engineer", quote: "My grammar, vocabulary, listening comprehension and speaking skills have improved a lot. Highly recommended to anyone frustrated with traditional systems." },
];

const langLabels: Record<Lang, { label: string; flag: string }> = {
  en: { label: "English", flag: "EN" },
  hu: { label: "Magyar", flag: "HU" },
  de: { label: "Deutsch", flag: "DE" },
};

function Index() {
  const [lang, setLang] = useState<Lang>("en");
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = translations[lang];
  const formRef = useRef<HTMLDivElement>(null);
  const coursesRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", focus: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name) return toast.error(lang === "hu" ? "Add meg a neved." : lang === "de" ? "Bitte gib deinen Namen ein." : "Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error(lang === "hu" ? "Érvénytelen e-mail cím." : lang === "de" ? "Ungültige E-Mail-Adresse." : "Please enter a valid email.");
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, focus: form.focus || null, language: lang }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSubmitted(true);
      toast.success(
        lang === "hu" ? "Köszönjük! Hamarosan jelentkezünk." :
        lang === "de" ? "Danke! Wir melden uns in Kürze." :
        "Thanks! We'll be in touch shortly."
      );
      if (data?.id) {
        if (data?.sessionToken) {
          try { sessionStorage.setItem(`lead-token:${data.id}`, data.sessionToken); } catch {}
        }
        navigate({ to: "/placement-test/$leadId", params: { leadId: data.id } });
        return;
      }
      setForm({ name: "", email: "", focus: "" });
    } catch (err) {
      console.error(err);
      toast.error(
        lang === "hu" ? "Hiba történt. Próbáld újra." :
        lang === "de" ? "Etwas ist schiefgelaufen. Bitte erneut versuchen." :
        "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };

  const nav = useMemo(() => ([
    { key: "courses", label: t.nav.courses, onClick: () => scrollTo(coursesRef) },
    { key: "about", label: t.nav.about, onClick: () => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }) },
    { key: "reviews", label: t.nav.reviews, onClick: () => document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" }) },
    { key: "blog", label: t.nav.blog, onClick: () => {} },
    { key: "contact", label: t.nav.contact, onClick: () => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }) },
  ]), [t]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#top" className="group flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--gradient-hero)] text-xs font-bold text-primary-foreground shadow-[var(--shadow-card)]">T</span>
            <span className="text-[15px] font-semibold tracking-tight">Több mint angol</span>
          </a>
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((n) => (
              <button key={n.key} onClick={n.onClick}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {n.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button onClick={() => scrollTo(formRef)} className="hidden bg-[var(--teal-accent)] text-primary-foreground hover:bg-[var(--teal-accent-strong)] sm:inline-flex">
              {t.nav.cta} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <button onClick={() => setMobileOpen((o) => !o)} className="rounded-md p-2 text-foreground lg:hidden">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-border bg-background lg:hidden">
            <div className="flex flex-col gap-1 px-5 py-3">
              {nav.map((n) => (
                <button key={n.key} onClick={n.onClick} className="rounded-md px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted">
                  {n.label}
                </button>
              ))}
              <Button onClick={() => scrollTo(formRef)} className="mt-2 bg-[var(--teal-accent)] text-primary-foreground hover:bg-[var(--teal-accent-strong)]">
                {t.nav.cta}
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="top" className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, oklch(0.72 0.13 195 / 0.35), transparent 50%), radial-gradient(circle at 80% 60%, oklch(0.45 0.10 240 / 0.5), transparent 55%)",
          }}
        />
        <img
          src={heroBannerImg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-1/2 -z-10 hidden h-[640px] w-[640px] -translate-y-1/2 opacity-25 lg:block"
        />
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:py-28">
          <div className="lg:col-span-7 text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[var(--teal-accent)]" />
              {t.hero.eyebrow}
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{t.hero.title1}</span>
              <span className="mt-2 block text-white/90">{t.hero.title2}</span>
              <span className="mt-2 block bg-gradient-to-r from-[var(--teal-accent)] to-[var(--teal-accent-strong)] bg-clip-text text-transparent">{t.hero.title3}</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              {t.hero.subtitle}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => scrollTo(formRef)}
                className="h-12 bg-[var(--teal-accent)] px-6 text-[15px] font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-0.5 hover:bg-[var(--teal-accent-strong)]">
                {t.hero.ctaPrimary} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollTo(coursesRef)}
                className="h-12 border-white/30 bg-white/5 px-6 text-[15px] font-semibold text-white hover:bg-white/10 hover:text-white">
                {t.hero.ctaSecondary}
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/60">
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--teal-accent)]" /> Adults & executives</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--teal-accent)]" /> Coaching-led method</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--teal-accent)]" /> Industry-specific tracks</div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-white/15 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-[var(--teal-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <Star className="h-3 w-3" /> Trusted by leaders
              </div>
              <div className="grid grid-cols-2 gap-4 text-white">
                {[
                  { v: "18+", l: "Years training adults" },
                  { v: "10", l: "Industry ESP tracks" },
                  { v: "1:1", l: "Bespoke executive plans" },
                  { v: "25–60h", l: "Per course level" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-2xl font-semibold tracking-tight">{s.v}</div>
                    <div className="mt-1 text-xs text-white/60">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/75">
                "We don't teach English. We prepare professionals to think, lead and negotiate in it."
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal-accent-strong)]">
              {t.value.kicker}
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t.value.title}
            </h2>
          </div>
          <div className="lg:col-span-7">
            <p className="text-lg leading-relaxed text-muted-foreground">{t.value.body}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {t.value.pills.map((p) => (
                <span key={p} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground">
                  <Check className="h-3.5 w-3.5 text-[var(--teal-accent-strong)]" />
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COURSES */}
      <section ref={coursesRef} id="courses" className="bg-secondary/40">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal-accent-strong)]">{t.courses.kicker}</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.courses.title}</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courseList.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title}
                  className={`group relative flex flex-col rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)] ${c.featured ? "border-[var(--teal-accent)]/40 ring-1 ring-[var(--teal-accent)]/20" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-[var(--teal-accent)]/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--teal-accent-strong)]">
                      {c.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{c.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
                  <button onClick={() => scrollTo(formRef)}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-[var(--teal-accent-strong)]">
                    Learn more <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FORM */}
      <section ref={formRef} id="signup" className="relative overflow-hidden bg-background">
        <div className="absolute inset-x-0 top-0 -z-10 h-2/3"
          style={{ background: "linear-gradient(180deg, oklch(0.96 0.012 250) 0%, transparent 100%)" }} />
        <div className="mx-auto max-w-2xl px-5 py-20 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)] sm:p-10">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal-accent-strong)]">{t.form.kicker}</span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.form.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t.form.sub}</p>
            </div>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">{t.form.name}</Label>
                <Input id="name" required maxLength={120} value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Doe" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t.form.email}</Label>
                <Input id="email" type="email" required maxLength={255} value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>{t.form.focus}</Label>
                <Select value={form.focus} onValueChange={(v) => setForm((f) => ({ ...f, focus: v }))}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={t.form.focusPh} />
                  </SelectTrigger>
                  <SelectContent>
                    {t.form.focusOptions.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={submitting}
                className="h-12 w-full bg-[var(--teal-accent)] text-base font-semibold text-primary-foreground hover:bg-[var(--teal-accent-strong)] disabled:opacity-60">
                {submitting ? "…" : t.form.submit} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              {submitted && (
                <p className="text-center text-sm text-[var(--teal-accent-strong)]">
                  {lang === "hu" ? "Köszönjük! Hamarosan jelentkezünk e-mailben." :
                   lang === "de" ? "Danke! Wir melden uns per E-Mail." :
                   "Thanks! A confirmation email is on the way."}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* INSTRUCTORS */}
      <section id="about" className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal-accent-strong)]">{t.about.kicker}</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.about.title}</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {instructors.map((p) => (
              <div key={p.name} className="group flex flex-col gap-5 rounded-2xl border border-border bg-card p-7 transition-all hover:shadow-[var(--shadow-card)] sm:flex-row">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold text-primary-foreground shadow-[var(--shadow-card)]"
                  style={{ background: "var(--gradient-hero)" }}>
                  {p.initials}
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">{p.name}</h3>
                  <div className="mt-0.5 text-sm font-medium text-[var(--teal-accent-strong)]">{p.role}</div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="reviews" className="bg-background">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--teal-accent-strong)]">{t.testimonials.kicker}</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t.testimonials.title}</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {testimonials.map((r) => (
              <figure key={r.name} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
                <div className="flex gap-0.5 text-[var(--teal-accent-strong)]">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <blockquote className="text-base leading-relaxed text-foreground">"{r.quote}"</blockquote>
                <figcaption className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {r.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="relative border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-3 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--teal-accent)] text-xs font-bold text-primary">T</span>
              <span className="text-base font-semibold tracking-tight">Több mint angol</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-primary-foreground/70">
              Premium, coaching-oriented English training for adults, executives and company leaders.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm text-primary-foreground/75">
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-[var(--teal-accent)]" /> szombathelyi.mark@tobbmintangol.hu</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-[var(--teal-accent)]" /> info@tobbmintangol.hu</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-[var(--teal-accent)]" /> 20/284-7797</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">Legal</h4>
            <ul className="mt-4 space-y-3 text-sm text-primary-foreground/75">
              <li>{t.footer.reg}</li>
              <li className="flex gap-4">
                <a href="#" className="hover:text-[var(--teal-accent)]">{t.footer.privacy}</a>
                <a href="#" className="hover:text-[var(--teal-accent)]">{t.footer.imp}</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 text-xs text-primary-foreground/60 lg:px-8">
            <span>© {new Date().getFullYear()} Több mint angol. {t.footer.rights}</span>
            <span className="hidden sm:inline">Made for driven professionals.</span>
          </div>
        </div>
      </footer>

      {/* LANGUAGE DROP-UP */}
      <div className="fixed bottom-5 right-5 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-[var(--teal-accent)]/50">
              <Globe className="h-4 w-4 text-[var(--teal-accent-strong)]" />
              {langLabels[lang].flag}
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="mb-2 w-40">
            {(Object.keys(langLabels) as Lang[]).map((l) => (
              <DropdownMenuItem key={l} onClick={() => setLang(l)}
                className={`cursor-pointer ${l === lang ? "bg-muted font-semibold" : ""}`}>
                <span className="mr-2 text-xs font-bold text-muted-foreground">{langLabels[l].flag}</span>
                {langLabels[l].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
