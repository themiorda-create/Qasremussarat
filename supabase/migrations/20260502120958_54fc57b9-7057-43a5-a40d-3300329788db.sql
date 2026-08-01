
-- 1) INPUT VALIDATION constraints on bookings
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_name_length CHECK (length(name) >= 1 AND length(name) <= 100),
  ADD CONSTRAINT bookings_email_format CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255),
  ADD CONSTRAINT bookings_phone_length CHECK (length(phone) >= 7 AND length(phone) <= 25),
  ADD CONSTRAINT bookings_message_length CHECK (message IS NULL OR length(message) <= 2000),
  ADD CONSTRAINT bookings_guests_range CHECK (guests > 0 AND guests <= 1000);

-- 2) MISSING_RLS: allow customers to mark their own booking's messages as read
CREATE POLICY "Users can mark messages as read in their bookings"
ON public.chat_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = chat_messages.booking_id
      AND bookings.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = chat_messages.booking_id
      AND bookings.user_id = auth.uid()
  )
);

-- 3) EXPOSED_SENSITIVE_DATA: restrict staff PII (email/phone) from public view.
-- Drop the public policy and replace with: admins see all; public can see a sanitized view via a SECURITY INVOKER function if needed.
DROP POLICY IF EXISTS "Anyone can view active staff" ON public.staff;

CREATE POLICY "Authenticated users can view active staff (limited)"
ON public.staff
FOR SELECT
TO authenticated
USING (is_active = true);

-- Public-safe view exposing only non-PII columns for any anonymous UI that lists staff
CREATE OR REPLACE VIEW public.staff_public AS
SELECT id, name, role, is_active, created_at
FROM public.staff
WHERE is_active = true;

GRANT SELECT ON public.staff_public TO anon, authenticated;

-- 4) Fix function search_path mutable for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
