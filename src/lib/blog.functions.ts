import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin.functions";

export const adminListBlogPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: posts, error } = await supabaseAdmin
      .from("blog_posts")
      .select("id, slug, title, excerpt, content, title_en, excerpt_en, content_en, title_de, excerpt_de, content_de, image_url, published, published_at, created_at, updated_at")
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return posts;
  });

const SaveBlogPostSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().min(1).max(500),
  content: z.string().trim().min(1),
  title_en: z.string().trim().max(200).nullable().optional(),
  excerpt_en: z.string().trim().max(500).nullable().optional(),
  content_en: z.string().trim().nullable().optional(),
  title_de: z.string().trim().max(200).nullable().optional(),
  excerpt_de: z.string().trim().max(500).nullable().optional(),
  content_de: z.string().trim().nullable().optional(),
  image_url: z.string().trim().max(500).nullable().optional(),
  published: z.boolean(),
  published_at: z.string().optional(),
});

export const adminSaveBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof SaveBlogPostSchema>) => SaveBlogPostSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      title_en: data.title_en || null,
      excerpt_en: data.excerpt_en || null,
      content_en: data.content_en || null,
      title_de: data.title_de || null,
      excerpt_de: data.excerpt_de || null,
      content_de: data.content_de || null,
      image_url: data.image_url || null,
      published: data.published,
      ...(data.published_at ? { published_at: data.published_at } : {}),
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("blog_posts").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("blog_posts")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: inserted.id as string };
  });

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const adminUploadBlogImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Hiányzik a fájl.");
    return { file };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const { file } = data;
    const extension = ALLOWED_IMAGE_TYPES[file.type];
    if (!extension) throw new Error("Csak JPG, PNG, WEBP vagy GIF kép tölthető fel.");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("A kép mérete legfeljebb 5 MB lehet.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("blog-images")
      .upload(path, file, { contentType: file.type });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrl } = supabaseAdmin.storage.from("blog-images").getPublicUrl(path);
    return { ok: true as const, url: publicUrl.publicUrl };
  });

const DeleteBlogPostSchema = z.object({ id: z.string().uuid() });

export const adminDeleteBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof DeleteBlogPostSchema>) => DeleteBlogPostSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
