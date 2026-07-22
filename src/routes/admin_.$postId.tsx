import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListBlogPosts, adminSaveBlogPost } from "@/lib/blog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin_/$postId")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: AdminPostEditor,
});

const STORAGE_KEY = "blogAdminPassword";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function AdminPostEditor() {
  const { postId } = Route.useParams();
  const navigate = useNavigate();
  const isNew = postId === "new";
  const listPosts = useServerFn(adminListBlogPosts);
  const savePost = useServerFn(adminSaveBlogPost);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(true);

  useEffect(() => {
    const pwd = sessionStorage.getItem(STORAGE_KEY);
    if (!pwd) {
      navigate({ to: "/admin" });
      return;
    }
    if (isNew) return;
    (async () => {
      try {
        const posts = await listPosts({ data: { password: pwd } });
        const post = posts.find((p) => p.id === postId);
        if (!post) {
          toast.error("A bejegyzés nem található.");
          navigate({ to: "/admin" });
          return;
        }
        setTitle(post.title);
        setSlug(post.slug);
        setExcerpt(post.excerpt);
        setContent(post.content);
        setImageUrl(post.image_url ?? "");
        setPublished(post.published);
      } catch {
        toast.error("Hiba történt a betöltéskor.");
        navigate({ to: "/admin" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const onSave = async () => {
    const pwd = sessionStorage.getItem(STORAGE_KEY);
    if (!pwd) { navigate({ to: "/admin" }); return; }
    if (!title.trim() || !slug.trim() || !excerpt.trim() || !content.trim()) {
      toast.error("Cím, szöveges rész, kivonat és tartalom kötelező.");
      return;
    }
    setSaving(true);
    try {
      await savePost({
        data: {
          password: pwd,
          id: isNew ? undefined : postId,
          slug: slug.trim(),
          title: title.trim(),
          excerpt: excerpt.trim(),
          content: content.trim(),
          image_url: imageUrl.trim() || null,
          published,
        },
      });
      toast.success("Bejegyzés mentve.");
      navigate({ to: "/admin" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "A mentés nem sikerült.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-5 py-12">
        <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Vissza a listához</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {isNew ? "Új bejegyzés" : "Bejegyzés szerkesztése"}
        </h1>

        <div className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Cím</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
            />
            <p className="text-xs text-muted-foreground">/blog/{slug || "..."}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Kivonat</Label>
            <Textarea id="excerpt" rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Kép URL</Label>
            <Input id="image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/blog/pelda.jpg" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Tartalom (Markdown)</Label>
            <Textarea id="content" rows={16} className="font-mono text-sm" value={content} onChange={(e) => setContent(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <Switch id="published" checked={published} onCheckedChange={setPublished} />
            <Label htmlFor="published">Publikálva</Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mentés"}
            </Button>
            <Link to="/admin"><Button variant="outline" type="button">Mégse</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
