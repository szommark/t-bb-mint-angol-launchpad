import { Fragment } from "react";
import { AVALON_URL, BRAND_SPLIT, isAvalonMention, isAvlnDomain } from "@/lib/avalon";

export function AvalonWordmark() {
  return (
    <span className="avalon-wordmark">
      AV<span className="avalon-accent">a</span>L<span className="avalon-accent">o</span>N
    </span>
  );
}

// Renders plain text with every AVaLoN mention as the wordmark and "avln.hu" as a link.
// Pass links={false} when the text already sits inside a link (a link may not contain another).
export function BrandText({ text, links = true }: { text: string; links?: boolean }) {
  return (
    <>
      {text.split(BRAND_SPLIT).map((part, i) => {
        if (isAvalonMention(part)) return <AvalonWordmark key={i} />;
        if (isAvlnDomain(part) && links) {
          return (
            <a key={i} href={AVALON_URL} target="_blank" rel="noopener noreferrer" className="avalon-link">
              {part}
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
