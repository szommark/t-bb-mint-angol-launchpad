# Question bank + attempt logging

## 1. Database (one migration)

Create three tables in `public`. All writes happen through `supabaseAdmin` in server routes, so RLS stays locked down to anon/authenticated and `service_role` is granted full access (matches the existing `leads` table pattern).

### `questions`
- `id uuid pk default gen_random_uuid()`
- `question_text text not null`
- `options jsonb not null` — array of 4 strings
- `correct_answer text not null` — exact text of the correct option
- `level text not null` — `A1`..`C2` (check constraint)
- `skill text not null` — `grammar | vocabulary | reading` (check constraint, matches what `start.ts` already tags)
- `explanation text not null default ''`
- `times_used integer not null default 0`
- `created_at timestamptz not null default now()`
- Index on `(level, skill, times_used)` for the "least-used match" lookup.

### `test_attempts`
- `id uuid pk default gen_random_uuid()`
- `lead_id uuid not null references public.leads(id) on delete cascade` — the app's existing anonymous test-taker identifier
- `final_level text not null`
- `score integer not null`
- `created_at timestamptz not null default now()`

### `attempt_answers`
- `id uuid pk default gen_random_uuid()`
- `attempt_id uuid not null references public.test_attempts(id) on delete cascade`
- `question_id uuid not null references public.questions(id) on delete restrict`
- `selected_answer text` (nullable: user may skip)
- `is_correct boolean not null`

### RLS / GRANTs
- `GRANT ALL ... TO service_role` on all three (server routes use the admin client).
- Enable RLS, add a single restrictive `Deny all access to anon` policy (same shape as today's `leads` table). No anon or authenticated grants — the public flow already goes through the service-role server routes with a per-lead session token, which keeps anonymous test-takers working without exposing the bank or attempts to the Data API.

## 2. `start.ts` — reuse before generate

Switch from "one AI call returns 20 items" to a per-slot fill that prefers the bank:

1. Build the 20-slot blueprint with the existing distribution (3 A1 / 3 A2 / 4 B1 / 4 B2 / 3 C1 / 3 C2) and pick a skill per slot using a fixed rotation across `grammar / vocabulary / reading`.
2. For each slot, query `questions` filtered by `level` + `skill`, ordered by `times_used asc, created_at asc`, excluding ids already chosen for this test. If a row exists, use it and `update ... set times_used = times_used + 1` for that row.
3. Collect the still-empty slots and ask the AI to generate exactly those (same prompt structure as today, but parameterised by the needed `{level, skill}` counts). Insert each new question into `questions` and use it to fill the remaining slots; new rows start with `times_used = 1`.
4. Persist the resulting array on `leads.test_questions` exactly as today, adding one extra field per item: `bankId` (uuid of the row in `questions`). Existing fields (`id`, `prompt`, `options`, `correctIndex`, `skill`, `cefr`, `explanation`) stay the same so `state.ts`, `submit.ts`, and the results UI keep working unchanged.
5. Client-sanitised payload continues to strip `correctIndex` and `explanation` (and now also `bankId`).

If the AI call fails but the bank already filled every slot, skip the AI entirely.

## 3. `submit.ts` — log the attempt

After the existing scoring + `leads` update (unchanged), and before returning the response:

1. Insert one row into `test_attempts` with `lead_id = leadId`, `final_level = level`, `score = totalCorrect`. Capture the new `attempt.id`.
2. Build one `attempt_answers` row per question in `lead.test_questions`:
   - `attempt_id = attempt.id`
   - `question_id = q.bankId`
   - `selected_answer = q.options[answers[q.id]] ?? null`
   - `is_correct = answers[q.id] === q.correctIndex`
   Insert as a single batch.
3. Wrap the two inserts in a try/catch and log failures; never block the user's result on logging.

Scoring, CEFR derivation, `byLevel`, and `buildReview` output are untouched.

## 4. Out of scope

- No change to `state.ts`, the results UI, scoring thresholds, or the lead session-token auth.
- No admin/analytics surface for the new tables in this change — they just accumulate data.
- No backfill of historic completed tests into `test_attempts`.
