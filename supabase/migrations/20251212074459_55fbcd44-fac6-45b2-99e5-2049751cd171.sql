-- Create payment transactions table for tracking credit/debit
CREATE TABLE public.booking_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('credit', 'debit')),
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;

-- Only admins can manage payment records
CREATE POLICY "Admins can view booking payments"
ON public.booking_payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert booking payments"
ON public.booking_payments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update booking payments"
ON public.booking_payments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete booking payments"
ON public.booking_payments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));