-- Allow customers to view their own meeting history
CREATE POLICY "Users can view their own meeting history"
ON public.meeting_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meetings
    WHERE meetings.id = meeting_history.meeting_id
    AND (
      meetings.user_id = auth.uid()
      OR meetings.email = (current_setting('request.jwt.claims', true)::json ->> 'email')
    )
  )
);