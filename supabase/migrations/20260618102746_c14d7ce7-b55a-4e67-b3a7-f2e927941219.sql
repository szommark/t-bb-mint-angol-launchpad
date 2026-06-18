-- Lock down leads table: all access is via server-side admin client (service_role bypasses RLS).
-- Explicitly deny anon and authenticated roles to make the security posture clear.

REVOKE ALL ON public.leads FROM anon;
REVOKE ALL ON public.leads FROM authenticated;
GRANT ALL ON public.leads TO service_role;

CREATE POLICY "Deny all access to anon"
  ON public.leads
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
