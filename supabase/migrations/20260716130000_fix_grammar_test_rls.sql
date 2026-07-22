-- Same bug as 20260709180000_fix_test_attempts_rls.sql, reintroduced by the
-- grammar test tables: the "Deny all access to anon" RESTRICTIVE policies
-- were scoped to BOTH anon and authenticated. RESTRICTIVE policies are
-- AND'ed with PERMISSIVE ones, so this silently blocked logged-in users
-- from ever reading their own grammar test results (and from resolving
-- the grammar_questions embed used to build the review screen).

DROP POLICY "Deny all access to anon" ON public.grammar_test_attempts;
CREATE POLICY "Deny all access to anon" ON public.grammar_test_attempts
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY "Deny all access to anon" ON public.grammar_attempt_answers;
CREATE POLICY "Deny all access to anon" ON public.grammar_attempt_answers
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY "Deny all access to anon" ON public.grammar_questions;

-- Owner-read policies, mirroring test_attempts_select_own / attempt_answers_select_own.
GRANT SELECT ON public.grammar_test_attempts TO authenticated;
CREATE POLICY "grammar_test_attempts_select_own" ON public.grammar_test_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

GRANT SELECT ON public.grammar_attempt_answers TO authenticated;
CREATE POLICY "grammar_attempt_answers_select_own" ON public.grammar_attempt_answers
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.grammar_test_attempts gta
      WHERE gta.id = grammar_attempt_answers.attempt_id AND gta.user_id = auth.uid()
    )
  );

-- grammar_questions: publicly readable, same as the legacy questions bank.
GRANT SELECT ON public.grammar_questions TO anon, authenticated;
CREATE POLICY "grammar_questions_public_read" ON public.grammar_questions
  FOR SELECT TO anon, authenticated USING (true);
