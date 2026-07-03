import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAttemptDetail } from "@/lib/dashboard.functions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/attempts/$attemptId")({
  head: () => ({
    meta: [{ title: "Attempt details — Több mint angol" }, { name: "robots", content: "noindex" }],
  }),
  component: AttemptDetail,
});

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function AttemptDetail() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const fetchDetail = useServerFn(getAttemptDetail);
  const [loading, setLoading] = useState(true);
  type Detail = {
    attempt: { id: string; created_at: string; final_level: string; score: number; total_questions: number };
    byLevel: Record<string, { correct: number; total: number }>;
    review: Array<{ id: string; prompt: string; cefr: string; options: string[]; userIndex: number | null; userAnswer: string | null; correctIndex: number; correctAnswer: string; explanation: string }>;
  };
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchDetail({ data: { attemptId } });
        setDetail(d as Detail);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId, fetchDetail]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Attempt not found.</p>
          <Button onClick={() => navigate({ to: "/dashboard" })} className="mt-4">Back to dashboard</Button>
        </div>
      </div>
    );
  }

  const { attempt, byLevel, review } = detail;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 space-y-8">
        <section className="rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-elegant)]">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Your estimated level</p>
          <p className="mt-3 text-6xl font-bold text-[var(--teal-accent-strong)]">{attempt.final_level}</p>
          <p className="mt-2 text-sm text-muted-foreground">Score: {attempt.score}/{attempt.total_questions} · {new Date(attempt.created_at).toLocaleString()}</p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold">Accuracy by level</h2>
          <div className="mt-4 space-y-3">
            {LEVELS.map((l) => {
              const b = byLevel[l];
              if (!b || b.total === 0) return null;
              const pct = Math.round((b.correct / b.total) * 100);
              return (
                <div key={l}>
                  <div className="flex justify-between text-sm"><span className="font-semibold">{l}</span><span className="text-muted-foreground">{b.correct}/{b.total} · {pct}%</span></div>
                  <Progress value={pct} className="mt-1 h-2" />
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold">Review your answers</h2>
          {review.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No review data for this attempt.</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {review.map((r, i) => {
                const correct = r.userIndex === r.correctIndex;
                return (
                  <li key={r.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start gap-3">
                      {correct ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
                      <div className="flex-1">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Q{i + 1} · {r.cefr}</div>
                        <p className="mt-1 font-medium">{r.prompt}</p>
                        <div className="mt-3 space-y-1 text-sm">
                          <div><span className="text-muted-foreground">Your answer: </span>{r.userAnswer ?? <em>No answer</em>}</div>
                          {!correct && <div><span className="text-muted-foreground">Correct: </span>{r.correctAnswer}</div>}
                          {r.explanation && <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">{r.explanation}</div>}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}