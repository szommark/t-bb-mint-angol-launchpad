import { Marked, type Tokens } from "marked";
import { brandHtml } from "@/lib/avalon";
import { SITE_URL } from "@/lib/site";

// Blog content is stored as Markdown, but posts pasted from Word or plain text often separate
// paragraphs with a single line break, which Markdown would merge into one block. This module
// turns such text into well-structured Markdown at render time, so stored posts never need to be
// rewritten, and renders it to HTML without letting raw HTML or unsafe links through.

type Unit =
  | { kind: "para"; text: string; block: number }
  | { kind: "list"; items: string[] }
  | { kind: "heading"; text: string }
  | { kind: "md"; lines: string[]; heading?: boolean };

const MD_HEADING = /^ {0,3}#{1,6}(\s|$)/;
const MD_HR = /^ {0,3}([-*_])(\s*\1){2,}\s*$/;
const MD_LIST_ITEM = /^\s*(?:[-*+]|\d{1,3}[.)])\s+/;
const MD_QUOTE = /^ {0,3}>/;
const MD_TABLE = /^ {0,3}\|/;
const FENCE = /^ {0,3}(```|~~~)/;
// Bullets people type or paste by hand. Dashes and ellipses also start ordinary sentences
// (dialogue, trailing thoughts), so they only count as a list when two or more lines in a row use them.
const STRONG_BULLET = /^\s*[•●▪◦·]\s*/;
const WEAK_BULLET = /^\s*[–—]\s+/;
const ELLIPSIS_START = /^\s*(?:\.{3}|…)(?=\S)/;
// A line that ends a sentence or clause; a line without one followed by a lowercase line is a hard wrap.
const SENTENCE_END = /[.!?:;…"”'’)\]»]$/;

const HEADING_MAX_CHARS = 70;
const AUTO_LIST_MIN_ITEMS = 3;
const AUTO_LIST_MAX_CHARS = 120;

function stripEmphasis(text: string) {
  const m = text.match(/^(\*\*|__)(.+)\1$/);
  return m ? m[2] : text;
}

function isHeadingCandidate(text: string, next: Unit) {
  const core = stripEmphasis(text);
  if (core.length > HEADING_MAX_CHARS) return false;
  if (!/^[\p{Lu}\d"„“'‘¿¡]/u.test(core)) return false;
  // A trailing period, comma or colon marks a sentence; a trailing ellipsis is a lead-in heading.
  if (/[.,;:]$/.test(core) && !/(\.\.\.|…)$/.test(core)) return false;
  if (next.kind === "para") return next.text.length > core.length * 1.5;
  return next.kind === "list";
}

function splitIntoUnits(chunk: string, blockOffset: number, units: Unit[]) {
  const blocks = chunk.split(/\n\s*\n/);
  blocks.forEach((block, b) => {
    const blockIndex = blockOffset + b;
    const lines = block.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim() !== "");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (MD_HEADING.test(line) || MD_HR.test(line)) {
        units.push({ kind: "md", lines: [line], heading: MD_HEADING.test(line) });
        i++;
        continue;
      }

      // Real Markdown lists, quotes and tables keep their single line breaks.
      const family = MD_LIST_ITEM.test(line) ? MD_LIST_ITEM : MD_QUOTE.test(line) ? MD_QUOTE : MD_TABLE.test(line) ? MD_TABLE : null;
      if (family) {
        const run: string[] = [];
        while (i < lines.length && (family.test(lines[i]) || (family === MD_LIST_ITEM && /^\s+\S/.test(lines[i])))) {
          run.push(lines[i]);
          i++;
        }
        units.push({ kind: "md", lines: run });
        continue;
      }

      const marker = STRONG_BULLET.test(line) ? STRONG_BULLET : WEAK_BULLET.test(line) ? WEAK_BULLET : ELLIPSIS_START.test(line) ? ELLIPSIS_START : null;
      if (marker) {
        let end = i;
        while (end < lines.length && marker.test(lines[end])) end++;
        if (marker === STRONG_BULLET || end - i >= 2) {
          const items = lines.slice(i, end).map((l) => (marker === ELLIPSIS_START ? l.trim() : l.replace(marker, "").trim()));
          units.push({ kind: "list", items });
          i = end;
          continue;
        }
      }

      const text = line.trim();
      const prev = units[units.length - 1];
      if (prev?.kind === "para" && prev.block === blockIndex && !SENTENCE_END.test(prev.text) && /^\p{Ll}/u.test(text)) {
        prev.text += ` ${text}`;
      } else {
        units.push({ kind: "para", text, block: blockIndex });
      }
      i++;
    }
  });
  return blockOffset + blocks.length;
}

// Three or more short, unpunctuated lines in a row ("Hampstead Heath – wild swimming") read as a list.
function detectLists(units: Unit[]): Unit[] {
  const out: Unit[] = [];
  let i = 0;
  while (i < units.length) {
    const u = units[i];
    const isShortLine = (x: Unit | undefined, block: number): x is Extract<Unit, { kind: "para" }> =>
      x?.kind === "para" && x.block === block && x.text.length <= AUTO_LIST_MAX_CHARS && !/[.!?:;]$/.test(x.text);
    if (u.kind === "para" && isShortLine(u, u.block)) {
      let end = i;
      while (end < units.length && isShortLine(units[end], u.block)) end++;
      if (end - i >= AUTO_LIST_MIN_ITEMS) {
        out.push({ kind: "list", items: units.slice(i, end).map((x) => (x as Extract<Unit, { kind: "para" }>).text) });
        i = end;
        continue;
      }
    }
    out.push(u);
    i++;
  }
  return out;
}

// A short line standing alone between paragraphs ("Why Not a Language School? Why a Club?") is a
// subheading. Skipped when the author already uses Markdown headings, so their choices win.
function detectHeadings(units: Unit[]) {
  if (units.some((u) => u.kind === "md" && u.heading)) return units;
  return units.map((u, i) => {
    const prev = units[i - 1];
    const next = units[i + 1];
    if (u.kind !== "para" || !prev || !next) return u;
    if (prev.kind !== "para" && prev.kind !== "list") return u;
    if (!isHeadingCandidate(u.text, next)) return u;
    return { kind: "heading", text: stripEmphasis(u.text) } satisfies Unit;
  });
}

// "2023. szeptember" at the start of a line must not become an ordered list starting at 2023.
function escapeLeadingNumber(text: string) {
  return text.replace(/^(\d{4,})\.(\s)/, "$1\\.$2");
}

function renderUnit(u: Unit) {
  switch (u.kind) {
    case "para": return escapeLeadingNumber(u.text);
    case "heading": return `## ${u.text}`;
    case "list": return u.items.map((item) => `- ${escapeLeadingNumber(item)}`).join("\n");
    case "md": return u.lines.join("\n");
  }
}

