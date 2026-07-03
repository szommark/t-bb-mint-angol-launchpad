-- 1) profiles table (extends auth.users 1:1)
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'en',
  focus text,
  preferred_skills text[] NOT NULL DEFAULT '{}',
  intake jsonb,
  test_questions jsonb,
  test_answers jsonb,
  cefr_level text,
  score_summary text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile on new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) anonymous_sessions table (mirrors current anonymous "leads" flow)
CREATE TABLE public.anonymous_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text,
  focus text,
  language text NOT NULL DEFAULT 'en',
  intake jsonb,
  test_questions jsonb,
  test_answers jsonb,
  cefr_level text,
  score_summary text,
  completed_at timestamptz,
  session_token_hash text,
  claimed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.anonymous_sessions TO service_role;
ALTER TABLE public.anonymous_sessions ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (via server fns with valid session token) may touch this table.

-- 3) test_attempts: add user_id and anonymous_session_id, keep lead_id for now
ALTER TABLE public.test_attempts
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN anonymous_session_id uuid REFERENCES public.anonymous_sessions(id) ON DELETE CASCADE,
  ALTER COLUMN lead_id DROP NOT NULL;

CREATE INDEX idx_test_attempts_user_id ON public.test_attempts(user_id);
CREATE INDEX idx_test_attempts_anon_id ON public.test_attempts(anonymous_session_id);

GRANT SELECT ON public.test_attempts TO authenticated;
GRANT ALL ON public.test_attempts TO service_role;

-- test_attempts already has RLS enabled; add owner-read policy
CREATE POLICY "test_attempts_select_own" ON public.test_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4) attempt_answers: allow user to read their own attempt answers
GRANT SELECT ON public.attempt_answers TO authenticated;
GRANT ALL ON public.attempt_answers TO service_role;

CREATE POLICY "attempt_answers_select_own" ON public.attempt_answers
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.test_attempts ta
      WHERE ta.id = attempt_answers.attempt_id AND ta.user_id = auth.uid()
    )
  );

-- 5) questions: publicly readable, writes still service-role only
GRANT SELECT ON public.questions TO anon, authenticated;

CREATE POLICY "questions_public_read" ON public.questions
  FOR SELECT TO anon, authenticated USING (true);