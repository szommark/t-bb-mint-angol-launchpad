import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { marked } from "marked";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { translations } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { pickLocalized } from "@/lib/blog-i18n";
import { SITE_URL } from "@/lib/site";

type BlogPost = {
  title: string;
  excerpt: string;
  content: string;
  image_url: string | null;
  published_at: string;
  title_en: string | null;
  excerpt_en: string | null;
  content_en: string | null;
  title_de: string | null;
  excerpt_de: string | null;
  content_de: string | null;
};

async function fetchPost(slug: string): Promise<BlogPost | null> {
  const { data } = await supabase
    .from("blog_posts")
    .select("title, excerpt, content, image_url, published_at, title_en, excerpt_en, content_en, title_de, excerpt_de, content_de")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return data;
}

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => fetchPost(params.slug),
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Blog — Több mint angol" }, { name: "robots", content: "noindex" }] };
    }
    const url = `${SITE_URL}/blog/${params.slug}`;
    return {
      meta: [
        { title: `${loaderData.title} — Több mint angol` },
        { name: "description", content: loaderData.excerpt },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: loaderData.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(loaderData.image_url ? [{ property: "og:image", content: loaderData.image_url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: loaderData.title },
        { name: "twitter:description", content: loaderData.excerpt },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();
  const { lang } = useLanguage();
  const t = translations[lang];

  const title = post ? pickLocalized(post, "title", lang) : "";

  useEffect(() => {
    if (post) document.title = `${title} — Több mint angol`;
  }, [post, title]);

  if (!post) {
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
            {t.blog.back}
          </Link>
          <div className="mt-16 text-center">
            <h1 className="text-2xl font-semibold">{t.blog.notFoundTitle}</h1>
            <p className="mt-2 text-muted-foreground">{t.blog.notFoundBody}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </div>
    );
  }

  const content = pickLocalized(post, "content", lang);
  const html = marked.parse(content, { async: false });
  const dateLocale = lang === "hu" ? "hu-HU" : lang === "de" ? "de-DE" : "en-GB";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    ...(post.image_url ? { image: [post.image_url] } : {}),
    datePublished: post.published_at,
    author: { "@type": "Organization", name: "Több mint angol" },
    publisher: { "@type": "Organization", name: "Több mint angol" },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
          {t.blog.back}
        </Link>

        <article className="mt-8">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {new Date(post.published_at).toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" })}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {post.image_url && (
            <div className="mt-6 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-muted">
              <img src={post.image_url} alt={title} className="h-full w-full object-cover" />
            </div>
          )}
          <div
            className="mt-8 space-y-4 leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </div>

      <LanguageSwitcher />
    </div>
  );
}
