import { createFileRoute } from "@tanstack/react-router";
import { extractLeadToken, verifyLeadToken } from "@/lib/placement-auth.server";

export const Route = createFileRoute("/api/public/placement/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const leadId = url.searchParams.get("leadId");
        if (!leadId || !/^[0-9a-f-]{36}$/i.test(leadId)) {
          return Response.json({ error: "Invalid leadId" }, { status: 400 });
        }
        const token = extractLeadToken(request);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("leads")
          .select("id, name, focus, language, intake, test_questions, cefr_level, score_summary, completed_at, session_token_hash")
          .eq("id", leadId)
          .maybeSingle();
        if (error || !data) return Response.json({ error: "Not found" }, { status: 404 });
        if (!verifyLeadToken(token, data.session_token_hash)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sanitizedQuestions = Array.isArray(data.test_questions)
          ? (data.test_questions as Array<{ correctIndex: number } & Record<string, unknown>>).map(
              ({ correctIndex: _c, ...rest }) => rest,
            )
          : null;

        return Response.json({
          id: data.id,
          name: data.name,
          focus: data.focus,
          language: data.language,
          intake: data.intake,
          questions: sanitizedQuestions,
          cefrLevel: data.cefr_level,
          summary: data.score_summary,
          completedAt: data.completed_at,
        });
      },
    },
  },
});