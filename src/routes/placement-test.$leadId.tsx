import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Lang = "en" | "hu" | "de";
type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type Skill = "reading" | "writing" | "speaking" | "listening";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  skill: string;
  cefr: Level;
};

type Result = {
  level: Level;
  totalCorrect: number;
  totalQ: number;
  summary: string;
  review: ReviewItem[];
  byLevel: Record<string, { correct: number; total: number }>;
};

type ReviewItem = {
  id: string;
  prompt: string;
  cefr: Level;
  options: string[];
  userIndex: number | null;
  userAnswer: string | null;
  correctIndex: number;
  correctAnswer: string;
  explanation: string;
};

const t = {
  en: {
    title: "Free English Placement Test",
    sub: "A short intake, then 20 quick questions. About 10 minutes.",
    intake: {
      heading: "Tell us a bit about you",
      selfLevel: "Self-assessed level",
      selfPh: "Choose a level",
      focus: "Main focus area",
      focusPh: "What do you want to use English for?",
      skills: "Skills you most want to improve",
      start: "Generate my test",
    },
    generating: "Crafting your personalized test…",
    test: { prev: "Previous", next: "Next", submit: "Submit test", q: "Question" },
    result: {
      heading: "Your estimated level",
      back: "Back to homepage",
      booking: "Book my consultation",
    },
    review: {
      heading: "Review your answers",
      empty: "Perfect run — nothing to review.",
      yours: "Your answer",
      correct: "Correct answer",
      noAnswer: "No answer",
      why: "Why",
      score: "Score",
    },
      byLevelHeading: "Accuracy by level",
    levelLabel: {
      A1: "Beginner", A2: "Elementary", B1: "Intermediate",
      B2: "Upper-Intermediate", C1: "Advanced", C2: "Proficient",
    } as Record<Level, string>,
    skillLabels: { reading: "Reading", writing: "Writing", speaking: "Speaking", listening: "Listening" } as Record<Skill, string>,
    requiredAll: "Please answer every question before submitting.",
    pickLevel: "Please pick a level.",
    pickSkill: "Please pick at least one skill.",
    timeLeft: "Time left",
    timedOut: "Time's up — submitting what you've answered.",
    unansweredNote: (n: number) => `${n} unanswered — submitting anyway.`,
  },
  hu: {
    title: "Ingyenes angol szintfelmérő",
    sub: "Rövid bemutatkozás, majd 20 gyors kérdés. Kb. 10 perc.",
    intake: {
      heading: "Mesélj magadról röviden",
      selfLevel: "Önbecsült szint",
      selfPh: "Válassz szintet",
      focus: "Fő fókuszterület",
      focusPh: "Mire használnád az angolt?",
      skills: "Melyik készségeden fejlesztenél leginkább?",
      start: "Teszt indítása",
    },
    generating: "Személyre szabott teszt készítése…",
    test: { prev: "Előző", next: "Következő", submit: "Beküldés", q: "Kérdés" },
    result: {
      heading: "Becsült szinted",
      back: "Vissza a főoldalra",
      booking: "Konzultáció foglalása",
    },
    review: {
      heading: "Kérdések átnézésre",
      empty: "Hibátlan teljesítmény — nincs mit átnézni.",
      yours: "A te válaszod",
      correct: "Helyes válasz",
      noAnswer: "Nincs válasz",
      why: "Magyarázat",
      score: "Pontszám",
    },
    byLevelHeading: "Pontosság szintenként",
    levelLabel: {
      A1: "Kezdő", A2: "Alapfok", B1: "Középhaladó",
      B2: "Középfok+", C1: "Haladó", C2: "Mestermű",
    } as Record<Level, string>,
    skillLabels: { reading: "Olvasás", writing: "Írás", speaking: "Beszéd", listening: "Hallás" } as Record<Skill, string>,
    requiredAll: "Kérlek válaszolj minden kérdésre a beküldés előtt.",
    pickLevel: "Válassz egy szintet.",
    pickSkill: "Válassz legalább egy készséget.",
    timeLeft: "Hátralévő idő",
    timedOut: "Lejárt az idő — a megválaszolt kérdések beküldve.",
    unansweredNote: (n: number) => `${n} megválaszolatlan kérdés — beküldés folyamatban.`,
  },
  de: {
    title: "Kostenloser Englisch-Einstufungstest",
    sub: "Kurze Vorstellung, dann 20 schnelle Fragen. Etwa 10 Minuten.",
    intake: {
      heading: "Erzähle uns kurz von dir",
      selfLevel: "Selbsteinschätzung",
      selfPh: "Niveau wählen",
      focus: "Hauptfokus",
      focusPh: "Wofür möchtest du Englisch nutzen?",
      skills: "Welche Fähigkeiten möchtest du verbessern?",
      start: "Test starten",
    },
    generating: "Personalisierter Test wird erstellt…",
    test: { prev: "Zurück", next: "Weiter", submit: "Test abschicken", q: "Frage" },
    result: {
      heading: "Dein geschätztes Niveau",
      back: "Zurück zur Startseite",
      booking: "Beratungstermin buchen",
    },
    review: {
      heading: "Fragen zur Wiederholung",
      empty: "Perfekter Lauf — nichts zu wiederholen.",
      yours: "Deine Antwort",
      correct: "Richtige Antwort",
      noAnswer: "Keine Antwort",
      why: "Erklärung",
      score: "Punktzahl",
    },
    byLevelHeading: "Genauigkeit pro Niveau",
    levelLabel: {
      A1: "Anfänger", A2: "Grundkenntnisse", B1: "Mittelstufe",
      B2: "Obere Mittelstufe", C1: "Fortgeschritten", C2: "Muttersprachlich",
    } as Record<Level, string>,
    skillLabels: { reading: "Lesen", writing: "Schreiben", speaking: "Sprechen", listening: "Hören" } as Record<Skill, string>,
    requiredAll: "Bitte beantworte alle Fragen vor dem Absenden.",
    pickLevel: "Bitte wähle ein Niveau.",
    pickSkill: "Bitte wähle mindestens eine Fähigkeit.",
    timeLeft: "Verbleibende Zeit",
    timedOut: "Zeit abgelaufen — beantwortete Fragen werden gesendet.",
    unansweredNote: (n: number) => `${n} unbeantwortet — wird trotzdem gesendet.`,
  },
} as const;

