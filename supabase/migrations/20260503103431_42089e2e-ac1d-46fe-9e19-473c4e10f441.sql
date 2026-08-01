ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'per_head';

-- Allowed values: 'per_head', 'service', 'service_cooking'
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_billing_type_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_billing_type_check
CHECK (billing_type IN ('per_head', 'service', 'service_cooking'));