import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getStudentDashboard } from "@/lib/teacher.functions";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher_/$studentId")({
  head: () => ({
    meta: [
      { title: "Student — Több mint angol" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentDetail,
});

type Attempt = { id: string; created_at: string; final_level: string; score: number; total_questions: number; source: "placement" | "grammar" };
type Student = { name: string; email: string; cefr_level: string | null; focus: string | null };

function StudentDetail() {
  const navigate = useNavigate();
  const { studentId } = useParams({ from: "/_authenticated/teacher_/$studentId" });
  const fetchStudentDashboard = useServerFn(getStudentDashboard);

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchStudentDashboard({ data: { studentId } });
        setStudent(res.student);
        setAttempts(res.attempts as Attempt[]);
      } catch (e) {
        console.error(e);
        toast.error("Could not load this student.");
        navigate({ to: "/teacher", replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchStudentDashboard, navigate, studentId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-5">
          <Link to="/teacher" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to my students
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : student ? (
          <>
            <div>
              <h1 className="text-2xl font-semibold">{student.name || student.email}</h1>
              <p className="text-sm text-muted-foreground">{student.email}</p>
            </div>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-lg font-semibold">Results</h2>
              {attempts.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No tests taken yet.</p>
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
              <h2 className="text-lg font-semibold">Test history</h2>
              {attempts.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No tests taken yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Type</th>
                        <th className="pb-3 pr-4">Level</th>
                        <th className="pb-3 pr-4">Score</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((a) => (
                        <tr key={a.id} className="border-b border-border/50 last:border-0">
                          <td className="py-3 pr-4">{new Date(a.created_at).toLocaleDateString()}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={a.source === "grammar" ? "secondary" : "outline"}>
                              {a.source === "grammar" ? "Grammar Test" : "Placement Test"}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 font-semibold">{a.final_level}</td>
                          <td className="py-3 pr-4">{a.score}/{a.total_questions}</td>
                          <td className="py-3 text-right">
                            <Link
                              to="/teacher/$studentId/attempts/$attemptId"
                              params={{ studentId, attemptId: a.id }}
                              className="text-[var(--teal-accent-strong)] hover:underline"
                            >
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
        ) : null}
      </main>
    </div>
  );
}
