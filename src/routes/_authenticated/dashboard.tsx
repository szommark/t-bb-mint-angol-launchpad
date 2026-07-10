import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, listMyAttempts, updateMyProfile } from "@/lib/dashboard.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FOCUS_OPTIONS, FOCUS_OTHER, isPresetFocus } from "@/lib/focus-options";
import { toast } from "sonner";
import { Loader2, ArrowRight, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My dashboard — Több mint angol" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchAttempts = useServerFn(listMyAttempts);
  const saveProfile = useServerFn(updateMyProfile);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{ name: string; email: string; focus: string | null } | null>(null);
  const [focus, setFocus] = useState("");
  const [focusChoice, setFocusChoice] = useState<string>("");
  const [focusOther, setFocusOther] = useState<string>("");
  type Attempt = { id: string; created_at: string; final_level: string; score: number; total_questions: number };
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [p, a] = await Promise.all([fetchProfile(), fetchAttempts()]);
        if (p) {
          setProfile({ name: p.name, email: p.email, focus: p.focus ?? null });
          setFocus(p.focus ?? "");
          if (p.focus) {
            if (isPresetFocus(p.focus)) { setFocusChoice(p.focus); }
            else { setFocusChoice(FOCUS_OTHER); setFocusOther(p.focus); }
          }
        }
        setAttempts(a as Attempt[]);
      } catch (e) {
        console.error(e);
        toast.error("Could not load your dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchProfile, fetchAttempts]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveProfile({ data: { focus: focus.trim() || null } });
      toast.success("Profile saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--gradient-hero)] text-xs font-bold text-primary-foreground shadow-[var(--shadow-card)]">T</span>
            <span className="text-[15px] font-semibold tracking-tight">Több mint angol</span>
          </Link>
          <button onClick={onSignOut} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}</h1>
            <p className="text-sm text-muted-foreground">Your profile and test history.</p>
          </div>
          <Button
            onClick={() => navigate({ to: "/free-placement-test" })}
            className="bg-[var(--teal-accent)] hover:bg-[var(--teal-accent-strong)]"
          >
            Take a new test <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-semibold">Your results</h2>
              {attempts.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No tests yet — take your first placement test to see your results here.</p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Current level</p>
                    <p className="mt-1 text-3xl font-semibold text-[var(--teal-accent-strong)]">{attempts[0].final_level}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Tests taken</p>
                    <p className="mt-1 text-3xl font-semibold">{attempts.length}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Overall accuracy</p>
                    <p className="mt-1 text-3xl font-semibold">
                      {(() => {
                        const totalCorrect = attempts.reduce((sum, a) => sum + a.score, 0);
                        const totalQuestions = attempts.reduce((sum, a) => sum + a.total_questions, 0);
                        return totalQuestions > 0 ? `${Math.round((totalCorrect / totalQuestions) * 100)}%` : "—";
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-semibold">Profile</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={profile?.name ?? ""} readOnly disabled />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile?.email ?? ""} readOnly disabled />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="focus">Preferred focus area</Label>
                  <Select
                    value={focusChoice}
                    onValueChange={(v) => {
                      setFocusChoice(v);
                      if (v === FOCUS_OTHER) setFocus(focusOther);
                      else setFocus(v);
                    }}
                  >
                    <SelectTrigger id="focus"><SelectValue placeholder="Select your main focus" /></SelectTrigger>
                    <SelectContent>
                      {FOCUS_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                      <SelectItem value={FOCUS_OTHER}>{FOCUS_OTHER}</SelectItem>
                    </SelectContent>
                  </Select>
                  {focusChoice === FOCUS_OTHER && (
                    <Input
                      value={focusOther}
                      onChange={(e) => { setFocusOther(e.target.value); setFocus(e.target.value); }}
                      maxLength={120}
                      placeholder="Tell us your specific focus"
                    />
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={onSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
                </Button>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-semibold">Test history</h2>
              {attempts.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No tests yet — take your first placement test to see results here.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Level</th>
                        <th className="pb-3 pr-4">Score</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((a) => (
                        <tr key={a.id} className="border-b border-border/50 last:border-0">
                          <td className="py-3 pr-4">{new Date(a.created_at).toLocaleDateString()}</td>
                          <td className="py-3 pr-4 font-semibold">{a.final_level}</td>
                          <td className="py-3 pr-4">{a.score}/{a.total_questions}</td>
                          <td className="py-3 text-right">
                            <Link to="/dashboard/attempts/$attemptId" params={{ attemptId: a.id }} className="text-[var(--teal-accent-strong)] hover:underline">
                              View details →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}