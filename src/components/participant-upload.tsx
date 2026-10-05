import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminImportCourseParticipants } from "@/lib/courses.functions";
import {
  parseParticipantSheet,
  type ParsedParticipantRow,
  type ParticipantRowError,
} from "@/lib/participant-import";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, FileSpreadsheet, Loader2, Upload } from "lucide-react";

type Preview = { fileName: string; records: ParsedParticipantRow[]; errors: ParticipantRowError[] };

export function ParticipantUpload({
  courseId,
  onImported,
}: {
  courseId: string;
  onImported: () => void;
}) {
  const importParticipants = useServerFn(adminImportCourseParticipants);
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    try {
      const { readSheet } = await import("read-excel-file/universal");
      const rows = await readSheet(file, 1);
      const result = parseParticipantSheet(rows as unknown[][]);
      setPreview({ fileName: file.name, ...result });
    } catch (e) {
      toast.error(
        e instanceof Error ? `Could not read the file: ${e.message}` : "Could not read the file.",
      );
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onImport = async () => {
    if (!preview || preview.records.length === 0) return;
    setImporting(true);
    try {
      const result = await importParticipants({
        data: { courseId, records: preview.records.map((r) => r.record) },
      });
      const notes = [`${result.imported} participant${result.imported === 1 ? "" : "s"} imported.`];
      if (result.addedToRoster > 0)
        notes.push(`${result.addedToRoster} existing account(s) are on the roster.`);
      if (result.otherCompanyAccounts > 0) {
        notes.push(
          `${result.otherCompanyAccounts} account(s) belong to another company and were not added to the roster.`,
        );
      }
      toast.success(notes.join(" "));
      setPreview(null);
      onImported();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not import participants.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={reading}
      >
        {reading ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-1.5 h-4 w-4" />
        )}
        Upload participants
      </Button>

      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open && !importing) setPreview(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> {preview?.fileName}
            </DialogTitle>
            <DialogDescription>
              {preview?.records.length ?? 0} valid row(s) found. Existing participants with the same
              email are updated.
            </DialogDescription>
          </DialogHeader>

          {preview && preview.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{preview.errors.length} row(s) can't be imported</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs">
                  {preview.errors.map((err) => (
                    <li key={err.row}>
                      {err.row > 0 ? `Row ${err.row}: ` : ""}
                      {err.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {preview && preview.records.length > 0 && (
            <div className="max-h-80 overflow-y-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Birth date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.records.map(({ row, record }) => (
                    <TableRow key={row}>
                      <TableCell className="text-muted-foreground">{row}</TableCell>
                      <TableCell className="font-medium">{record.currentName}</TableCell>
                      <TableCell className="text-muted-foreground">{record.email}</TableCell>
                      <TableCell className="text-muted-foreground">{record.birthDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={onImport}
              disabled={importing || !preview || preview.records.length === 0}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Import ${preview?.records.length ?? 0} participant(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
