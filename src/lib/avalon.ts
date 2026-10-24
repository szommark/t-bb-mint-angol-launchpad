// The AVaLoN brand: every mention on the site is shown as the coloured wordmark (navy, with a gold
// "a" and "o", as in the logo) and every "avln.hu" becomes a link to the platform.

export const AVALON_URL = "https://avln.hu";

// Splits text into brand mentions and the text between them (capturing group keeps the mentions).
export const BRAND_SPLIT = /\b(avalon|avln\.hu)\b/i;

export function isAvalonMention(part: string) {
  return /^avalon$/i.test(part);
}

export function isAvlnDomain(part: string) {
  return /^avln\.hu$/i.test(part);
}

const WORDMARK_HTML =
  '<span class="avalon-wordmark">AV<span class="avalon-accent">a</span>L<span class="avalon-accent">o</span>N</span>';

const LINK_ATTRS = `href="${AVALON_URL}" target="_blank" rel="noopener noreferrer" class="avalon-link"`;

// Applies the brand styling to rendered HTML, touching only text between tags and never nesting a
// link inside an existing one.
export function brandHtml(html: string): string {
  let linkDepth = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((segment) => {
      if (segment.startsWith("<")) {
        if (/^<a[\s>]/i.test(segment)) linkDepth++;
        else if (/^<\/a>/i.test(segment)) linkDepth = Math.max(0, linkDepth - 1);
        return segment;
      }
      return segment
        .split(BRAND_SPLIT)
        .map((part) => {
          if (isAvalonMention(part)) return WORDMARK_HTML;
          if (isAvlnDomain(part)) return linkDepth ? part : `<a ${LINK_ATTRS}>${part}</a>`;
          return part;
        })
        .join("");
    })
    .join("");
}
