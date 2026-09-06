-- Storage bucket for blog post images, uploaded from the admin blog editor.
-- Uploads go through the service-role client in a server function (gated by
-- requireAdmin), so no anon/authenticated write policy is needed. The bucket
-- is public so images are readable at their public URL without auth.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
