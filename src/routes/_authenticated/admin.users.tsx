import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListUsers, adminSetUserCompany } from "@/lib/admin.functions";
import { adminListCompanies } from "@/lib/companies.functions";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

type User = {
  userId: string;
  name: string;
  email: string;
  isTeacher: boolean;
  isAdmin: boolean;
  companyId: string | null;
  companyName: string | null;
};
type Company = { id: string; company_name: string };

const NONE = "__none__";

function AdminUsersPage() {
  const listUsers = useServerFn(adminListUsers);
  const listCompanies = useServerFn(adminListCompanies);
  const setUserCompany = useServerFn(adminSetUserCompany);

  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([listUsers(), listCompanies()]);
      setUsers(u as User[]);
      setCompanies(c as Company[]);
    } catch {
      toast.error("Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeCompany = async (userId: string, value: string) => {
    const companyId = value === NONE ? null : value;
    setSavingId(userId);
    try {
      const res = await setUserCompany({ data: { userId, companyId } });
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === userId
            ? { ...u, companyId, companyName: companies.find((c) => c.id === companyId)?.company_name ?? null }
            : u,
        ),
      );
      if (res.removedCourseNames.length > 0) {
        toast.success(`Removed from ${res.removedCourseNames.length} course(s) that belonged to the old company.`);
      } else {
        toast.success("Company updated.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update company.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Assign a company to a user before they can be added to that company's courses.
      </p>

      <div className="mt-6 rounded-xl border border-border">
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Company</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.userId}>
                  <TableCell className="font-medium">{u.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {u.isAdmin && <Badge variant="default">Admin</Badge>}
                      {u.isTeacher && <Badge variant="secondary">Teacher</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.companyId ?? NONE}
                      onValueChange={(value) => onChangeCompany(u.userId, value)}
                      disabled={savingId === u.userId}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="No company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>No company</SelectItem>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