export function normalizeBlogMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const parts: string[] = [];
  let chunk: string[] = [];
  let blockOffset = 0;

  const flushChunk = () => {
    if (!chunk.length) return;
    const units: Unit[] = [];
    blockOffset = splitIntoUnits(chunk.join("\n"), blockOffset, units);
    parts.push(...detectHeadings(detectLists(units)).map(renderUnit));
    chunk = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const fence = lines[i].match(FENCE);
    if (!fence) {
      chunk.push(lines[i]);
      continue;
    }
    flushChunk();
    const code = [lines[i]];
    while (++i < lines.length) {
      code.push(lines[i]);
      if (lines[i].trim().startsWith(fence[1])) break;
    }
    parts.push(code.join("\n"));
  }
  flushChunk();

  return parts.join("\n\n");
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeUrl(href: string): string | null {
  const url = href.trim();
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null;
  return url;
}

function isExternal(href: string) {
  return /^https?:/i.test(href) && !href.startsWith(SITE_URL);
}

const blogMarked = new Marked({
  gfm: true,
  renderer: {
    // Raw HTML in a post is shown as text, never executed.
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }: Tokens.Link) {
      const inner = this.parser.parseInline(tokens);
      const url = safeUrl(href);
      if (!url) return inner;
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      const external = isExternal(url) ? ` target="_blank" rel="noopener noreferrer"` : "";
      return `<a href="${escapeHtml(url)}"${titleAttr}${external}>${inner}</a>`;
    },
    image({ href, title, text }: Tokens.Image) {
      const url = safeUrl(href);
      if (!url) return escapeHtml(text);
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy" />`;
    },
  },
});

export function renderBlogHtml(source: string): string {
  return brandHtml(blogMarked.parse(normalizeBlogMarkdown(source), { async: false }));
}
