import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListUsers, adminSetUserCompany } from "@/lib/admin.functions";
import { adminListCompanies } from "@/lib/companies.functions";
import { adminListParticipants } from "@/lib/courses.functions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

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
type Participant = Awaited<ReturnType<typeof adminListParticipants>>[number];

const NONE = "__none__";
const ALL = "__all__";

function matchesSearch(query: string, ...fields: (string | null | undefined)[]) {
  const q = query.trim().toLowerCase();
  return !q || fields.some((f) => f?.toLowerCase().includes(q));
}

function AdminUsersPage() {
  const listUsers = useServerFn(adminListUsers);
  const listCompanies = useServerFn(adminListCompanies);
  const listParticipants = useServerFn(adminListParticipants);
  const setUserCompany = useServerFn(adminSetUserCompany);

  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(ALL);
  const [companyFilter, setCompanyFilter] = useState(ALL);
  const [participantSearch, setParticipantSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState(ALL);
  const [accountFilter, setAccountFilter] = useState(ALL);

  const load = async () => {
    setLoading(true);
    try {
      const [u, c, p] = await Promise.all([listUsers(), listCompanies(), listParticipants()]);
      setUsers(u as User[]);
      setCompanies(c as Company[]);
      setParticipants(p);
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

  const participantEmails = useMemo(() => new Set(participants.map((p) => p.email)), [participants]);

  const courses = useMemo(() => {
    const byId = new Map<string, string>();
    for (const p of participants) for (const c of p.courses) byId.set(c.id, c.name);
    return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "hu"));
  }, [participants]);

  const filteredUsers = users.filter((u) => {
    if (!matchesSearch(userSearch, u.name, u.email, u.companyName)) return false;
    if (roleFilter === "admin" && !u.isAdmin) return false;
    if (roleFilter === "teacher" && !u.isTeacher) return false;
    if (roleFilter === "participant" && !participantEmails.has(u.email.toLowerCase())) return false;
    if (companyFilter === NONE && u.companyId) return false;
    if (companyFilter !== ALL && companyFilter !== NONE && u.companyId !== companyFilter) return false;
    return true;
  });

  const filteredParticipants = participants.filter((p) => {
    if (!matchesSearch(participantSearch, p.name, p.email, ...p.courses.map((c) => c.name))) return false;
    if (courseFilter !== ALL && !p.courses.some((c) => c.id === courseFilter)) return false;
    if (accountFilter === "with" && !p.hasAccount) return false;
    if (accountFilter === "without" && p.hasAccount) return false;
    return true;
  });

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
      <h1 className="text-2xl font-semibold tracking-tight">Users & participants</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Users are people with an account. Participants are people uploaded to a course from the participant spreadsheet,
        whether or not they have an account.
      </p>

      {loading ? (
        <div className="mt-6 flex justify-center rounded-xl border border-border p-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="users" className="mt-6">
          <TabsList>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="participants">Participants ({participants.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <SearchInput value={userSearch} onChange={setUserSearch} placeholder="Search name, email, company..." />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All roles</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="participant">Course participants</SelectItem>
                </SelectContent>
              </Select>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All companies</SelectItem>
                  <SelectItem value={NONE}>No company</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border">
              {filteredUsers.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">
                  {users.length === 0 ? "No users yet." : "No users match these filters."}
                </p>
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
                    {filteredUsers.map((u) => (
                      <TableRow key={u.userId}>
                        <TableCell className="font-medium">{u.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.isAdmin && <Badge variant="default">Admin</Badge>}
                            {u.isTeacher && <Badge variant="secondary">Teacher</Badge>}
                            {participantEmails.has(u.email.toLowerCase()) && <Badge variant="outline">Participant</Badge>}
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
          </TabsContent>

          <TabsContent value="participants" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <SearchInput value={participantSearch} onChange={setParticipantSearch} placeholder="Search name, email, course..." />
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any account status</SelectItem>
                  <SelectItem value="with">Has account</SelectItem>
                  <SelectItem value="without">No account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border">
              {filteredParticipants.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">
                  {participants.length === 0
                    ? "No participants uploaded yet. Upload a participant spreadsheet on a course page."
                    : "No participants match these filters."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Born</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Account</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParticipants.map((p) => (
                      <TableRow key={p.email}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.email}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {p.birthPlace}
                          <div className="text-xs">{p.birthDate}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {p.courses.map((c) => (
                              <Link
                                key={c.id}
                                to="/admin/courses/$courseId"
                                params={{ courseId: c.id }}
                                className="text-sm hover:underline"
                              >
                                {c.name}
                                {c.companyName && <span className="text-muted-foreground"> · {c.companyName}</span>}
                              </Link>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.hasAccount ? (
                            <Badge variant="secondary">Account</Badge>
                          ) : (
                            <Badge variant="outline">No account</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-56 flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" />
    </div>
  );
}
