## Temporary test config: 10 questions, 5-minute timer

Make both values single-source constants so a one-line revert restores 20/20.

### Constants (top of files, clearly marked TEMP)

- `src/lib/placement-blueprint.server.ts`
  - `TOTAL_PLANNED = 10` (was 20).
  - Rewrite `buildBudget(selfLevel)` so each case sums to `TOTAL_PLANNED`, preserving the same weighting shape:
    - A1: A1 6, A2 3, B1 1
    - A2: A1 2, A2 4, B1 3, B2 1
    - B1: A2 2, B1 5, B2 3
    - B2: B1 2, B2 5, C1 3
    - C1: B1 2, B2 3, C1 5
    - C2: B2 2, C1 3, C2 5
  - Adaptive step logic, `chooseSlotLevel`, `reachableLevels`, and per-level accuracy bars are unaffected — they operate on whatever budget/questions exist.

- `src/routes/placement-test.$leadId.tsx`
  - `TEST_DURATION_SECONDS = 300` (was 600).
  - `useState(20)` fallbacks → `useState(10)`; `data.totalPlanned ?? 20` → `?? 10` (2 spots). These are only pre-fetch fallbacks; server value still wins.
  - Intake subtitle copy in all three languages: "20 quick questions … 10 minutes" → "10 quick questions … 5 minutes" (EN / HU / DE).

### Not touched

- Results screen score already renders `totalCorrect / totalQ` from server data — automatically shows `X/10`.
- Progress chip uses `answeredCount / totalPlanned` from server — automatic.
- `/start`, `/next`, `/submit`, `/state` need no edits: they read `TOTAL_PLANNED` and the state's `totalPlanned` field.
- Per-level bars use `computeByLevel` over answered questions — works for any count.

### Revert

Change `TOTAL_PLANNED` back to 20, restore original `buildBudget` numbers, set `TEST_DURATION_SECONDS = 600`, and revert the 3 subtitle strings. I'll leave `// TEMP:` comments next to each so they're easy to find.