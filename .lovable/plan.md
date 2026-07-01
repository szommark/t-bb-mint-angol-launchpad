## Goals

1. Stop serving the same cached test to every user. Intake (self-level + focus + skills) drives which questions the user sees, and changing intake regenerates the set.
2. Replace the fixed 20-slot even distribution with a level-weighted blueprint anchored on the user's self-assessed level.
3. Deliver the test one question at a time and adapt difficulty as the user answers, moving at most one CEFR level per step.

## Level weighting rules (applied to N=20 slots)

- **A1 / A2** — 60% at or below stated level, 30% one level above, 10% two levels above. Never more than +2.
- **B1 / B2** — 20% one below, 50% at level, 30% one above.
- **C1 / C2** — 20% two below, 30% one below, 50% at level.

These weights build the initial blueprint. The stated level always has the highest concentration. Skills selected in intake become the pool of allowed skill tags (skill filter). Focus area is used only as a tiebreaker in bank ordering and as flavor text in the AI prompt.

## Adaptive delivery

Change the flow from "generate 20, show all, submit at end" to "serve one, submit answer, serve next":

- Test session tracks a `currentLevel` starting at the user's self-assessed level.
- After each answer, `currentLevel` adjusts by at most one CEFR step:
  - 2 consecutive correct at `currentLevel` or above → step up one level (capped at C2 and at the max allowed by the weighting rule above, e.g. A1 users cap at A2 initially, then A3-equivalent B1 only after early success — never more than +2 from stated level for beginners, unbounded upward for B/C once earned).
  - 2 consecutive wrong → step down one level (floor A1).
- Each served question is chosen for the current adaptive level and one of the intake skills, with the same bank-first / AI-fallback logic used today.
- Blueprint still governs the overall level mix as a soft budget: the adaptive controller picks the next level, then a slot from the blueprint at that level is consumed. When budgets clash, the adaptive choice wins but the swap is logged so the totals stay near the weighted targets.

## Cache and regeneration

- On intake submit, compare submitted `{selfLevel, focus, skills}` to the intake stored on the lead. If any field differs, discard `test_questions`, `test_answers`, `cefr_level`, `score_summary`, and `completed_at`, then build a fresh set.
- If intake matches exactly and the lead already has an unfinished cached set, resume it. Completed tests are never overwritten (results screen stays valid).

## Question selection from the bank

- Filter: `skill IN (intake.skills)` AND `level = <slot level>`.
- Order: `times_used ASC`, then `created_at ASC`. Focus area only breaks ties — if the bank stores a topic tag later we can use it, but today focus stays as AI-prompt flavor.
- Exclude any bank question already used in this test (dedupe by `id`).
- If no matching row exists for a slot, generate that specific slot with AI (level + skill + focus as prompt inputs), insert into `questions`, and use it. Never fall back to a wrong-skill question.

## Data / API changes

Client contract shifts to one-question-at-a-time:

- `POST /api/public/placement/start` — validates intake, resets cache when intake changes, computes the weighted blueprint, and returns `{ questionCount, first: <question> }` plus the intake stored on the lead.
- New `POST /api/public/placement/next` — body `{ leadId, questionId, selectedIndex }`. Records the answer, updates `currentLevel` per the adaptive rule, picks the next slot (bank-first, AI fallback), and returns either the next question or `{ done: true }` when the blueprint is exhausted or the timer elapsed.
- `POST /api/public/placement/submit` — kept for the "done" path and for auto-submit on timeout; it now finalizes results using the answers accumulated on the lead rather than a client-sent map.
- `GET /api/public/placement/state` — unchanged shape, but returns adaptive progress (`answered`, `total`, `currentQuestion`) so resume works after refresh.

Lead columns already cover this; no schema change beyond storing `adaptive_state` inside the existing `test_answers` jsonb (progress + currentLevel + servedQuestionIds). No new tables. `questions`, `test_attempts`, `attempt_answers` continue to work as today — attempt logging on submit still inserts one row per answered question.

Sanitized question payload sent to the client stays `{ id, prompt, options, cefr, skill }` — no correct index, no explanation, no `bankId`.

## Frontend changes (`src/routes/placement-test.$leadId.tsx`)

- Intake form: on submit, always POST intake; server decides whether to reuse or regenerate.
- Test view: renders one question at a time using the `current` payload from `start` / `next`. Progress chip shows `answered / total`. Timer + auto-submit behavior is preserved.
- Answer handler calls `/placement/next`; when it returns `done`, the client calls `/placement/submit` (or the server auto-finalizes and returns the result directly — TBD in build; default to server-finalizes to avoid client trust).
- Results screen (score, per-level bars, review) is unchanged and reads from `state` as today.

## Files touched

- `src/routes/api/public/placement/start.ts` — intake diff + reset, weighted blueprint, serve only the first question.
- `src/routes/api/public/placement/next.ts` — new file; adaptive controller + bank/AI selection for the next question.
- `src/routes/api/public/placement/submit.ts` — accept server-side answers, keep attempt logging.
- `src/routes/api/public/placement/state.ts` — expose adaptive progress alongside existing fields.
- `src/lib/placement-review.server.ts` — helpers for weighted blueprint + adaptive step logic (shared between start and next).
- `src/routes/placement-test.$leadId.tsx` — one-at-a-time UI, updated fetch flow, resume handling.

## Out of scope

- No schema migration (reuse `test_answers` jsonb for adaptive state).
- No changes to scoring formula, CEFR derivation, per-level bars, or the review section.
- No changes to auth, RLS, or the lead session-token flow.
