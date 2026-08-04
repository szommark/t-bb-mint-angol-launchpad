-- Course inquiry leads ("Learn more" forms on the homepage).
-- Kept separate from public.profiles / auth.users: no password or placement
-- test data is ever written here, just the contact details supplied in the form.
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (server route) may touch this table.

-- Corporate English & German inquiries carry a company name in addition to
-- the contact person's details.
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (server route) may touch this table.
