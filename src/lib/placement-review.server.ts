export type StoredQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  skill: "grammar" | "vocabulary" | "reading";
  cefr: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  explanation?: string;
};

const LEVEL_ORDER: Record<StoredQuestion["cefr"], number> = {
  A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5,
};

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
        _ord: originalIdx,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => LEVEL_ORDER[a.cefr] - LEVEL_ORDER[b.cefr] || a._ord - b._ord)
    .map(({ _ord: _o, ...rest }) => rest);
}