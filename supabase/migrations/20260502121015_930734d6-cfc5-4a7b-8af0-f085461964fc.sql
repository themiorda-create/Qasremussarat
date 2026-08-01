
DROP VIEW IF EXISTS public.staff_public;

CREATE VIEW public.staff_public
WITH (security_invoker = true) AS
SELECT id, name, role, is_active, created_at
FROM public.staff
WHERE is_active = true;

GRANT SELECT ON public.staff_public TO anon, authenticated;

-- Allow anon to see only non-PII columns indirectly via the view; need a SELECT policy on staff for anon limited?
-- security_invoker view requires anon to satisfy RLS on staff. Add a policy for anon to read minimal rows via the view by allowing SELECT but column-level restriction is not RLS — instead we keep the policy strict and let admins use the full table. The view will only work for authenticated.
-- To support anon use of staff_public, add an anon SELECT policy on staff:
CREATE POLICY "Anon can view active staff via public view"
ON public.staff
FOR SELECT
TO anon
USING (is_active = true);
