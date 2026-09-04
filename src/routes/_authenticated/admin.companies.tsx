import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListCompanies,
  adminCreateCompany,
  adminUpdateCompany,
  adminDeleteCompany,
} from "@/lib/companies.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/companies")({
  component: AdminCompaniesPage,
});

type Company = { id: string; company_name: string };

function AdminCompaniesPage() {
  const listCompanies = useServerFn(adminListCompanies);
  const createCompany = useServerFn(adminCreateCompany);
  const updateCompany = useServerFn(adminUpdateCompany);
  const deleteCompany = useServerFn(adminDeleteCompany);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listCompanies();
      setCompanies(data as Company[]);
    } catch {
      toast.error("Could not load companies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCompany({ data: { companyName: newName.trim() } });
      setNewName("");
      await load();
      toast.success("Company created.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create company.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (c: Company) => {
    setEditingId(c.id);
    setEditingName(c.company_name);
  };

  const onSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await updateCompany({ data: { id, companyName: editingName.trim() } });
      setEditingId(null);
      await load();
      toast.success("Company updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update company.");
    }
  };

  const onDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCompany({ data: { id } });
      await load();
      toast.success("Company deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete company.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
      </div>

      <div className="mt-6 flex gap-2">
        <Input
          placeholder="New company name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCreate()}
        />
        <Button onClick={onCreate} disabled={creating || !newName.trim()}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          Add
        </Button>
      </div>

      <div className="mt-6 rounded-xl border border-border">
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : companies.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No companies yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {editingId === c.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onSaveEdit(c.id)}
                        autoFocus
                      />
                    ) : (
                      <button className="text-left hover:underline" onClick={() => startEdit(c)}>
                        {c.company_name}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {editingId === c.id ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => onSaveEdit(c.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={deletingId === c.id}>
                              {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this company?</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{c.company_name}" will be permanently deleted. Users assigned to it will have their
                                company cleared. This fails if the company still has any courses.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDelete(c.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
