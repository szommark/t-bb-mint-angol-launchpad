// Converts clipboard HTML from Word, Google Docs or web pages into clean blog Markdown, keeping
// headings, bold, italics, lists, links and paragraphs and dropping everything else (Word's
// hidden styling, fonts, colours). Browser-only: it relies on DOMParser.

type Emphasis = { bold: boolean; italic: boolean };

const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "dd", "div", "dl", "dt", "figcaption", "figure", "footer",
  "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section", "table", "ul",
]);
const DROP_TAGS = "script, style, meta, link, title, head, template, noscript, svg, img, video, audio, iframe, object, xml";

// Markdown the user copied as source text (from an editor, a .md file) must not be re-escaped.
const LOOKS_LIKE_MARKDOWN = /^(#{1,6}\s|\s*[-*+]\s|\s*\d+\.\s|>\s)|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/m;

export function shouldConvertPastedHtml(html: string, plain: string) {
  if (!html || !/<(p|h[1-6]|li|b|strong|i|em|br|div|span|a|table)\b/i.test(html)) return false;
  return !LOOKS_LIKE_MARKDOWN.test(plain);
}

function styleOf(el: Element) {
  return (el.getAttribute("style") ?? "").toLowerCase().replace(/\s+/g, "");
}

function isWordListMarker(el: Element) {
  return /mso-list:ignore/.test(styleOf(el));
}

function escapeText(text: string) {
  return text.replace(/([\\`*_[\]])/g, "\\$1");
}

function wrap(text: string, marker: string) {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!m || !m[2]) return text;
  return `${m[1]}${marker}${m[2]}${marker}${m[3]}`;
}

function inline(node: Node, em: Emphasis): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeText((node.textContent ?? "").replace(/\s+/g, " "));
  if (!(node instanceof Element) || isWordListMarker(node)) return "";

  const tag = node.tagName.toLowerCase();
  if (tag === "br") return "\n";

  const style = styleOf(node);
  const unbold = /font-weight:(normal|[1-4]00)/.test(style);
  const bold = !em.bold && !unbold && (tag === "b" || tag === "strong" || /font-weight:(bold|[6-9]00)/.test(style));
  const italic = !em.italic && (tag === "i" || tag === "em" || /font-style:italic/.test(style));
  const inner = { bold: (em.bold || bold) && !unbold, italic: em.italic || italic };

  if (tag === "code") return `\`${(node.textContent ?? "").replace(/`/g, "")}\``;

  let text = Array.from(node.childNodes).map((c) => inline(c, inner)).join("");
  if (tag === "a") {
    const href = node.getAttribute("href")?.trim();
    if (href && /^(https?:|mailto:|tel:)/i.test(href) && text.trim()) text = `[${text.trim()}](${href})`;
  }
  if (italic) text = wrap(text, "*");
  if (bold) text = wrap(text, "**");
  return text;
}

function cleanInline(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    // Word often splits one bold run into several adjacent ones.
    .replace(/\*\*(\s*)\*\*/g, "$1")
    .trim();
}

// Paragraph text starting with "- ", "1. " or "#" would turn into Markdown structure.
function escapeBlockStart(text: string) {
  return text.replace(/^(#{1,6}\s|[-+]\s|>)/, "\\$1").replace(/^(\d+)([.)]\s)/, "$1\\$2");
}

function paragraph(el: Element) {
  const text = cleanInline(Array.from(el.childNodes).map((c) => inline(c, { bold: false, italic: false })).join(""));
  if (!text) return "";
  // A short paragraph that is bold from start to end is how most people make subheadings in Word.
  const allBold = text.match(/^\*\*([^*\n]+)\*\*$/);
  if (allBold && allBold[1].length <= 80) return `## ${allBold[1]}`;
  return escapeBlockStart(text);
}

function listToMarkdown(list: Element, depth: number): string {
  const ordered = list.tagName.toLowerCase() === "ol";
  const indent = "    ".repeat(depth);
  const lines: string[] = [];
  for (const li of Array.from(list.children)) {
    if (li.tagName.toLowerCase() !== "li") continue;
    const nested: string[] = [];
    const parts: string[] = [];
    for (const child of Array.from(li.childNodes)) {
      if (child instanceof Element && /^(ul|ol)$/i.test(child.tagName)) nested.push(listToMarkdown(child, depth + 1));
      else parts.push(inline(child, { bold: false, italic: false }));
    }
    const text = cleanInline(parts.join(" ")).replace(/\n/g, " ");
    if (text) lines.push(`${indent}${ordered ? "1." : "-"} ${text}`);
    lines.push(...nested.filter(Boolean));
  }
  return lines.join("\n");
}

function wordListItem(p: Element) {
  const level = Number(styleOf(p).match(/level(\d+)/)?.[1] ?? 1);
  const marker = Array.from(p.querySelectorAll("span")).find(isWordListMarker)?.textContent?.trim() ?? "";
  const ordered = /^(\d+|[a-z]|[ivxlc]+)[.)]/i.test(marker);
  const text = cleanInline(Array.from(p.childNodes).map((c) => inline(c, { bold: false, italic: false })).join("")).replace(/\n/g, " ");
  return text ? `${"    ".repeat(Math.max(0, level - 1))}${ordered ? "1." : "-"} ${text}` : "";
}

function hasBlockChildren(el: Element) {
  return Array.from(el.children).some((c) => BLOCK_TAGS.has(c.tagName.toLowerCase()));
}

function convertBlocks(parent: Element, out: string[]) {
  let inlineBuffer = "";
  let wordList: string[] = [];
  let wordListId = "";

  const flushInline = () => {
    const text = cleanInline(inlineBuffer);
    if (text) out.push(escapeBlockStart(text));
    inlineBuffer = "";
  };
  const flushWordList = () => {
    if (wordList.length) out.push(wordList.join("\n"));
    wordList = [];
  };

  for (const child of Array.from(parent.childNodes)) {
    const isBlock = child instanceof Element && BLOCK_TAGS.has(child.tagName.toLowerCase());
    // Google Docs wraps the whole document in an inline <b>; look inside wrappers like that.
    if (child instanceof Element && !isBlock && hasBlockChildren(child)) {
      flushInline();
      flushWordList();
      convertBlocks(child, out);
      continue;
    }
    if (!isBlock) {
      inlineBuffer += inline(child, { bold: false, italic: false });
      continue;
    }
    flushInline();

    const tag = child.tagName.toLowerCase();
    const wordListMatch = tag === "p" ? styleOf(child).match(/mso-list:(l\d+)/) : null;
    if (wordListMatch) {
      // Each Word list has its own id (l0, l1, ...); a new id starts a separate list.
      if (wordListMatch[1] !== wordListId) flushWordList();
      wordListId = wordListMatch[1];
      const item = wordListItem(child);
      if (item) wordList.push(item);
      continue;
    }
    flushWordList();

    if (/^h[1-6]$/.test(tag)) {
      const text = cleanInline(inline(child, { bold: true, italic: false })).replace(/\n/g, " ");
      if (text) out.push(`${Number(tag[1]) <= 2 ? "##" : "###"} ${text}`);
    } else if (tag === "ul" || tag === "ol") {
      const list = listToMarkdown(child, 0);
      if (list) out.push(list);
    } else if (tag === "blockquote") {
      const inner: string[] = [];
      convertBlocks(child, inner);
      if (inner.length) out.push(inner.join("\n\n").split("\n").map((l) => (l ? `> ${l}` : ">")).join("\n"));
    } else if (tag === "pre") {
      out.push(`\`\`\`\n${(child.textContent ?? "").replace(/\n$/, "")}\n\`\`\``);
    } else if (tag === "hr") {
      out.push("---");
    } else if (tag === "table") {
      for (const row of Array.from(child.querySelectorAll("tr"))) {
        const cells = Array.from(row.children).map((cell) => cleanInline(inline(cell, { bold: false, italic: false })).replace(/\n/g, " ")).filter(Boolean);
        if (cells.length) out.push(escapeBlockStart(cells.join(" – ")));
      }
    } else if (hasBlockChildren(child)) {
      convertBlocks(child, out);
    } else {
      const cls = child.getAttribute("class") ?? "";
      const text = paragraph(child);
      if (!text) continue;
      if (/MsoTitle/i.test(cls)) out.push(`## ${text.replace(/^## /, "")}`);
      else if (/MsoSubtitle/i.test(cls)) out.push(`### ${text.replace(/^## /, "")}`);
      else out.push(text);
    }
  }
  flushInline();
  flushWordList();
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll(DROP_TAGS).forEach((n) => n.remove());
  // Word's namespaced elements such as <o:p> carry no content worth keeping.
  doc.querySelectorAll("*").forEach((n) => {
    if (n.tagName.includes(":")) n.replaceWith(...Array.from(n.childNodes));
  });

  const out: string[] = [];
  convertBlocks(doc.body, out);
  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
