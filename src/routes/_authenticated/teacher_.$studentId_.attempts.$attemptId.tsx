import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getStudentAttemptDetail } from "@/lib/teacher.functions";
import { AttemptDetailView, type AttemptDetail } from "@/components/attempt-detail-view";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher_/$studentId_/attempts/$attemptId")({
  head: () => ({
    meta: [{ title: "Attempt details — Több mint angol" }, { name: "robots", content: "noindex" }],
  }),
  component: StudentAttemptDetail,
});

function StudentAttemptDetail() {
  const { studentId, attemptId } = Route.useParams();
  const navigate = useNavigate();
  const fetchDetail = useServerFn(getStudentAttemptDetail);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchDetail({ data: { studentId, attemptId } });
        setDetail(d as AttemptDetail);
      } catch (e) {
        console.error(e);
        toast.error("Could not load this attempt.");
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId, fetchDetail, studentId]);

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
          <Button onClick={() => navigate({ to: "/teacher/$studentId", params: { studentId } })} className="mt-4">
            Back to student
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5">
          <Link
            to="/teacher/$studentId"
            params={{ studentId }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to student
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 space-y-8">
        <AttemptDetailView detail={detail} levelLabel="Estimated level" />
      </main>
    </div>
  );
}
