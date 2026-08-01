
-- Remove anon's row policy so they cannot SELECT directly from staff table
DROP POLICY IF EXISTS "Anon can view active staff via public view" ON public.staff;

-- Revoke broad column grants from anon and authenticated on staff table; admins access via has_role policy still applies through table grants to authenticated, but to enforce safety, restrict column-level GRANTs.
REVOKE SELECT ON public.staff FROM anon;
-- authenticated keeps SELECT (gated by RLS policy "Authenticated users can view active staff (limited)")
-- The RLS policy still returns full rows; to hide PII for non-admins we replace it:
DROP POLICY IF EXISTS "Authenticated users can view active staff (limited)" ON public.staff;

-- Only admins can SELECT full staff rows
CREATE POLICY "Admins can view all staff"
ON public.staff
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- staff_public view (security_invoker) needs to bypass RLS for anon. Switch it to security definer wrapper that exposes only safe columns.
DROP VIEW IF EXISTS public.staff_public;

CREATE OR REPLACE FUNCTION public.get_public_staff()
RETURNS TABLE(id uuid, name text, role text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, role, created_at
  FROM public.staff
  WHERE is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_staff() TO anon, authenticated;
