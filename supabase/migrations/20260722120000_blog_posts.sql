-- Simple blog engine: posts are written through the password-gated /admin
-- panel (server-side check against BLOG_ADMIN_PASSWORD, using the
-- service-role client), and read publicly by anyone when published.
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  image_url text,
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at DESC);

GRANT ALL ON public.blog_posts TO service_role;
GRANT SELECT ON public.blog_posts TO anon, authenticated;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published posts" ON public.blog_posts
  FOR SELECT TO anon, authenticated USING (published = true);

-- No anon/authenticated write policy: all writes go through the
-- service-role client from server functions, gated by BLOG_ADMIN_PASSWORD.

CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
