import { useState } from "react";
import { toast } from "sonner";
import { BlogContent } from "@/components/BlogContent";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizeBlogMarkdown } from "@/lib/blog-format";
import { htmlToMarkdown, shouldConvertPastedHtml } from "@/lib/blog-paste";
import { cn } from "@/lib/utils";

type Mode = "edit" | "preview";

// Inserts text at the cursor through the browser's own editing command, so Ctrl+Z still works.
function insertAtCursor(textarea: HTMLTextAreaElement, text: string, onChange: (value: string) => void) {
  textarea.focus();
  if (document.execCommand("insertText", false, text)) return;
  const { selectionStart, selectionEnd, value } = textarea;
  onChange(value.slice(0, selectionStart) + text + value.slice(selectionEnd));
  requestAnimationFrame(() => textarea.setSelectionRange(selectionStart + text.length, selectionStart + text.length));
}

export function BlogContentField({ id, label, value, onChange }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("edit");

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    let markdown: string | null = null;
    if (shouldConvertPastedHtml(html, plain)) markdown = htmlToMarkdown(html);
    else if (plain.includes("\n")) markdown = normalizeBlogMarkdown(plain);
    if (!markdown || markdown === plain) return;

    e.preventDefault();
    insertAtCursor(e.currentTarget, markdown, onChange);
    toast.success("Beillesztve, a formázás megmaradt. Ellenőrizd az Előnézetben.");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <div className="inline-flex rounded-md border border-border p-0.5 text-xs" role="tablist">
          {(["edit", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded px-2.5 py-1 font-medium transition-colors",
                mode === m ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "edit" ? "Szerkesztés" : "Előnézet"}
            </button>
          ))}
        </div>
      </div>
      {mode === "edit" ? (
        <Textarea
          id={id}
          rows={16}
          className="font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
        />
      ) : (
        <div className="max-h-[36rem] min-h-[22rem] overflow-y-auto rounded-md border border-border bg-background px-5 py-4">
          {value.trim() ? (
            <BlogContent markdown={value} />
          ) : (
            <p className="text-sm text-muted-foreground">Még nincs tartalom.</p>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Wordből vagy Google Docsból is beilleszthetsz: a címsorok, felsorolások, félkövér és dőlt szöveg megmarad.
      </p>
    </div>
  );
}
