import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyBlogAdminPassword, adminListBlogPosts, adminDeleteBlogPost } from "@/lib/blog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

const STORAGE_KEY = "blogAdminPassword";

type AdminPost = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  published_at: string;
};

function AdminPage() {
  const verify = useServerFn(verifyBlogAdminPassword);
  const listPosts = useServerFn(adminListBlogPosts);
  const deletePost = useServerFn(adminDeleteBlogPost);

  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPosts = async (pwd: string) => {
    setLoadingPosts(true);
    try {
      const data = await listPosts({ data: { password: pwd } });
      setPosts(data as AdminPost[]);
    } catch (e) {
      toast.error("Nem sikerült betölteni a bejegyzéseket.");
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setChecking(false);
      return;
    }
    (async () => {
      try {
        await verify({ data: { password: stored } });
        setAuthed(true);
        await loadPosts(stored);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      } finally {
        setChecking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoggingIn(true);
    try {
      await verify({ data: { password } });
      sessionStorage.setItem(STORAGE_KEY, password);
      setAuthed(true);
      await loadPosts(password);
    } catch {
      toast.error("Hibás jelszó.");
    } finally {
      setLoggingIn(false);
    }
  };

  const onLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
    setPosts([]);
    setPassword("");
  };

  const onDelete = async (id: string) => {
    const pwd = sessionStorage.getItem(STORAGE_KEY);
    if (!pwd) return;
    setDeletingId(id);
    try {
      await deletePost({ data: { password: pwd, id } });
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Bejegyzés törölve.");
    } catch {
      toast.error("A törlés nem sikerült.");
    } finally {
      setDeletingId(null);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <form onSubmit={onLogin} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Blog admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">Add meg a jelszót a belépéshez.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Jelszó</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={loggingIn}>
            {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Belépés"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Vissza a főoldalra</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Blog bejegyzések</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="mr-1.5 h-4 w-4" /> Kilépés
            </Button>
            <Link to="/admin/$postId" params={{ postId: "new" }}>
              <Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> Új bejegyzés</Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border">
          {loadingPosts ? (
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
                        <Link to="/admin/$postId" params={{ postId: post.id }}>
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
    </div>
  );
}
