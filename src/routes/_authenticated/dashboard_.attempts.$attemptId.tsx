import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAttemptDetail } from "@/lib/dashboard.functions";
import { AttemptDetailView, type AttemptDetail } from "@/components/attempt-detail-view";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard_/attempts/$attemptId")({
  head: () => ({
    meta: [{ title: "Attempt details — Több mint angol" }, { name: "robots", content: "noindex" }],
  }),
  component: AttemptDetail,
});

function AttemptDetail() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const fetchDetail = useServerFn(getAttemptDetail);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchDetail({ data: { attemptId } });
        setDetail(d as AttemptDetail);
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
        <AttemptDetailView detail={detail} levelLabel="Your estimated level" />
      </main>
    </div>
  );
}
