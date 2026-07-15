-- Standalone Grammar Test: its own question bank and attempt-logging
-- tables, independent of the general placement test's `questions` /
-- `test_attempts` / `attempt_answers` tables.

-- grammar_questions
CREATE TABLE public.grammar_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  level text NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1')),
  explanation text NOT NULL DEFAULT '',
  times_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.grammar_questions TO service_role;
ALTER TABLE public.grammar_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to anon" ON public.grammar_questions AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX grammar_questions_level_times_used_idx ON public.grammar_questions (level, times_used, created_at);

-- grammar_test_attempts
CREATE TABLE public.grammar_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_session_id uuid REFERENCES public.anonymous_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  final_level text NOT NULL,
  score integer NOT NULL,
  total_questions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.grammar_test_attempts TO service_role;
ALTER TABLE public.grammar_test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to anon" ON public.grammar_test_attempts AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX grammar_test_attempts_session_idx ON public.grammar_test_attempts (anonymous_session_id);

-- grammar_attempt_answers
CREATE TABLE public.grammar_attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.grammar_test_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.grammar_questions(id) ON DELETE RESTRICT,
  selected_answer text,
  is_correct boolean NOT NULL DEFAULT false
);
GRANT ALL ON public.grammar_attempt_answers TO service_role;
ALTER TABLE public.grammar_attempt_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to anon" ON public.grammar_attempt_answers AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX grammar_attempt_answers_attempt_idx ON public.grammar_attempt_answers (attempt_id);

-- anonymous_sessions: separate state slot for the grammar test so it never
-- collides with the legacy general-placement test_questions/test_answers
-- columns still used by in-flight/legacy sessions.
ALTER TABLE public.anonymous_sessions
  ADD COLUMN grammar_intake jsonb,
  ADD COLUMN grammar_test_questions jsonb,
  ADD COLUMN grammar_test_answers jsonb,
  ADD COLUMN grammar_cefr_level text,
  ADD COLUMN grammar_score_summary text,
  ADD COLUMN grammar_completed_at timestamptz;
