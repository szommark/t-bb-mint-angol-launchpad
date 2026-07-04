-- Explicit deny-all restrictive policy for anonymous_sessions.
-- Access is limited to the service role (used by server routes).
REVOKE ALL ON public.anonymous_sessions FROM anon, authenticated;
GRANT ALL ON public.anonymous_sessions TO service_role;

CREATE POLICY "Deny all access to anon and authenticated"
ON public.anonymous_sessions
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);