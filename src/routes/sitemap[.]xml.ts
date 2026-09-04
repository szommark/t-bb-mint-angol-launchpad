import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site";

const STATIC_PATHS = ["/", "/free-placement-test", "/privacy"];

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { data: posts } = await supabase
          .from("blog_posts")
          .select("slug, updated_at")
          .eq("published", true)
          .order("published_at", { ascending: false });

        const urls = [
          ...STATIC_PATHS.map((path) => ({ loc: `${SITE_URL}${path}`, lastmod: undefined as string | undefined })),
          ...(posts ?? []).map((post) => ({ loc: `${SITE_URL}/blog/${post.slug}`, lastmod: post.updated_at })),
        ];

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}
  </url>`).join("\n")}
</urlset>
`;

        return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
      },
    },
  },
});
