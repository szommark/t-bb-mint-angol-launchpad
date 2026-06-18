## Goal
On the placement-test results screen, keep the existing level + score (X/20) and add a "Review your answers" section listing every wrong answer with question text, level tag, user's pick, correct answer, and a 1–2 sentence explanation, ordered A1 → C2.

## Changes

### 1. Generate explanations with each question
`src/routes/api/public/placement/start.ts`
- Extend the AI prompt and `RawItemSchema` so each item also returns `explanation` (1–2 sentences justifying the correct option).
- Store `explanation` on each question object in `test_questions` jsonb (alongside `prompt`, `options`, `correctIndex`, `skill`, `cefr`).
- Continue stripping `correctIndex` (and now `explanation`) from the questions returned to the client during start — only revealed after submission.

### 2. Build review payload on submit
`src/routes/api/public/placement/submit.ts`
- After scoring (unchanged), build a `review` array of wrong answers only:
  `{ id, prompt, cefr, options, userIndex, userAnswer, correctIndex, correctAnswer, explanation }` (userIndex `null` if unanswered).
- Sort A1 → C2, preserving original order within a level.
- Include `review` in the JSON response. Scoring and CEFR derivation untouched.

### 3. Resume-safe state
`src/routes/api/public/placement/state.ts`
- When `completed_at` is set, compute and return the same `review` array from stored `test_questions` + `test_answers` so a reload of the results page still shows the breakdown.
- For in-progress sessions, keep stripping `correctIndex` and `explanation` from questions.

### 4. Results UI
`src/routes/placement-test.$leadId.tsx`
- Add `review` to the `Result` state and read it from submit/state responses.
- Below the existing level/score block, render a "Review your answers" section (translated copy added to `t.en/hu/de`, e.g. "Review your answers" / "Kérdések átnézésre" / "Fragen zur Wiederholung").
- Each item: small CEFR badge, question text, "Your answer" (muted/struck or red) vs. "Correct answer" (teal/green), and explanation in muted text. Use existing tokens (`var(--teal-accent)`, `border-border`, card styles); no new deps.
- If `review` is empty, show a short success line instead.

## Out of scope
- No change to scoring, CEFR thresholds, or stored columns.
- No DB migration (explanation lives inside existing `test_questions` jsonb).
- Correct answers remain count-only, no expanded breakdown.