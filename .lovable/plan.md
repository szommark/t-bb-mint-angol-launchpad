# Auth + Registration + Profile Dashboard

Wrap the existing placement test in a proper user account system. All existing test logic (adaptive engine, timer, scoring, results) stays untouched.

## Part A — Data model migration

New tables (via one migration):

- `profiles` — one-to-one with `auth.users`
  - `user_id` (PK, FK → auth.users, cascade)
  - `name`, `email`, `language`, `focus`, `intake` (jsonb), `test_questions` (jsonb), `test_answers` (jsonb), `cefr_level`, `score_summary`, `completed_at`
  - RLS: user reads/writes own row; trigger auto-creates on signup from `raw_user_meta_data`
- `anonymous_sessions` — replaces the anon path of `leads` (name, email, focus, language, intake, questions, answers, cefr_level, score_summary, session_token_hash). RLS locked; service role only.
- `test_attempts` — repoint `lead_id` → `user_id uuid REFERENCES auth.users`, nullable + add `anonymous_session_id uuid` (exactly one set). RLS: user reads own; anon insert via service role.
- `attempt_answers` — add user-scoped SELECT policy via join to `test_attempts`.
- `questions` — add `TO anon, authenticated` SELECT policy (public read); writes stay service-role.

Backfill:
1. For each of the 18 rows in `leads`: create an `auth.users` row (via `supabaseAdmin.auth.admin.createUser`, `email_confirm: true`, random password, no email sent) inside a one-shot admin server fn triggered manually or as a seed script.
2. Insert matching `profiles` row (mapping name/focus/language/intake/test_*/cefr_level/score_summary/completed_at).
3. `UPDATE test_attempts SET user_id = <new auth id>` for each lead.
4. Drop the `leads` table (final migration after backfill confirmed).

Backfill runs as an admin-guarded server fn `POST /migrate-leads` (protected by a one-time secret env `MIGRATION_SECRET`) so it can be invoked once, then removed.

## Part B — Combined registration + intake

Single route `/free-placement-test` with two panels:

- Step 1 (only if not signed in): name, email, password, confirm password. Zod validated. Uses `supabase.auth.signUp` with `emailRedirectTo: window.location.origin`, `data: { name }`. Session established client-side. Below: "Already have an account? Log in" → `/auth`.
- Step 2 (auto-shown after signup, or immediately if signed in): existing intake fields (level dropdown, focus, skills multi-select) + "Generate my test" button.

Same page, no route change between steps — Step 2 replaces Step 1 with a fade/slide transition.

Server fn `startPlacement` is updated: when caller is authenticated, uses `requireSupabaseAuth` and writes to `profiles`; when anonymous, keeps the existing `session_token` path but writes to `anonymous_sessions` instead of `leads`.

## Part C — Login + password reset

New route `/auth`:
- Tabs: Log in / Sign up
- Login: email + password → `supabase.auth.signInWithPassword`, redirect to `/dashboard`
- "Forgot password?" → `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`

New route `/reset-password` (public): reads `type=recovery` from URL hash, form to set new password via `supabase.auth.updateUser({ password })`.

Nav bar (`__root.tsx` or shared header): when signed out show "Log in"; when signed in show account menu (name, "Dashboard", "Sign out").

## Part D — Dashboard

New route `/_authenticated/dashboard`:
- Profile card: name + email (read-only), editable focus + skills (saves to `profiles`)
- Test history table: date, CEFR level, score X/N, "View details" → `/_authenticated/dashboard/attempts/$attemptId`
- "Take a new test" button → `/free-placement-test` (which will skip Step 1)

New route `/_authenticated/dashboard/attempts/$attemptId`: renders existing ResultsScreen component wired to a server fn that loads the attempt + its `attempt_answers` + joined questions (RLS-scoped to the caller).

The integration-managed `src/routes/_authenticated/route.tsx` gate handles redirect-to-`/auth`.

## Part E — RLS summary

- `profiles`: user CRUD own row
- `test_attempts`: user SELECT/INSERT own; service role full
- `attempt_answers`: user SELECT where attempt belongs to them; service role full
- `questions`: public SELECT; service role write
- `anonymous_sessions`: service role only (accessed via server fns with valid session token, as today)

## Part F — Anonymous → registered handoff

At the end of an anonymous test, the results screen shows a "Save your results — create an account" CTA. On successful signup, a server fn copies the `anonymous_sessions` row + related `test_attempts` + `attempt_answers` onto the new `user_id`.

## Order of operations

1. Migration 1: create `profiles`, `anonymous_sessions`, add `user_id`/`anonymous_session_id` to `test_attempts`, new RLS, profile trigger.
2. Backfill server fn + run once, verify counts.
3. Migration 2: drop `leads`, drop old `lead_id` column, enforce the "exactly one of user_id / anonymous_session_id" check.
4. Refactor server fns (`start`, `next`, `submit`, `state`) to accept either auth session or anon session token, write to correct table.
5. Build `/auth`, `/reset-password`, dashboard routes, combined intake flow, nav updates.

## Notes

- Keeps all existing test logic, adaptive engine, timer, scoring, and results rendering untouched.
- Uses `supabase.auth.signUp` (email confirmation off assumed enabled in Cloud) — if email confirmation is on, signup returns without a session and Step 2 can't auto-open; will disable email auto-confirm requirement or ask user to confirm.
