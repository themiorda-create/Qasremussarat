-- 1. Realtime channel authorization: restrict realtime.messages subscriptions to admins only.
-- This keeps existing admin-side realtime working while preventing other authenticated users
-- from subscribing to bookings/meetings/chat_messages channels and seeing PII.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can receive realtime broadcasts" ON realtime.messages;
CREATE POLICY "Admins can receive realtime broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can send realtime broadcasts" ON realtime.messages;
CREATE POLICY "Admins can send realtime broadcasts"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Drop redundant duplicate staff SELECT policy (the ALL policy already covers admins)
DROP POLICY IF EXISTS "Admins can view all staff" ON public.staff;

-- 3. Allow customers to view payment records tied to their own bookings
CREATE POLICY "Users can view their own booking payments"
ON public.booking_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = booking_payments.booking_id
      AND bookings.user_id = auth.uid()
  )
);