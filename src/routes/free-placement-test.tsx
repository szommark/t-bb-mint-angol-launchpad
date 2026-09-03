import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { FOCUS_OPTIONS, FOCUS_COMING_SOON, FOCUS_OTHER, isPresetFocus, levelForFocus } from "@/lib/focus-options";
import { GRAMMAR_ITEM_COUNTS, DEFAULT_GRAMMAR_ITEM_COUNT, type GrammarItemCount } from "@/lib/grammar-item-count";

export const Route = createFileRoute("/free-placement-test")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ingyenes angol szintfelmérő — Több mint angol" },
      { name: "description", content: "Hozd létre a fiókod, és tölts ki egy személyre szabott szintfelmérő tesztet kb. 5 perc alatt." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CombinedFlow,
});

type Level = "A1" | "A2" | "B1" | "B2" | "C1";
const LEVEL_LABEL: Record<Level, string> = {
  A1: "Kezdő", A2: "Alapszintű", B1: "Középszintű", B2: "Középszintű felső", C1: "Haladó",
};
// The grammar test bank only covers A1-C1; a prior general placement result
// of C2 (from before the grammar-only test existed) clamps down to C1.
function clampToC1(level: string): Level {
  return level === "C2" ? "C1" : (level as Level);
}

function CombinedFlow() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<"register" | "intake">("register");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  // Step 1 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [registering, setRegistering] = useState(false);

  // Step 2 fields
  const [manualLevel, setManualLevel] = useState<Level | "">("");
  const [hasPriorAttempt, setHasPriorAttempt] = useState(false);
  const [priorAttemptLevel, setPriorAttemptLevel] = useState<Level | "">("");
  const [focus, setFocus] = useState("");
  const [focusChoice, setFocusChoice] = useState<string>("");
  const [focusOther, setFocusOther] = useState<string>("");
  const [itemCount, setItemCount] = useState<GrammarItemCount>(DEFAULT_GRAMMAR_ITEM_COUNT);
  const [starting, setStarting] = useState(false);

  // An exam-prep focus targets one specific level, which takes priority
  // over a returning user's last result, which takes priority over manual pick.
  const forcedLevel = levelForFocus(focus) as Level | null;
  const selfLevel = forcedLevel || priorAttemptLevel || manualLevel;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setProfileName((data.user.user_metadata?.name as string) ?? "");
        setProfileEmail(data.user.email ?? "");
        // Prefill intake from profile
        const { data: p } = await supabase.from("profiles").select("focus, name").eq("user_id", data.user.id).maybeSingle();
        if (p) {
          if (p.name && !profileName) setProfileName(p.name);
          setFocus(p.focus ?? "");
          if (p.focus) {
            if (isPresetFocus(p.focus)) {
              setFocusChoice(p.focus);
            } else {
              setFocusChoice(FOCUS_OTHER);
              setFocusOther(p.focus);
            }
          }
        }
        // A returning user who already completed a test skips self-assessment —
        // reuse their most recent result as the starting level.
        try {
          const { listMyAttempts } = await import("@/lib/dashboard.functions");
          const attempts = await listMyAttempts();
          if (attempts.length > 0) {
            setHasPriorAttempt(true);
            setPriorAttemptLevel(clampToC1(attempts[0].final_level));
          }
        } catch (e) {
          console.warn("could not load prior attempts", e);
        }
        setStep("intake");
      }
      setChecking(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Kérjük, add meg a neved.");
    if (password.length < 8) return toast.error("A jelszónak legalább 8 karakterből kell állnia.");
    if (password !== password2) return toast.error("A jelszavak nem egyeznek.");
    setRegistering(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setRegistering(false);
    if (error) return toast.error(error.message);
    if (!data.session) {
      toast.success("Fiók létrehozva — a folytatáshoz erősítsd meg az email címed.");
      return;
    }
    setProfileName(name.trim());
    setProfileEmail(email.trim());
    setStep("intake");
  };

  const onStart = async () => {
    if (!selfLevel) return toast.error("Kérjük, válassz szintet.");
    setStarting(true);
    try {
      // Create an anonymous_session shell (name/email from profile), get sessionToken + leadId
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName || "User", email: profileEmail, focus: focus || null, language: "hu" }),
      });
      const data = await res.json();
      if (!res.ok || !data?.id) throw new Error(data?.error ?? "Could not start test");
      if (data?.sessionToken) {
        try { sessionStorage.setItem(`lead-token:${data.id}`, data.sessionToken); } catch { /* noop */ }
      }
      // Link the anonymous session to the current user via claim, if signed in
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        try {
          const { claimAnonymousSession } = await import("@/lib/dashboard.functions");
          await claimAnonymousSession({ data: { anonymousSessionId: data.id } });
        } catch (e) {
          console.warn("claim failed", e);
        }
      }
      // Pre-write intake by starting the test now
      const startRes = await fetch("/api/public/grammar/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Lead-Token": data.sessionToken },
        body: JSON.stringify({
          leadId: data.id,
          itemCount,
          intake: { selfLevel, language: "hu" },
        }),
      });
      const started = await startRes.json();
      if (!startRes.ok) throw new Error(started?.error ?? "Could not start test");
      navigate({ to: "/grammar-test/$leadId", params: { leadId: data.id } });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Nem sikerült elindítani.");
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--gradient-hero)] text-xs font-bold text-primary-foreground shadow-[var(--shadow-card)]">T</span>
            <span className="text-[15px] font-semibold tracking-tight">Több mint angol</span>
          </Link>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ingyenes szintfelmérő</div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-12">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)] sm:p-10">
          {checking ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : step === "register" ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--teal-accent)]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--teal-accent-strong)]">
                  <Sparkles className="h-3 w-3" /> 1. lépés / 2
                </span>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">Hozd létre a fiókod</h1>
                <p className="mt-2 text-sm text-muted-foreground">Mentsd el az eredményeidet, és kövesd nyomon a fejlődésed.</p>
              </div>
              <form onSubmit={onRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rn">Teljes név</Label>
                  <Input id="rn" required value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="re">Email cím</Label>
                  <Input id="re" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rp">Jelszó</Label>
                    <Input id="rp" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rp2">Jelszó megerősítése</Label>
                    <Input id="rp2" type="password" required minLength={8} value={password2} onChange={(e) => setPassword2(e.target.value)} className="h-11" />
                  </div>
                </div>
                <Button type="submit" disabled={registering} className="h-11 w-full bg-[var(--teal-accent)] hover:bg-[var(--teal-accent-strong)]">
                  {registering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Tovább a teszthez
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Már van fiókod? <Link to="/auth" className="font-medium text-[var(--teal-accent-strong)] hover:underline">Bejelentkezés</Link>
                </p>
              </form>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--teal-accent)]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--teal-accent-strong)]">
                  <Sparkles className="h-3 w-3" /> 2. lépés / 2
                </span>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">Mesélj magadról{profileName ? `, ${profileName.split(" ")[0]}` : ""}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{itemCount} gyors kérdés, a szintedhez igazítva. Kb. {Math.round(itemCount / 2)} perc.</p>
              </div>
              <div className="space-y-6">
                {forcedLevel ? (
                  <div className="space-y-2">
                    <Label>Önértékelt szint</Label>
                    <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                      Ez a fókuszterület a(z) <span className="font-medium text-foreground">{forcedLevel} — {LEVEL_LABEL[forcedLevel]}</span> szintre készít fel.
                    </p>
                  </div>
                ) : hasPriorAttempt ? (
                  <div className="space-y-2">
                    <Label>Önértékelt szint</Label>
                    <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                      Folytatás a legutóbbi eredményedtől: <span className="font-medium text-foreground">{selfLevel} — {LEVEL_LABEL[selfLevel as Level]}</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Önértékelt szint</Label>
                    <Select value={manualLevel} onValueChange={(v) => setManualLevel(v as Level)}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Válassz szintet" /></SelectTrigger>
                      <SelectContent>
                        {(["A1", "A2", "B1", "B2", "C1"] as Level[]).map((l) => (
                          <SelectItem key={l} value={l}>{l} — {LEVEL_LABEL[l]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="fpf">Fő fókuszterület</Label>
                  <Select
                    value={focusChoice}
                    onValueChange={(v) => {
                      setFocusChoice(v);
                      setFocus(v);
                    }}
                  >
                    <SelectTrigger className="h-11" id="fpf">
                      <SelectValue placeholder="Válaszd ki a fő fókuszod" />
                    </SelectTrigger>
                    <SelectContent>
                      {FOCUS_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                      <SelectItem value={FOCUS_COMING_SOON} disabled>{FOCUS_COMING_SOON}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kérdések száma</Label>
                  <ToggleGroup
                    type="single"
                    value={String(itemCount)}
                    onValueChange={(v) => {
                      if (v) setItemCount(Number(v) as GrammarItemCount);
                    }}
                    className="grid grid-cols-3 gap-2"
                  >
                    {GRAMMAR_ITEM_COUNTS.map((n) => (
                      <ToggleGroupItem
                        key={n}
                        value={String(n)}
                        aria-label={`${n} kérdés`}
                        className="h-11 flex-1 rounded-lg border border-border data-[state=on]:border-[var(--teal-accent)] data-[state=on]:bg-[var(--teal-accent)]/15 data-[state=on]:text-[var(--teal-accent-strong)]"
                      >
                        {n}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
                <Button onClick={onStart} disabled={starting} className="h-11 w-full bg-[var(--teal-accent)] hover:bg-[var(--teal-accent-strong)]">
                  {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Teszt generálása <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}