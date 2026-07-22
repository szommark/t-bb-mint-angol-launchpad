import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { marked } from "marked";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPostPage,
});

type BlogPost = {
  title: string;
  excerpt: string;
  content: string;
  image_url: string | null;
  published_at: string;
};

function BlogPostPage() {
  const { slug } = Route.useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data, error } = await supabase
        .from("blog_posts")
        .select("title, excerpt, content, image_url, published_at")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (!mounted) return;
      if (error || !data) setNotFound(true);
      else setPost(data);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const html = post ? marked.parse(post.content, { async: false }) : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-5">
          <Link to="/" hash="blog" className="group flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--gradient-hero)] text-xs font-bold text-primary-foreground shadow-[var(--shadow-card)]">T</span>
            <span className="text-[15px] font-semibold tracking-tight">Több mint angol</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-12 lg:px-0">
        <Link to="/" hash="blog" className="text-sm text-muted-foreground hover:text-foreground">
          ← Vissza a bloghoz
        </Link>

        {loading && (
          <div className="mt-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && notFound && (
          <div className="mt-16 text-center">
            <h1 className="text-2xl font-semibold">A bejegyzés nem található</h1>
            <p className="mt-2 text-muted-foreground">Lehet, hogy törölték, vagy még nincs publikálva.</p>
          </div>
        )}

        {!loading && post && (
          <article className="mt-8">
            {post.image_url && (
              <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-muted">
                <img src={post.image_url} alt={post.title} className="h-full w-full object-cover" />
              </div>
            )}
            <span className="mt-6 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {new Date(post.published_at).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{post.title}</h1>
            <div
              className="mt-8 space-y-4 leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>
        )}
      </div>
    </div>
  );
}
