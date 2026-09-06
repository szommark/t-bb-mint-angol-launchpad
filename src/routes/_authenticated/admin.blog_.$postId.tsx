import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListBlogPosts, adminSaveBlogPost, adminUploadBlogImage } from "@/lib/blog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const Route = createFileRoute("/_authenticated/admin/blog_/$postId")({
  component: AdminPostEditor,
});

function stripDiacritics(input: string) {
  let result = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x0300 || code > 0x036f) result += ch;
  }
  return result;
}

function slugify(input: string) {
  return stripDiacritics(input.trim().toLowerCase().normalize("NFD"))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type LangTab = "hu" | "en" | "de";

const LANG_TAB_LABEL: Record<LangTab, string> = {
  hu: "HU (alap)",
  en: "EN",
  de: "DE",
};

function AdminPostEditor() {
  const { postId } = Route.useParams();
  const navigate = useNavigate();
  const isNew = postId === "new";
  const listPosts = useServerFn(adminListBlogPosts);
  const savePost = useServerFn(adminSaveBlogPost);
  const uploadImage = useServerFn(adminUploadBlogImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [activeTab, setActiveTab] = useState<LangTab>("hu");

  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(true);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [excerptEn, setExcerptEn] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [titleDe, setTitleDe] = useState("");
  const [excerptDe, setExcerptDe] = useState("");
  const [contentDe, setContentDe] = useState("");

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const posts = await listPosts();
        const post = posts.find((p) => p.id === postId);
        if (!post) {
          toast.error("A bejegyzés nem található.");
          navigate({ to: "/admin/blog" });
          return;
        }
        setTitle(post.title);
        setSlug(post.slug);
        setExcerpt(post.excerpt);
        setContent(post.content);
        setTitleEn(post.title_en ?? "");
        setExcerptEn(post.excerpt_en ?? "");
        setContentEn(post.content_en ?? "");
        setTitleDe(post.title_de ?? "");
        setExcerptDe(post.excerpt_de ?? "");
        setContentDe(post.content_de ?? "");
        setImageUrl(post.image_url ?? "");
        setPublished(post.published);
      } catch {
        toast.error("Hiba történt a betöltéskor.");
        navigate({ to: "/admin/blog" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const onSave = async () => {
    if (!title.trim() || !slug.trim() || !excerpt.trim() || !content.trim()) {
      toast.error("Cím, szöveges rész, kivonat és tartalom kötelező (HU).");
      return;
    }
    setSaving(true);
    try {
      await savePost({
        data: {
          id: isNew ? undefined : postId,
          slug: slug.trim(),
          title: title.trim(),
          excerpt: excerpt.trim(),
          content: content.trim(),
          title_en: titleEn.trim() || null,
          excerpt_en: excerptEn.trim() || null,
          content_en: contentEn.trim() || null,
          title_de: titleDe.trim() || null,
          excerpt_de: excerptDe.trim() || null,
          content_de: contentDe.trim() || null,
          image_url: imageUrl.trim() || null,
          published,
        },
      });
      toast.success("Bejegyzés mentve.");
      navigate({ to: "/admin/blog" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "A mentés nem sikerült.");
    } finally {
      setSaving(false);
    }
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("Csak JPG, PNG, WEBP vagy GIF kép tölthető fel.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("A kép mérete legfeljebb 5 MB lehet.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadImage({ data: formData });
      setImageUrl(result.url);
      toast.success("Kép feltöltve.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "A feltöltés nem sikerült.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/admin/blog" className="text-sm text-muted-foreground hover:text-foreground">← Vissza a listához</Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {isNew ? "Új bejegyzés" : "Bejegyzés szerkesztése"}
      </h1>

      <div className="mt-8 space-y-5">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LangTab)}>
          <TabsList>
            <TabsTrigger value="hu">{LANG_TAB_LABEL.hu}</TabsTrigger>
            <TabsTrigger value="en">{LANG_TAB_LABEL.en}</TabsTrigger>
            <TabsTrigger value="de">{LANG_TAB_LABEL.de}</TabsTrigger>
          </TabsList>

          <TabsContent value="hu" className="space-y-5">
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
              <Label htmlFor="excerpt">Kivonat</Label>
              <Textarea id="excerpt" rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Tartalom (Markdown)</Label>
              <Textarea id="content" rows={16} className="font-mono text-sm" value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="en" className="space-y-5">
            <p className="text-xs text-muted-foreground">Opcionális. Ha üresen hagyod, a HU tartalom jelenik meg angol nyelvválasztás esetén is.</p>
            <div className="space-y-2">
              <Label htmlFor="title-en">Title</Label>
              <Input id="title-en" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt-en">Excerpt</Label>
              <Textarea id="excerpt-en" rows={3} value={excerptEn} onChange={(e) => setExcerptEn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content-en">Content (Markdown)</Label>
              <Textarea id="content-en" rows={16} className="font-mono text-sm" value={contentEn} onChange={(e) => setContentEn(e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="de" className="space-y-5">
            <p className="text-xs text-muted-foreground">Optional. Bleibt es leer, wird bei deutscher Sprachwahl der HU-Inhalt angezeigt.</p>
            <div className="space-y-2">
              <Label htmlFor="title-de">Titel</Label>
              <Input id="title-de" value={titleDe} onChange={(e) => setTitleDe(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt-de">Auszug</Label>
              <Textarea id="excerpt-de" rows={3} value={excerptDe} onChange={(e) => setExcerptDe(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content-de">Inhalt (Markdown)</Label>
              <Textarea id="content-de" rows={16} className="font-mono text-sm" value={contentDe} onChange={(e) => setContentDe(e.target.value)} />
            </div>
          </TabsContent>
        </Tabs>

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
          <Label htmlFor="image">Kép URL</Label>
          <div className="flex gap-2">
            <Input id="image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/blog/pelda.jpg" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onFileSelected}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="ml-1.5">Feltöltés</span>
            </Button>
          </div>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="mt-2 h-32 w-full rounded-md border border-border object-cover" />
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Switch id="published" checked={published} onCheckedChange={setPublished} />
          <Label htmlFor="published">Publikálva</Label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mentés"}
          </Button>
          <Link to="/admin/blog"><Button variant="outline" type="button">Mégse</Button></Link>
        </div>
      </div>
    </div>
  );
}
