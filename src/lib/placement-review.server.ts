export type StoredQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  skill: "grammar" | "vocabulary" | "reading";
  // The placement test uses A1..C2; the grammar test uses the 8-band scale
  // (A2+, B1+, B2+, C1-C2).
  cefr: "A1" | "A2" | "A2+" | "B1" | "B1+" | "B2" | "B2+" | "C1" | "C1-C2" | "C2";
  explanation?: string;
  explanationHu?: string;
};

const ALL_LEVELS: StoredQuestion["cefr"][] = [
  "A1", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C1-C2", "C2",
];

const LEVEL_ORDER = Object.fromEntries(ALL_LEVELS.map((l, i) => [l, i])) as Record<
  StoredQuestion["cefr"],
  number
>;

export function computeByLevel(
  questions: StoredQuestion[],
  answers: Record<string, number>,
) {
  const byLevel: Record<string, { correct: number; total: number }> = {};
  for (const l of ALL_LEVELS) byLevel[l] = { correct: 0, total: 0 };
  let totalCorrect = 0;
  let answered = 0;
  for (const q of questions) {
    if (typeof answers[q.id] !== "number") continue;
    answered += 1;
    // Never throw on a level we don't know about: this runs when the last
    // answer is submitted, and a crash there loses the whole test result.
    const bucket = (byLevel[q.cefr] ??= { correct: 0, total: 0 });
    bucket.total += 1;
    if (answers[q.id] === q.correctIndex) {
      bucket.correct += 1;
      totalCorrect += 1;
    }
  }
  return { byLevel, totalCorrect, totalQ: answered };
}

export function buildReview(
  questions: StoredQuestion[],
  answers: Record<string, number>,
) {
  return questions
    .map((q, originalIdx) => {
      const userIndex = typeof answers[q.id] === "number" ? answers[q.id] : null;
      if (userIndex === q.correctIndex) return null;
      return {
        id: q.id,
        prompt: q.prompt,
        cefr: q.cefr,
        options: q.options,
        userIndex,
        userAnswer: userIndex !== null ? q.options[userIndex] ?? null : null,
        correctIndex: q.correctIndex,
        correctAnswer: q.options[q.correctIndex],
        explanation: q.explanation ?? "",
        explanationHu: q.explanationHu ?? "",
        _ord: originalIdx,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort(
      (a, b) => (LEVEL_ORDER[a.cefr] ?? 0) - (LEVEL_ORDER[b.cefr] ?? 0) || a._ord - b._ord,
    )
    .map(({ _ord: _o, ...rest }) => rest);
}