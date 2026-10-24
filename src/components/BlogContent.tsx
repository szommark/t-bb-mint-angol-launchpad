import { useMemo } from "react";
import { renderBlogHtml } from "@/lib/blog-format";
import { cn } from "@/lib/utils";

// Renders a blog post's Markdown body. Shared by the public post page and the admin preview,
// so the preview always matches what gets published.
export function BlogContent({ markdown, className }: { markdown: string; className?: string }) {
  const html = useMemo(() => renderBlogHtml(markdown), [markdown]);
  return <div className={cn("blog-prose", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
