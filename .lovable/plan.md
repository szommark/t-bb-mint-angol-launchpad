## Goal

Give the placement test an overall time limit. Show a countdown during the test. When it expires, auto-submit whatever's been answered. Score becomes `X/N` where `N` is the number of questions actually answered (skipped/unanswered questions are excluded from scoring, per-level bars, and CEFR derivation). The "Review your answers" section is unaffected (it already only lists wrong answers among questions seen).

## Behavior

- **Time limit:** 5 minutes total per test (single configurable constant, `TEST_DURATION_SECONDS = 600`).
- **Start point:** Timer starts when the user first lands on step `"test"` with questions loaded. Persisted across refresh via `localStorage` keyed by `leadId` (e.g. `placement-deadline:{leadId}`), so refreshing doesn't reset it.
- **Display:** Compact `MM:SS` chip in the test card header (next to the `Question X / N` row). Turns amber under 2:00 remaining, red under 0:30. Purely visual; no behavior change until 0.
- **Timeout:** When the countdown hits 0, auto-call `submitTest()` with whatever's in `answers`. Same flow as manual submit; user sees the normal result screen.
- **Manual submit:** Remove the "must answer all" gate so users may submit early. (Optional small confirm if any are unanswered — keep it as a `toast` "X unanswered, submitting…" instead of blocking.)
- **Resume after completion:** Once `completed_at` is set, timer is irrelevant; clear the stored deadline.

## Scoring changes

Today, score = correct / 20. With partial answers:

- `N` = number of questions the user actually answered (i.e. `Object.keys(answers).length`, bounded to question set).
- `score` = `totalCorrect / N`, displayed as `X/N` on the results screen (replacing the hardcoded `/20`).
- **CEFR derivation:** keep the existing walk-up logic in `deriveCefr`, but skip levels with `total === 0` (already does). Unanswered questions are simply not counted as correct, so a level with all unanswered questions will fail the 60% bar and stop progression there. This is the desired behavior (timing out means you don't get credit for what you didn't reach). Keep the existing algorithm; no formula change needed beyond not pre-counting unanswered as wrong against an inflated `total`.

Decision for per-level totals: **only count answered questions in `total**`. So if a B2 question was never answered, it doesn't appear in B2's denominator. This makes the per-level bars reflect actual demonstrated accuracy at each level, not "you ran out of time." Specifically:

```
for q in questions:
  if answers[q.id] is undefined: continue   // skip unanswered
  byLevel[q.cefr].total += 1
  if correct: byLevel[q.cefr].correct += 1
```

This affects both `deriveCefr` (submit.ts) and `computeByLevel` (placement-review.server.ts). `totalQ` returned to the client becomes the **answered** count, used as `N` in `X/N`.

## DB changes

Add `total_questions` (int, not null) to `test_attempts` so we know the denominator alongside `score`. Insert it from `submit.ts`. `attempt_answers` keeps inserting one row per answered question (skip unanswered — current `.filter((q) => !!q.bankId)` becomes `q.bankId && answers[q.id] !== undefined`). No row for skipped questions.

Migration:

```sql
ALTER TABLE public.test_attempts
  ADD COLUMN total_questions integer NOT NULL DEFAULT 0;
```

(Default 0 only to satisfy existing rows; new inserts always supply the real value.)

## UI changes (`src/routes/placement-test.$leadId.tsx`)

1. New `useEffect` that, when `step === "test"` and `questions.length > 0`:
  - Reads/writes `localStorage[`placement-deadline:${leadId}`]` (ISO timestamp). Initializes to `now + TEST_DURATION_SECONDS` if absent.
  - Sets an interval (1s) updating a `remaining` state.
  - When `remaining <= 0`, clears interval and calls `submitTest()` once (guarded with a ref).
2. Render the `MM:SS` chip in the test card header. Color thresholds via Tailwind classes.
3. Drop / soften the "must answer all" guard in `submitTest`.
4. Results screen: replace any `/20` with `/{result.totalQ}`. Per-level bars already read from `result.byLevel`, which will now reflect answered-only stats automatically.
5. Translations: add `timeLeft` label (en/hu/de) and a short `timedOut` toast.
6. Clear the stored deadline when the result screen renders.

## Server changes

- `submit.ts`
  - In `deriveCefr`: skip questions where `answers[q.id]` is undefined (don't add to `byLevel[].total`).
  - Compute `totalQ = answeredCount` instead of `questions.length`.
  - Insert `total_questions: totalQ` into `test_attempts`.
  - `attempt_answers` rows: only for answered questions (`answers[q.id] !== undefined`).
- `state.ts`
  - `computeByLevel` will now return answered-only stats by the same change; resume path keeps working unchanged.
- `placement-review.server.ts`
  - Update `computeByLevel` to skip unanswered. `buildReview` already only emits wrong answers — leave a tiny tweak so a fully unanswered question is also surfaced as a "no answer" review item (it currently is, because `userIndex === q.correctIndex` is false when `userIndex === null`). No change needed.

## Out of scope

- Per-question timers.
- Pause/resume controls.
- Server-side time enforcement (client-driven only; acceptable here — this is a self-assessment, not a high-stakes exam, and lead-token auth still gates submission).
- Visual redesign of the results card beyond the score-denominator swap.
- Backfilling `total_questions` for historic attempts (left at default 0).

## Files touched

- `supabase/migrations/<new>.sql` (add `total_questions` column)
- `src/routes/placement-test.$leadId.tsx` (timer UI + auto-submit + score display)
- `src/routes/api/public/placement/submit.ts` (answered-only scoring + new column insert + filtered `attempt_answers`)
- `src/lib/placement-review.server.ts` (skip unanswered in `computeByLevel`)
- `src/integrations/supabase/types.ts` (auto-regenerated after migration)