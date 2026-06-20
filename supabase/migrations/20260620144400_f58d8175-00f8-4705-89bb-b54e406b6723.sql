
-- questions bank
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  level text NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  skill text NOT NULL CHECK (skill IN ('grammar','vocabulary','reading')),
  explanation text NOT NULL DEFAULT '',
  times_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to anon" ON public.questions AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX questions_level_skill_times_used_idx ON public.questions (level, skill, times_used, created_at);

-- test_attempts
CREATE TABLE public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  final_level text NOT NULL,
  score integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.test_attempts TO service_role;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to anon" ON public.test_attempts AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX test_attempts_lead_id_idx ON public.test_attempts (lead_id);

-- attempt_answers
CREATE TABLE public.attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  selected_answer text,
  is_correct boolean NOT NULL
);
GRANT ALL ON public.attempt_answers TO service_role;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to anon" ON public.attempt_answers AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX attempt_answers_attempt_id_idx ON public.attempt_answers (attempt_id);
CREATE INDEX attempt_answers_question_id_idx ON public.attempt_answers (question_id);
