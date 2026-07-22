-- Teacher accounts: a profile can be flagged as a teacher, gets a shareable
-- join code, and students link themselves to a teacher by entering that code.
ALTER TABLE public.profiles ADD COLUMN is_teacher boolean NOT NULL DEFAULT false;

CREATE TABLE public.teacher_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE UNIQUE,
  teacher_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_teacher_profiles_code ON public.teacher_profiles(teacher_code);

GRANT ALL ON public.teacher_profiles TO service_role;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- No direct client access: teacher_profiles is only read/written through
-- server functions (using the service-role client) that enforce the caller
-- is the owning teacher, mirroring the anonymous_sessions table pattern.
CREATE POLICY "Deny all access to anon" ON public.teacher_profiles
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.teacher_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, student_id)
);

CREATE INDEX idx_teacher_students_teacher ON public.teacher_students(teacher_id);
CREATE INDEX idx_teacher_students_student ON public.teacher_students(student_id);

GRANT ALL ON public.teacher_students TO service_role;
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access to anon" ON public.teacher_students
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Carry the "is this a teacher signup" flag from auth metadata into the
-- profile row, so it's set even when email confirmation delays first login.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, language, is_teacher)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en'),
    COALESCE((NEW.raw_user_meta_data->>'is_teacher')::boolean, false)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
