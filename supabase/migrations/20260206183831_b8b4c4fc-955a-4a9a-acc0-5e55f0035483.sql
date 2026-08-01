-- Create meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  requested_time TIMESTAMP WITH TIME ZONE NOT NULL,
  approved_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can create meetings"
ON public.meetings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own meetings"
ON public.meetings
FOR SELECT
USING (auth.uid() = user_id OR email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Admins can view all meetings"
ON public.meetings
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update meetings"
ON public.meetings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete meetings"
ON public.meetings
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for meetings
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;