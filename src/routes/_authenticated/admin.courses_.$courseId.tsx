import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminGetCourse,
  adminSaveCourse,
  adminListEligibleParticipants,
  adminAddCourseParticipant,
  adminRemoveCourseParticipant,
} from "@/lib/courses.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/courses_/$courseId")({
  component: AdminCourseDetail,
});

type Participant = { userId: string; name: string; email: string; addedAt: string };
type EligibleUser = { userId: string; name: string; email: string };

function AdminCourseDetail() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const getCourse = useServerFn(adminGetCourse);
  const saveCourse = useServerFn(adminSaveCourse);
  const listEligible = useServerFn(adminListEligibleParticipants);
  const addParticipant = useServerFn(adminAddCourseParticipant);
  const removeParticipant = useServerFn(adminRemoveCourseParticipant);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [eligible, setEligible] = useState<EligibleUser[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const course = await getCourse({ data: { courseId } });
      setCompanyId(course.companyId);
      setCompanyName(course.companyName);
      setName(course.name);
      setDescription(course.description ?? "");
      setStartDate(course.startDate ?? "");
      setEndDate(course.endDate ?? "");
      setParticipants(course.participants);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load course.");
      navigate({ to: "/admin/courses" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const loadEligible = async () => {
    try {
      const data = await listEligible({ data: { courseId } });
      setEligible(data as EligibleUser[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load eligible users.");
    }
  };

  const onSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await saveCourse({
        data: {
          id: courseId,
          companyId,
          name: name.trim(),
          description: description.trim() || null,
          startDate: startDate || null,
          endDate: endDate || null,
        },
      });
      toast.success("Course saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save course.");
    } finally {
      setSaving(false);
    }
  };

  const onAdd = async (userId: string) => {
    setAddingId(userId);
    try {
      await addParticipant({ data: { courseId, participantId: userId } });
      setPickerOpen(false);
      await load();
      toast.success("Participant added.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add participant.");
    } finally {
      setAddingId(null);
    }
  };

  const onRemove = async (userId: string) => {
    setRemovingId(userId);
    try {
      await removeParticipant({ data: { courseId, participantId: userId } });
      setParticipants((prev) => prev.filter((p) => p.userId !== userId));
      toast.success("Participant removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove participant.");
    } finally {
      setRemovingId(null);
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
    <div className="space-y-8">
      <div>
        <Link to="/admin/courses" className="text-sm text-muted-foreground hover:text-foreground">← Back to courses</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{name}</h1>
        <p className="text-sm text-muted-foreground">Company: {companyName ?? "—"}</p>
      </div>

      <section className="rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold">Details</h2>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start">Start date</Label>
              <Input id="edit-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">End date</Label>
              <Input id="edit-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={onSave} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Roster</h2>
          <Popover open={pickerOpen} onOpenChange={(open) => { setPickerOpen(open); if (open) loadEligible(); }}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="mr-1.5 h-4 w-4" /> Add participant
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <Command>
                <CommandInput placeholder="Search users..." />
                <CommandList>
                  <CommandEmpty>
                    {companyName ? `No eligible users from ${companyName}.` : "No eligible users."}
                  </CommandEmpty>
                  <CommandGroup>
                    {eligible.map((u) => (
                      <CommandItem
                        key={u.userId}
                        value={`${u.name} ${u.email}`}
                        onSelect={() => onAdd(u.userId)}
                        disabled={addingId === u.userId}
                      >
                        <div className="flex flex-col">
                          <span>{u.name || "—"}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="mt-4">
          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No participants yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p) => (
                  <TableRow key={p.userId}>
                    <TableCell className="font-medium">{p.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(p.addedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={removingId === p.userId}>
                            {removingId === p.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove this participant?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {p.name || p.email} will be removed from this course's roster.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onRemove(p.userId)}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
