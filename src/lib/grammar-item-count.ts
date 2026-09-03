// Shared client+server constant: how many items a Grammar Test run can have.
// Lives outside grammar-blueprint.server.ts so the client (the item-count
// picker on the intake form) can import it without pulling in server code.
export const GRAMMAR_ITEM_COUNTS = [10, 20, 30] as const;
export type GrammarItemCount = (typeof GRAMMAR_ITEM_COUNTS)[number];
export const DEFAULT_GRAMMAR_ITEM_COUNT: GrammarItemCount = 10;

export function isGrammarItemCount(x: unknown): x is GrammarItemCount {
  return GRAMMAR_ITEM_COUNTS.includes(x as GrammarItemCount);
}
