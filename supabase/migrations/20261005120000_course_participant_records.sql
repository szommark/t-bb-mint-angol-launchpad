-- Official adult-education participant data ("Résztvevő adatai"), uploaded
-- per course from the authority's .xlsx template. Kept separate from
-- course_participants because uploaded people usually don't have an account
-- yet; profile_id links the record to an account when one exists with the
-- same email.

CREATE TABLE public.course_participant_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  -- Values below mirror template columns A–I, in order.
  highest_education text NOT NULL,
  current_name text NOT NULL,
  birth_name text NOT NULL,
  mother_name text NOT NULL,
  birth_country text,
  birth_place text NOT NULL,
  birth_date date NOT NULL,
  email text NOT NULL,
  non_hu_citizen_without_hu_address boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, email),
  CONSTRAINT course_participant_records_email_lower CHECK (email = lower(email)),
  CONSTRAINT course_participant_records_education_check CHECK (highest_education IN (
    'Végzettség nélkül',
    'Általános iskolai végzettség',
    'Középfokú végzettség és gimnáziumi érettségi (gimnázium)',
    'Középfokú végzettség és középfokú szakképesítés (szakgimnázium, szakképző iskola, szakiskola)',
    'Középfokú végzettség és középfokú szakképzettség (technikum)',
    'Felsőfokú végzettségi szint és felsőfokú szakképzettség (felsőoktatási intézmény)',
    'Felsőoktatási szakképzés (felsőoktatási intézmény)'
  ))
);

CREATE INDEX idx_course_participant_records_course ON public.course_participant_records(course_id);
CREATE INDEX idx_course_participant_records_profile ON public.course_participant_records(profile_id);

GRANT ALL ON public.course_participant_records TO service_role;
ALTER TABLE public.course_participant_records ENABLE ROW LEVEL SECURITY;

-- Personal data (birth details, mother's name): server functions only.
CREATE POLICY "Deny all access to anon" ON public.course_participant_records
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER trg_course_participant_records_updated_at
  BEFORE UPDATE ON public.course_participant_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