const TEST_DURATION_SECONDS = 600;
const deadlineKey = (leadId: string) => `placement-deadline:${leadId}`;

export const Route = createFileRoute("/placement-test/$leadId")({
  head: () => ({
    meta: [
      { title: "Placement Test — Több mint angol" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlacementTest,
});

type Step = "loading" | "intake" | "generating" | "test" | "result";

function PlacementTest() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();
  const sessionToken = (() => {
    if (typeof window === "undefined") return "";
    try { return sessionStorage.getItem(`lead-token:${leadId}`) ?? ""; } catch { return ""; }
  })();
  const authHeaders: Record<string, string> = sessionToken ? { "X-Lead-Token": sessionToken } : {};

  const [lang, setLang] = useState<Lang>("en");
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("loading");

  const [selfLevel, setSelfLevel] = useState<Level | "">("");
  const [focus, setFocus] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);

  const [current, setCurrent] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalPlanned, setTotalPlanned] = useState(20);
  const [advancing, setAdvancing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const submittedRef = useRef(false);

  const lc = t[lang];

  // Load existing state for refresh-safety
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/placement/state?leadId=${leadId}`, { headers: authHeaders });
        if (!res.ok) {
          if (!cancelled) {
            toast.error("Could not load your test session.");
            setStep("intake");
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data.language && (["en", "hu", "de"] as const).includes(data.language)) setLang(data.language);
        if (data.name) setName(data.name);
        if (data.focus) setFocus(data.focus);
        if (data.completedAt && data.cefrLevel) {
          setResult({
            level: data.cefrLevel,
            totalCorrect: typeof data.totalCorrect === "number" ? data.totalCorrect : 0,
            totalQ: typeof data.totalQ === "number" ? data.totalQ : 0,
            summary: data.summary ?? "",
            review: Array.isArray(data.review) ? data.review : [],
            byLevel: data.byLevel ?? {},
          });
          setStep("result");
          return;
        }
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions);
          setStep("test");
          return;
        }
        setStep("intake");
      } catch (e) {
        console.error(e);
        if (!cancelled) setStep("intake");
      }
    })();
    return () => { cancelled = true; };
  }, [leadId]);

  const toggleSkill = (s: Skill) =>
    setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const startTest = async () => {
    if (!selfLevel) return toast.error(lc.pickLevel);
    if (skills.length === 0) return toast.error(lc.pickSkill);
    setStep("generating");
    try {
      const res = await fetch("/api/public/placement/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          leadId,
          intake: {
            selfLevel, focus: focus || null,
            skills, language: lang,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setQuestions(data.questions);
      setQIdx(0);
      setAnswers({});
      setStep("test");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not generate the test.");
      setStep("intake");
    }
  };

  const submitTest = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const currentAnswers = answersRef.current;
    const unanswered = questions.length - Object.keys(currentAnswers).length;
    if (unanswered > 0) toast.message(lc.unansweredNote(unanswered));
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/placement/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ leadId, answers: currentAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      try { localStorage.removeItem(deadlineKey(leadId)); } catch { /* noop */ }
      setResult({
        level: data.level,
        totalCorrect: data.totalCorrect,
        totalQ: data.totalQ,
        summary: data.summary,
        review: Array.isArray(data.review) ? data.review : [],
        byLevel: data.byLevel ?? {},
      });
      setStep("result");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not submit.");
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  // Overall test timer with refresh-safe deadline.
  useEffect(() => {
    if (step !== "test" || questions.length === 0) return;
    let deadline: number;
    try {
      const stored = localStorage.getItem(deadlineKey(leadId));
      const parsed = stored ? parseInt(stored, 10) : NaN;
      if (Number.isFinite(parsed) && parsed > Date.now()) {
        deadline = parsed;
      } else {
        deadline = Date.now() + TEST_DURATION_SECONDS * 1000;
        localStorage.setItem(deadlineKey(leadId), String(deadline));
      }
    } catch {
      deadline = Date.now() + TEST_DURATION_SECONDS * 1000;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        if (!submittedRef.current) {
          toast.error(lc.timedOut);
          submitTest();
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, questions.length, leadId]);

  // Clear deadline once results are shown (covers resume path too).
  useEffect(() => {
    if (step === "result") {
      try { localStorage.removeItem(deadlineKey(leadId)); } catch { /* noop */ }
    }
  }, [step, leadId]);

  const progress = useMemo(
    () => (questions.length ? Math.round(((qIdx + 1) / questions.length) * 100) : 0),
    [qIdx, questions.length],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--gradient-hero)] text-xs font-bold text-primary-foreground shadow-[var(--shadow-card)]">T</span>
            <span className="text-[15px] font-semibold tracking-tight">Több mint angol</span>
          </Link>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{lc.title}</div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--teal-accent-strong)]" />
          </div>
        )}

        {step === "intake" && (
          <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)] sm:p-10">
            <div className="mb-8 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--teal-accent)]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--teal-accent-strong)]">
                <Sparkles className="h-3 w-3" /> {lc.title}
              </span>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {name ? `${lc.intake.heading}, ${name.split(" ")[0]}` : lc.intake.heading}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{lc.sub}</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label>{lc.intake.selfLevel}</Label>
                <Select value={selfLevel} onValueChange={(v) => setSelfLevel(v as Level)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder={lc.intake.selfPh} /></SelectTrigger>
                  <SelectContent>
                    {(["A1", "A2", "B1", "B2", "C1", "C2"] as Level[]).map((l) => (
                      <SelectItem key={l} value={l}>{l} — {lc.levelLabel[l]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="focus">{lc.intake.focus}</Label>
                <Input id="focus" value={focus} onChange={(e) => setFocus(e.target.value)} maxLength={120} placeholder={lc.intake.focusPh} className="h-11" />
              </div>
              <div className="space-y-3">
                <Label>{lc.intake.skills}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["reading", "writing", "speaking", "listening"] as Skill[]).map((s) => (
                    <label key={s} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${skills.includes(s) ? "border-[var(--teal-accent)] bg-[var(--teal-accent)]/5" : "border-border hover:bg-muted/40"}`}>
                      <Checkbox checked={skills.includes(s)} onCheckedChange={() => toggleSkill(s)} />
                      <span className="text-sm font-medium">{lc.skillLabels[s]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={startTest}
                className="h-12 w-full bg-[var(--teal-accent)] text-base font-semibold text-primary-foreground hover:bg-[var(--teal-accent-strong)]">
                {lc.intake.start} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-[var(--teal-accent-strong)]" />
            </div>
            <p className="mt-5 text-sm font-medium text-muted-foreground">{lc.generating}</p>
          </div>
        )}

        {step === "test" && questions.length > 0 && (() => {
          const q = questions[qIdx];
          const sel = answers[q.id];
          const isLast = qIdx === questions.length - 1;
          return (
            <div className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-card)] sm:p-9">
              <div className="mb-6 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{lc.test.q} {qIdx + 1} / {questions.length}</span>
                <span className="flex items-center gap-3">
                  {remaining !== null && (
                    <span
                      className={`flex items-center gap-1 tabular-nums ${
                        remaining <= 30
                          ? "text-destructive"
                          : remaining <= 120
                          ? "text-amber-500"
                          : "text-muted-foreground"
                      }`}
                      aria-label={lc.timeLeft}
                      title={lc.timeLeft}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                      {String(remaining % 60).padStart(2, "0")}
                    </span>
                  )}
                  <span className="text-[var(--teal-accent-strong)]">{q.cefr}</span>
                </span>
              </div>
              <Progress value={progress} className="mb-8 h-1.5" />
              <h2 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">{q.prompt}</h2>
              <RadioGroup
                value={sel !== undefined ? String(sel) : ""}
                onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: Number(v) }))}
                className="mt-6 space-y-3"
              >
                {q.options.map((opt, i) => (
                  <label key={i}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${sel === i ? "border-[var(--teal-accent)] bg-[var(--teal-accent)]/5" : "border-border hover:bg-muted/40"}`}>
                    <RadioGroupItem value={String(i)} className="mt-0.5" />
                    <span className="text-sm leading-relaxed">{opt}</span>
                  </label>
                ))}
              </RadioGroup>
              <div className="mt-8 flex items-center justify-between">
                <Button variant="outline" onClick={() => setQIdx((i) => Math.max(0, i - 1))} disabled={qIdx === 0}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> {lc.test.prev}
                </Button>
                {isLast ? (
                  <Button onClick={submitTest} disabled={submitting}
                    className="bg-[var(--teal-accent)] text-primary-foreground hover:bg-[var(--teal-accent-strong)]">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{lc.test.submit} <CheckCircle2 className="ml-1.5 h-4 w-4" /></>}
                  </Button>
                ) : (
                  <Button onClick={() => setQIdx((i) => Math.min(questions.length - 1, i + 1))}
                    disabled={sel === undefined}
                    className="bg-[var(--teal-accent)] text-primary-foreground hover:bg-[var(--teal-accent-strong)]">
                    {lc.test.next} <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })()}

        {step === "result" && result && (
          <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-elegant)] sm:p-12">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--teal-accent)]/15">
              <CheckCircle2 className="h-8 w-8 text-[var(--teal-accent-strong)]" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{lc.result.heading}</p>
            <div className="mt-3 text-6xl font-semibold tracking-tight" style={{ background: "var(--gradient-hero)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {result.level}
            </div>
            <div className="mt-1 text-base font-medium text-foreground">{lc.levelLabel[result.level]}</div>
            {result.totalQ > 0 && (
              <div className="mt-3 text-sm font-semibold text-foreground">
                {lc.review.score}: {result.totalCorrect}/{result.totalQ}
              </div>
            )}
            {(() => {
              const order: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
              const rows = order
                .map((l) => ({ level: l, ...(result.byLevel?.[l] ?? { correct: 0, total: 0 }) }))
                .filter((r) => r.total > 0);
              if (rows.length === 0) return null;
              return (
                <div className="mx-auto mt-6 max-w-md text-left">
                  <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {lc.byLevelHeading}
                  </p>
                  <ul className="space-y-2.5">
                    {rows.map((r) => {
                      const pct = Math.round((r.correct / r.total) * 100);
                      const color =
                        pct >= 75
                          ? "var(--teal-accent-strong)"
                          : pct >= 50
                          ? "var(--teal-accent)"
                          : "hsl(var(--destructive))";
                      return (
                        <li key={r.level} className="flex items-center gap-3">
                          <span className="w-8 shrink-0 text-xs font-semibold text-foreground/80">{r.level}</span>
                          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="w-20 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
                            {pct}% ({r.correct}/{r.total})
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button onClick={() => navigate({ to: "/" })} variant="outline">
                {lc.result.back}
              </Button>
              <Button onClick={() => navigate({ to: "/" })}
                className="bg-[var(--teal-accent)] text-primary-foreground hover:bg-[var(--teal-accent-strong)]">
                {lc.result.booking} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-card)] sm:p-9">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{lc.review.heading}</h2>
            {result.review.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{lc.review.empty}</p>
            ) : (
              <ol className="mt-5 space-y-4">
                {result.review.map((r, i) => (
                  <li key={r.id} className="rounded-2xl border border-border bg-background/40 p-5">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <span className="rounded-full bg-[var(--teal-accent)]/15 px-2 py-0.5 text-[var(--teal-accent-strong)]">{r.cefr}</span>
                      <span>#{i + 1}</span>
                    </div>
                    <p className="text-sm font-medium leading-snug text-foreground sm:text-base">{r.prompt}</p>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <div className="flex flex-wrap gap-x-2">
                        <span className="font-semibold text-destructive">{lc.review.yours}:</span>
                        <span className="text-foreground/90 line-through decoration-destructive/60">
                          {r.userAnswer ?? lc.review.noAnswer}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-2">
                        <span className="font-semibold text-[var(--teal-accent-strong)]">{lc.review.correct}:</span>
                        <span className="text-foreground">{r.correctAnswer}</span>
                      </div>
                    </div>
                    {r.explanation && (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground/80">{lc.review.why}: </span>
                        {r.explanation}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
          </div>
        )}
      </main>
    </div>
  );
}