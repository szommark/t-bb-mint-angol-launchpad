import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/free-placement-test")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Free English Placement Test — Több mint angol" },
      { name: "description", content: "Create your account and take a personalised placement test in about 5 minutes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CombinedFlow,
});

type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type Skill = "reading" | "writing" | "speaking" | "listening";
const ALL_SKILLS: Skill[] = ["reading", "writing", "speaking", "listening"];
const SKILL_LABEL: Record<Skill, string> = { reading: "Reading", writing: "Writing", speaking: "Speaking", listening: "Listening" };
const LEVEL_LABEL: Record<Level, string> = {
  A1: "Beginner", A2: "Elementary", B1: "Intermediate", B2: "Upper-Intermediate", C1: "Advanced", C2: "Proficient",
};

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
  const [selfLevel, setSelfLevel] = useState<Level | "">("");
  const [focus, setFocus] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setProfileName((data.user.user_metadata?.name as string) ?? "");
        setProfileEmail(data.user.email ?? "");
        // Prefill intake from profile
        const { data: p } = await supabase.from("profiles").select("focus, preferred_skills, name").eq("user_id", data.user.id).maybeSingle();
        if (p) {
          if (p.name && !profileName) setProfileName(p.name);
          setFocus(p.focus ?? "");
          if (Array.isArray(p.preferred_skills)) {
            setSkills(p.preferred_skills.filter((s: string): s is Skill => ALL_SKILLS.includes(s as Skill)));
          }
        }
        setStep("intake");
      }
      setChecking(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSkill = (s: Skill) =>
    setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your name.");
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== password2) return toast.error("Passwords don't match.");
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
      toast.success("Account created — please confirm your email to continue.");
      return;
    }
    setProfileName(name.trim());
    setProfileEmail(email.trim());
    setStep("intake");
  };

  const onStart = async () => {
    if (!selfLevel) return toast.error("Please pick a level.");
    if (skills.length === 0) return toast.error("Please pick at least one skill.");
    setStarting(true);
    try {
      // Create an anonymous_session shell (name/email from profile), get sessionToken + leadId
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName || "User", email: profileEmail, focus: focus || null, language: "en" }),
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
      const startRes = await fetch("/api/public/placement/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Lead-Token": data.sessionToken },
        body: JSON.stringify({
          leadId: data.id,
          intake: { selfLevel, focus: focus || null, skills, language: "en" },
        }),
      });
      const started = await startRes.json();
      if (!startRes.ok) throw new Error(started?.error ?? "Could not start test");
      navigate({ to: "/placement-test/$leadId", params: { leadId: data.id } });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not start.");
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
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Free Placement Test</div>
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
                  <Sparkles className="h-3 w-3" /> Step 1 of 2
                </span>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">Create your account</h1>
                <p className="mt-2 text-sm text-muted-foreground">Save your results and track your progress over time.</p>
              </div>
              <form onSubmit={onRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rn">Full name</Label>
                  <Input id="rn" required value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="re">Email address</Label>
                  <Input id="re" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="rp">Password</Label>
                    <Input id="rp" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rp2">Confirm password</Label>
                    <Input id="rp2" type="password" required minLength={8} value={password2} onChange={(e) => setPassword2(e.target.value)} className="h-11" />
                  </div>
                </div>
                <Button type="submit" disabled={registering} className="h-11 w-full bg-[var(--teal-accent)] hover:bg-[var(--teal-accent-strong)]">
                  {registering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Continue to test
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account? <Link to="/auth" className="font-medium text-[var(--teal-accent-strong)] hover:underline">Log in</Link>
                </p>
              </form>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--teal-accent)]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--teal-accent-strong)]">
                  <Sparkles className="h-3 w-3" /> Step 2 of 2
                </span>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight">Tell us a bit about you{profileName ? `, ${profileName.split(" ")[0]}` : ""}</h1>
                <p className="mt-2 text-sm text-muted-foreground">10 quick questions, personalised to your level. About 5 minutes.</p>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Self-assessed level</Label>
                  <Select value={selfLevel} onValueChange={(v) => setSelfLevel(v as Level)}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Choose a level" /></SelectTrigger>
                    <SelectContent>
                      {(["A1", "A2", "B1", "B2", "C1", "C2"] as Level[]).map((l) => (
                        <SelectItem key={l} value={l}>{l} — {LEVEL_LABEL[l]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fpf">Main focus area</Label>
                  <Input id="fpf" value={focus} onChange={(e) => setFocus(e.target.value)} maxLength={120} placeholder="What do you want to use English for?" className="h-11" />
                </div>
                <div className="space-y-3">
                  <Label>Skills you most want to improve</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {ALL_SKILLS.map((s) => (
                      <label key={s} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted">
                        <Checkbox checked={skills.includes(s)} onCheckedChange={() => toggleSkill(s)} />
                        {SKILL_LABEL[s]}
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={onStart} disabled={starting} className="h-11 w-full bg-[var(--teal-accent)] hover:bg-[var(--teal-accent-strong)]">
                  {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate my test <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}