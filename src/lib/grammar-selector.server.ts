// Picks the next question for a Grammar Test slot from the pre-seeded
// grammar_questions bank. Unlike the general placement test, there's no
// live AI-generation fallback here — the bank is seeded with 100 questions
// (20 per A1-C1 level), which is plenty for any single test run.
import type { GrammarLevel } from "@/lib/grammar-blueprint.server";

export type GrammarFilled = {
  id: string; // slotId
  prompt: string;
  options: string[];
  correctIndex: number;
  cefr: GrammarLevel;
  explanation: string;
  explanationHu: string;
  bankId: string;
  tag: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

// Grammar bank question ids this student has already been asked, across
// all of their past completed grammar attempts (matched by email).
export async function getPreviouslyAnsweredGrammarBankIds(
  supabaseAdmin: Admin,
  email: string,
): Promise<string[]> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return [];

  const { data: sessions } = await supabaseAdmin
    .from("anonymous_sessions")
    .select("id")
    .ilike("email", normalizedEmail);
  const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);
  if (sessionIds.length === 0) return [];

  const { data: attempts } = await supabaseAdmin
    .from("grammar_test_attempts")
    .select("id")
    .in("anonymous_session_id", sessionIds);
  const attemptIds = (attempts ?? []).map((a: { id: string }) => a.id);
  if (attemptIds.length === 0) return [];

  const { data: answers } = await supabaseAdmin
    .from("grammar_attempt_answers")
    .select("question_id")
    .in("attempt_id", attemptIds);
  return Array.from(new Set((answers ?? []).map((a: { question_id: string }) => a.question_id)));
}

// Shuffles option order so the correct answer's position isn't a tell across
// users (the bank stores options in whatever order they were authored in).
function shuffleOptions(
  options: string[],
  correctIndex: number,
): { options: string[]; correctIndex: number } {
  const correctValue = options[correctIndex];
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { options: shuffled, correctIndex: shuffled.indexOf(correctValue) };
}

// Looks up a single grammar bank question, ordered by least-used-first.
// `level` filters to that CEFR level when provided; omitting it searches
// any level (used as a relaxed fallback). `excludeIds` filters out ids
// already seen; omitting/emptying it allows repeats (relaxed fallback too).
// `excludeTags` filters out grammar points already used in this test, for
// item variety — untagged rows are always eligible (treated as wildcards)
// so the still-partially-tagged bank doesn't get needlessly excluded.
async function findGrammarBankQuestion(
  supabaseAdmin: Admin,
  slotId: string,
  opts: {
    level?: GrammarLevel;
    tag?: string | null;
    excludeIds?: string[];
    excludeTags?: string[];
  },
): Promise<GrammarFilled | null> {
  let q = supabaseAdmin
    .from("grammar_questions")
    .select(
      "id, question_text, options, correct_answer, level, explanation, explanation_hu, times_used, grammar_tag",
    )
    .order("times_used", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);
  if (opts.level) q = q.eq("level", opts.level);
  if (opts.tag) q = q.eq("grammar_tag", opts.tag);
  if (opts.excludeIds && opts.excludeIds.length > 0) {
    q = q.not("id", "in", `(${opts.excludeIds.join(",")})`);
  }
  if (opts.excludeTags && opts.excludeTags.length > 0) {
    q = q.or(`grammar_tag.is.null,grammar_tag.not.in.(${opts.excludeTags.join(",")})`);
  }
  const { data: row } = await q.maybeSingle();
  if (!row) return null;
  const rowOpts = Array.isArray(row.options) ? (row.options as string[]) : [];
  if (rowOpts.length !== 4) return null;
  const idx = rowOpts.findIndex(
    (o: string) => o.trim().toLowerCase() === String(row.correct_answer).trim().toLowerCase(),
  );
  if (idx < 0) return null;
  const currentUsed = (row as { times_used?: number }).times_used ?? 0;
  await supabaseAdmin
    .from("grammar_questions")
    .update({ times_used: currentUsed + 1 })
    .eq("id", row.id);
  const shuffled = shuffleOptions(rowOpts, idx);
  return {
    id: slotId,
    prompt: row.question_text,
    options: shuffled.options,
    correctIndex: shuffled.correctIndex,
    cefr: row.level as GrammarLevel,
    explanation: row.explanation ?? "",
    explanationHu: (row as { explanation_hu?: string | null }).explanation_hu ?? "",
    bankId: row.id,
    tag: (row as { grammar_tag?: string | null }).grammar_tag ?? null,
  };
}

export type PickGrammarQuestionResult = GrammarFilled | { error: string };

export async function pickGrammarQuestionForSlot(params: {
  supabaseAdmin: Admin;
  slotId: string;
  level: GrammarLevel;
  usedBankIds: string[];
  usedTags?: string[];
}): Promise<PickGrammarQuestionResult> {
  const { supabaseAdmin, slotId, level, usedBankIds, usedTags = [] } = params;

  // Relax constraints progressively rather than failing the test outright:
  // first ask for a tag-diverse item at the target level, then allow tag
  // repeats, then id repeats, then finally any level at all.
  const tagDiverse = await findGrammarBankQuestion(supabaseAdmin, slotId, {
    level,
    excludeIds: usedBankIds,
    excludeTags: usedTags,
  });
  if (tagDiverse) return tagDiverse;

  const strict = await findGrammarBankQuestion(supabaseAdmin, slotId, {
    level,
    excludeIds: usedBankIds,
  });
  if (strict) return strict;

  const relaxedSameLevel = await findGrammarBankQuestion(supabaseAdmin, slotId, { level });
  if (relaxedSameLevel) return relaxedSameLevel;
  const anyLevel = await findGrammarBankQuestion(supabaseAdmin, slotId, {});
  if (anyLevel) return anyLevel;
  return { error: "We couldn't prepare your next question. Please try again." };
}

// Picks a single "practice the mistakes" question matching the CEFR level
// and grammar tag of a missed question, relaxing constraints progressively
// (same level+tag -> same level any tag -> any level+tag -> any level, and
// finally allowing id repeats) so a small bank never fails to fill the set.
export async function pickPracticeQuestion(params: {
  supabaseAdmin: Admin;
  slotId: string;
  level: GrammarLevel;
  tag: string | null;
  excludeIds: string[];
}): Promise<PickGrammarQuestionResult> {
  const { supabaseAdmin, slotId, level, tag, excludeIds } = params;

  if (tag) {
    const exact = await findGrammarBankQuestion(supabaseAdmin, slotId, { level, tag, excludeIds });
    if (exact) return exact;
  }
  const sameLevel = await findGrammarBankQuestion(supabaseAdmin, slotId, { level, excludeIds });
  if (sameLevel) return sameLevel;
  if (tag) {
    const anyLevelSameTag = await findGrammarBankQuestion(supabaseAdmin, slotId, {
      tag,
      excludeIds,
    });
    if (anyLevelSameTag) return anyLevelSameTag;
  }
  const anyLevel = await findGrammarBankQuestion(supabaseAdmin, slotId, { excludeIds });
  if (anyLevel) return anyLevel;
  const fallback = await findGrammarBankQuestion(supabaseAdmin, slotId, {});
  if (fallback) return fallback;
  return { error: "We couldn't prepare your practice questions. Please try again." };
}
