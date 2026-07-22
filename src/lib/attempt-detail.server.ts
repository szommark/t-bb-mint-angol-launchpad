import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ReviewRow = {
  id: string;
  is_correct: boolean;
  selected_answer: string | null;
  question_order?: number | null;
  question: {
    id: string;
    question_text: string;
    options: unknown;
    correct_answer: string;
    explanation: string;
    explanation_hu?: string | null;
    level: string;
  } | null;
};

type AttemptSummary = { id: string; created_at: string; final_level: string; score: number; total_questions: number };

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export function buildAttemptDetail(attempt: AttemptSummary, rows: ReviewRow[]) {
  const byLevel: Record<string, { correct: number; total: number }> = Object.fromEntries(
    LEVELS.map((l) => [l, { correct: 0, total: 0 }]),
  );
  const review = rows.map((a) => {
    const q = a.question;
    const opts = Array.isArray(q?.options) ? (q!.options as string[]) : [];
    const level = (q?.level ?? "A1") as string;
    if (byLevel[level]) {
      byLevel[level].total += 1;
      if (a.is_correct) byLevel[level].correct += 1;
    }
    const correctIndex = opts.findIndex((o) => o === q?.correct_answer);
    const userIndex = opts.findIndex((o) => o === a.selected_answer);
    return {
      id: q?.id ?? a.id,
      prompt: q?.question_text ?? "",
      cefr: level,
      options: opts,
      userIndex: userIndex >= 0 ? userIndex : null,
      userAnswer: a.selected_answer ?? null,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      correctAnswer: q?.correct_answer ?? "",
      explanation: q?.explanation ?? "",
      explanationHu: q?.explanation_hu ?? "",
    };
  });
  return { attempt, byLevel, review };
}

export function shuffleRows<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Shared by the student's own "View details" page and the teacher's view of
// a student's attempt. `client` is either the request-scoped (RLS-enforced)
// client for self-view, or the service-role client for teacher view — either
// way the caller must have already verified the caller is allowed to see
// `ownerUserId`'s data before calling this.
export async function loadAttemptDetail(
  client: SupabaseClient<Database>,
  attemptId: string,
  ownerUserId: string,
) {
  const { data: placementAttempt, error: pErr } = await client
    .from("test_attempts")
    .select("id, created_at, final_level, score, total_questions, user_id")
    .eq("id", attemptId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);

  if (placementAttempt) {
    if (placementAttempt.user_id !== ownerUserId) throw new Error("Not found");
    const { data: answers, error: ansErr } = await client
      .from("attempt_answers")
      .select(
        "id, is_correct, selected_answer, question_id, questions ( id, question_text, options, correct_answer, explanation, level )",
      )
      .eq("attempt_id", placementAttempt.id);
    if (ansErr) throw new Error(ansErr.message);
    const rows = (answers ?? []).map((a) => ({ ...a, question: a.questions as ReviewRow["question"] }));
    return buildAttemptDetail(placementAttempt, rows);
  }

  const { data: grammarAttempt, error: gErr } = await client
    .from("grammar_test_attempts")
    .select("id, created_at, final_level, score, total_questions, user_id")
    .eq("id", attemptId)
    .maybeSingle();
  if (gErr) throw new Error(gErr.message);
  if (!grammarAttempt || grammarAttempt.user_id !== ownerUserId) throw new Error("Not found");

  const { data: gAnswers, error: gAnsErr } = await client
    .from("grammar_attempt_answers")
    .select(
      "id, is_correct, selected_answer, question_id, question_order, created_at, grammar_questions ( id, question_text, options, correct_answer, explanation, explanation_hu, level )",
    )
    .eq("attempt_id", grammarAttempt.id)
    .order("question_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (gAnsErr) throw new Error(gAnsErr.message);
  let gRows = (gAnswers ?? []).map((a) => ({ ...a, question: a.grammar_questions as ReviewRow["question"] }));
  // Attempts recorded before question_order existed have it null on every
  // row, so the sort above is meaningless — shuffle rather than show a
  // DB-return order that looks intentional but isn't.
  if (gRows.length > 0 && gRows.every((r) => r.question_order === null)) {
    gRows = shuffleRows(gRows);
  }
  return buildAttemptDetail(grammarAttempt, gRows);
}
