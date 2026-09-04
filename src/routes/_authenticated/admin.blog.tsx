import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListBlogPosts, adminDeleteBlogPost } from "@/lib/blog.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  component: AdminBlogPage,
});

type AdminPost = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  published_at: string;
};

function AdminBlogPage() {
  const listPosts = useServerFn(adminListBlogPosts);
  const deletePost = useServerFn(adminDeleteBlogPost);

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listPosts();
        setPosts(data as AdminPost[]);
      } catch {
        toast.error("Nem sikerült betölteni a bejegyzéseket.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deletePost({ data: { id } });
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Bejegyzés törölve.");
    } catch {
      toast.error("A törlés nem sikerült.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Blog bejegyzések</h1>
        <Link to="/admin/blog/$postId" params={{ postId: "new" }}>
          <Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> Új bejegyzés</Button>
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-border">
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Még nincs bejegyzés.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cím</TableHead>
                <TableHead>Állapot</TableHead>
                <TableHead>Dátum</TableHead>
                <TableHead className="text-right">Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>
                    <Badge variant={post.published ? "default" : "secondary"}>
                      {post.published ? "Publikálva" : "Vázlat"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(post.published_at).toLocaleDateString("hu-HU")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link to="/admin/blog/$postId" params={{ postId: post.id }}>
                        <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={deletingId === post.id}>
                            {deletingId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
                            <AlertDialogDescription>
                              „{post.title}” véglegesen törlődik. Ez nem vonható vissza.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Mégse</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(post.id)}>Törlés</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
