import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ensureTeacherProfile } from "@/lib/teacher.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, LogOut, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher dashboard — Több mint angol" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeacherDashboard,
});

type Student = { user_id: string; name: string; email: string; cefr_level: string | null; joinedAt: string };

function TeacherDashboard() {
  const navigate = useNavigate();
  const fetchTeacherProfile = useServerFn(ensureTeacherProfile);

  const [loading, setLoading] = useState(true);
  const [teacherCode, setTeacherCode] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchTeacherProfile();
        if (!res.isTeacher) {
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        setTeacherCode(res.teacherCode);
        setStudents(res.students);
      } catch (e) {
        console.error(e);
        toast.error("Could not load your teacher dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchTeacherProfile, navigate]);

  const onCopy = async () => {
    await navigator.clipboard.writeText(teacherCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        <div>
          <h1 className="text-2xl font-semibold">Teacher dashboard</h1>
          <p className="text-sm text-muted-foreground">Share your code with students and track their progress.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-semibold">Your join code</h2>
              <p className="mt-1 text-sm text-muted-foreground">Students enter this on their dashboard to connect with you.</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="rounded-2xl border border-border bg-muted/30 px-6 py-3 font-mono text-2xl font-semibold tracking-[0.3em] text-[var(--teal-accent-strong)]">
                  {teacherCode}
                </span>
                <Button variant="outline" onClick={onCopy}>
                  {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-semibold">Your students</h2>
              {students.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No students yet — share your code to get started.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="pb-3 pr-4">Name</th>
                        <th className="pb-3 pr-4">Email</th>
                        <th className="pb-3 pr-4">Level</th>
                        <th className="pb-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.user_id} className="border-b border-border/50 last:border-0">
                          <td className="py-3 pr-4">{s.name || "—"}</td>
                          <td className="py-3 pr-4">
                            <Link
                              to="/teacher/$studentId"
                              params={{ studentId: s.user_id }}
                              className="text-[var(--teal-accent-strong)] hover:underline"
                            >
                              {s.email}
                            </Link>
                          </td>
                          <td className="py-3 pr-4 font-semibold">{s.cefr_level ?? "—"}</td>
                          <td className="py-3">{new Date(s.joinedAt).toLocaleDateString()}</td>
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
