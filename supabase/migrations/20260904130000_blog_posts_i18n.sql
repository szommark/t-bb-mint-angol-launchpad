-- Add optional EN/DE translations for blog posts. The existing unsuffixed
-- columns (title/excerpt/content) remain the Hungarian/base version, matching
-- the existing data and the site's default language — mirrors the
-- explanation/explanation_hu pattern used for grammar_questions.
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS excerpt_en text,
  ADD COLUMN IF NOT EXISTS content_en text,
  ADD COLUMN IF NOT EXISTS title_de text,
  ADD COLUMN IF NOT EXISTS excerpt_de text,
  ADD COLUMN IF NOT EXISTS content_de text;
