// Adaptive engine for the standalone Grammar Test: a Seed -> Step -> Confirm
// staircase (CAT-lite, in the spirit of WIDA/DIALANG placement tests).
//
// Item 1 always seeds at B1. The middle ~70% of items zigzag +-1 CEFR level
// per answer (correct = up, incorrect = down) while tracking "reversals" --
// a fail immediately after a success, which is the signal that we've found
// the candidate's ceiling. Once we've seen 2 reversals (or 2 answers stuck
// against the A1 floor / C1 ceiling), the level freezes: any remaining
// step-phase items keep being served at that frozen level without moving
// further. The final ~30% of items are always the fixed Confirm phase,
// served at the frozen boundary level; their accuracy alone decides whether
// the candidate holds that level or gets bumped down one, so a single lucky
// guess or careless slip elsewhere in the test can't swing the final
// placement. Test length (10/20/30 items) only changes how many items each
// phase gets -- the proportions and logic stay the same.
import { computeByLevel, type StoredQuestion } from "@/lib/placement-review.server";
import type { GrammarItemCount } from "@/lib/grammar-item-count";
export { GRAMMAR_ITEM_COUNTS, isGrammarItemCount, type GrammarItemCount } from "@/lib/grammar-item-count";

export type GrammarLevel = "A1" | "A2" | "B1" | "B2" | "C1";

export const GRAMMAR_LEVELS: GrammarLevel[] = ["A1", "A2", "B1", "B2", "C1"];
export const GRAMMAR_LEVEL_INDEX: Record<GrammarLevel, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2: 3,
  C1: 4,
};

export const GRAMMAR_TAGS = [
  "tense_aspect",
  "conditionals",
  "modals",
  "articles",
  "prepositions",
  "passive_voice",
  "relative_clauses",
  "comparatives",
  "question_formation",
  "reported_speech",
] as const;
export type GrammarTag = (typeof GRAMMAR_TAGS)[number];

export const SEED_LEVEL: GrammarLevel = "B1";
export const GRAMMAR_TOTAL_PLANNED = 10;

// The last ~30% of the test is always the fixed Confirm phase (3 of 10, 6 of
// 20, 9 of 30); everything before that is seed+step.
const CONFIRM_PHASE_SHARE = 0.3;
function stepPhaseLastIndex(totalPlanned: number): number {
  return totalPlanned - Math.round(totalPlanned * CONFIRM_PHASE_SHARE);
}
const REVERSALS_TO_FREEZE = 2;
const CLAMP_STREAK_TO_FREEZE = 2;
const CONFIRM_ACCURACY_THRESHOLD = 0.6;

export type GrammarTestState = {
  v: 2;
  answers: Record<string, number>;
  currentLevel: GrammarLevel;
  lastCorrect: boolean | null;
  reversals: number;
  clampStreak: number;
  frozen: boolean;
  boundaryLevel: GrammarLevel | null;
  confirmCorrect: number;
  confirmTotal: number;
  totalPlanned: number;
  usedBankIds: string[];
  usedTags: string[];
};

export function isGrammarTestState(x: unknown): x is GrammarTestState {
  return !!x && typeof x === "object" && (x as { v?: number }).v === 2;
}

export function initialGrammarTestState(
  totalPlanned: GrammarItemCount = GRAMMAR_TOTAL_PLANNED,
): Omit<GrammarTestState, "answers" | "usedBankIds" | "usedTags"> {
  return {
    v: 2,
    currentLevel: SEED_LEVEL,
    lastCorrect: null,
    reversals: 0,
    clampStreak: 0,
    frozen: false,
    boundaryLevel: null,
    confirmCorrect: 0,
    confirmTotal: 0,
    totalPlanned,
  };
}

// Advances the staircase after `state.answers` already has this answer
// recorded. Pure function: returns the next state, doesn't mutate.
export function advanceStaircase(state: GrammarTestState, isCorrect: boolean): GrammarTestState {
  const answeredSoFar = Object.keys(state.answers).length;
  const stepPhaseEnd = stepPhaseLastIndex(state.totalPlanned);

  // Confirm phase (final ~30% of items): level stays frozen at the boundary.
  if (answeredSoFar > stepPhaseEnd) {
    return {
      ...state,
      confirmTotal: state.confirmTotal + 1,
      confirmCorrect: state.confirmCorrect + (isCorrect ? 1 : 0),
    };
  }

  // Still within the step phase, but already frozen: keep serving the same
  // level without moving further or counting toward the confirm tally.
  if (state.frozen) {
    return { ...state, lastCorrect: isCorrect };
  }

  const idx = GRAMMAR_LEVEL_INDEX[state.currentLevel];
  const atCeiling = idx === GRAMMAR_LEVELS.length - 1;
  const atFloor = idx === 0;
  const isClamped = (atCeiling && isCorrect) || (atFloor && !isCorrect);
  const clampStreak = isClamped ? state.clampStreak + 1 : 0;

  // A reversal is a fail immediately after a success -- the candidate hit
  // a ceiling. (The mirror case, a success after a fail, is just the
  // expected recovery and carries no extra signal.)
  const reversalOccurred = state.lastCorrect === true && !isCorrect;
  const reversals = state.reversals + (reversalOccurred ? 1 : 0);

  const rawIdx = idx + (isCorrect ? 1 : -1);
  const newIdx = Math.min(GRAMMAR_LEVELS.length - 1, Math.max(0, rawIdx));
  const newLevel = GRAMMAR_LEVELS[newIdx];

  const stepBudgetExhausted = answeredSoFar >= stepPhaseEnd;
  const shouldFreeze =
    reversals >= REVERSALS_TO_FREEZE ||
    clampStreak >= CLAMP_STREAK_TO_FREEZE ||
    stepBudgetExhausted;

  return {
    ...state,
    currentLevel: newLevel,
    lastCorrect: isCorrect,
    reversals,
    clampStreak,
    frozen: shouldFreeze,
    boundaryLevel: shouldFreeze ? newLevel : state.boundaryLevel,
  };
}

// The final call is decided by aggregate accuracy at the boundary level
// across *every* question answered at that level (step phase + confirm
// phase combined), not just the fixed 3-item confirm phase -- a candidate
// who stumbled early at the boundary but recovered in the confirm phase
// (or vice versa) is judged on the whole picture, not a 3-question sample.
export function deriveStaircaseLevel(
  state: GrammarTestState,
  byLevel: Record<string, { correct: number; total: number }>,
): GrammarLevel {
  const boundary = state.boundaryLevel ?? state.currentLevel;
  const stats = byLevel[boundary];
  if (!stats || stats.total === 0) return boundary;
  const accuracy = stats.correct / stats.total;
  if (accuracy >= CONFIRM_ACCURACY_THRESHOLD) return boundary;
  const idx = GRAMMAR_LEVEL_INDEX[boundary];
  return GRAMMAR_LEVELS[Math.max(0, idx - 1)];
}

export function deriveFinalGrammarResult(
  state: GrammarTestState,
  questions: StoredQuestion[],
  answers: Record<string, number>,
) {
  const { byLevel, totalCorrect, totalQ } = computeByLevel(questions, answers);
  const boundary = state.boundaryLevel ?? state.currentLevel;
  const level = deriveStaircaseLevel(state, byLevel);
  const boundaryStats = byLevel[boundary] ?? { correct: 0, total: 0 };
  const summary = `${totalCorrect}/${totalQ} correct overall. Placed at ${level} (${boundaryStats.correct}/${boundaryStats.total} at ${boundary}).`;
  return { level, totalCorrect, totalQ, byLevel, summary };
}
