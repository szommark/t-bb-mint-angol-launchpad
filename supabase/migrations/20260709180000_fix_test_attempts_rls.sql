-- Fix RLS: the "Deny all access to anon" RESTRICTIVE policies created in
-- 20260620144400_f58d8175-00f8-4705-89bb-b54e406b6723.sql were scoped to
-- BOTH anon and authenticated roles. RESTRICTIVE policies are AND'ed with
-- PERMISSIVE ones, so this silently canceled out the later owner-read
-- policies for authenticated users too:
--   - test_attempts_select_own   (auth.uid() = user_id)
--   - attempt_answers_select_own (via test_attempts join)
-- Net effect: no logged-in user could ever read their own test results.
--
-- Rescope the deny-all policies to anon only, so authenticated users can
-- read their own rows again. questions_public_read intentionally grants
-- both anon and authenticated (public bank), so its deny-all counterpart
-- is dropped entirely rather than rescoped.

DROP POLICY "Deny all access to anon" ON public.test_attempts;
CREATE POLICY "Deny all access to anon" ON public.test_attempts
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY "Deny all access to anon" ON public.attempt_answers;
CREATE POLICY "Deny all access to anon" ON public.attempt_answers
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY "Deny all access to anon" ON public.questions;
