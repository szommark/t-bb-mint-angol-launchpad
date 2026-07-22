-- Support ordered "View details" playback for grammar test attempts.
--
-- Everything else in the originally proposed migration is already covered
-- by prior migrations, so this only adds what's actually missing:
--   - grammar_attempt_answers has no column recording presentation order,
--     so the review UI can't reconstruct the order questions were asked in.
--   - grammar_test_attempts has no index on user_id, which both the
--     student dashboard and teacher dashboard filter by.
-- Not included (already exist, see 20260714150000_grammar_test.sql /
-- 20260716130000_fix_grammar_test_rls.sql):
--   - RLS is already enabled with an owner-read policy
--     ("grammar_attempt_answers_select_own").
--   - grammar_attempt_answers already has an index on attempt_id
--     ("grammar_attempt_answers_attempt_idx").
-- Not included (would be a no-op): a client-side RLS policy letting
-- teachers read grammar_attempt_answers via teacher_profiles/
-- teacher_students. teacher_profiles carries a RESTRICTIVE
-- "Deny all access to anon, authenticated" policy (by design — see
-- 20260717130000_teacher_accounts.sql), which blocks that table even when
-- referenced from a subquery, so such a policy would never actually grant
-- access. Teacher reads of student attempts already go through
-- src/lib/teacher.functions.ts using the service-role client instead.

ALTER TABLE public.grammar_attempt_answers
  ADD COLUMN IF NOT EXISTS question_order int4;

ALTER TABLE public.grammar_attempt_answers
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_grammar_test_attempts_user_id
  ON public.grammar_test_attempts (user_id);
