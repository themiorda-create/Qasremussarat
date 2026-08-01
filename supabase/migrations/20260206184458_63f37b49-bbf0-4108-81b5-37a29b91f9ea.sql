-- Create meeting history table to track changes
CREATE TABLE public.meeting_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  changed_by UUID,
  change_type TEXT NOT NULL,
  old_time TIMESTAMP WITH TIME ZONE,
  new_time TIMESTAMP WITH TIME ZONE,
  old_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view meeting history"
ON public.meeting_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert meeting history"
ON public.meeting_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));