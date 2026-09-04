-- Admin courses: a real admin role, a company link on profiles, and
-- courses whose rosters are restricted to participants from the same company.

ALTER TABLE public.profiles
  ADD COLUMN is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);

-- companies started as a lead-capture table for the "corporate inquiry" form,
-- where contact_name/contact_email were always supplied. It's now also used
-- as the real employer entity for courses/users, which don't have a sales
-- contact, so those columns can no longer be required.
ALTER TABLE public.companies
  ALTER COLUMN contact_name DROP NOT NULL,
  ALTER COLUMN contact_email DROP NOT NULL;

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT courses_dates_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_courses_company_id ON public.courses(company_id);

GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access to anon" ON public.courses
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.course_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, participant_id)
);

CREATE INDEX idx_course_participants_course ON public.course_participants(course_id);
CREATE INDEX idx_course_participants_participant ON public.course_participants(participant_id);

GRANT ALL ON public.course_participants TO service_role;
ALTER TABLE public.course_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all access to anon" ON public.course_participants
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Non-bypassable backstop for the "participants must share the course's
-- company" rule. Server functions perform the same check up front to return
-- a friendly error, but supabaseAdmin (service role) bypasses RLS entirely,
-- so RLS can't be the enforcement point here — only a trigger can guarantee
-- the rule holds regardless of which code path writes this table.
CREATE OR REPLACE FUNCTION public.enforce_course_participant_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_company uuid;
  participant_company uuid;
BEGIN
  SELECT company_id INTO course_company FROM public.courses WHERE id = NEW.course_id;
  SELECT company_id INTO participant_company FROM public.profiles WHERE user_id = NEW.participant_id;

  IF participant_company IS NULL OR course_company IS DISTINCT FROM participant_company THEN
    RAISE EXCEPTION 'Participant company (%) does not match course company (%)', participant_company, course_company
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_course_participant_company() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_enforce_course_participant_company
  BEFORE INSERT OR UPDATE ON public.course_participants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_course_participant_company();
