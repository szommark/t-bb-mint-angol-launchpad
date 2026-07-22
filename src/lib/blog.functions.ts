import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function assertAdminPassword(password: string) {
  const expected = process.env.BLOG_ADMIN_PASSWORD;
  if (!expected || password !== expected) {
    throw new Error("Unauthorized");
  }
}

const PasswordSchema = z.object({ password: z.string().min(1) });

export const verifyBlogAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((input: z.infer<typeof PasswordSchema>) => PasswordSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdminPassword(data.password);
    return { ok: true as const };
  });

export const adminListBlogPosts = createServerFn({ method: "POST" })
  .inputValidator((input: z.infer<typeof PasswordSchema>) => PasswordSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdminPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: posts, error } = await supabaseAdmin
      .from("blog_posts")
      .select("id, slug, title, excerpt, content, image_url, published, published_at, created_at, updated_at")
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return posts;
  });

const SaveBlogPostSchema = z.object({
  password: z.string().min(1),
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
  image_url: z.string().trim().max(500).nullable().optional(),
  published: z.boolean(),
  published_at: z.string().optional(),
});

export const adminSaveBlogPost = createServerFn({ method: "POST" })
  .inputValidator((input: z.infer<typeof SaveBlogPostSchema>) => SaveBlogPostSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdminPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
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

const DeleteBlogPostSchema = z.object({ password: z.string().min(1), id: z.string().uuid() });

export const adminDeleteBlogPost = createServerFn({ method: "POST" })
  .inputValidator((input: z.infer<typeof DeleteBlogPostSchema>) => DeleteBlogPostSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdminPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
