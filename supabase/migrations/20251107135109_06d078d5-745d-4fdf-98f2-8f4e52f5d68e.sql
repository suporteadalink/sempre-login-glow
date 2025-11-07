-- Security fix for activity_log table
-- Add policies to prevent tampering with audit trail

-- Policy to prevent any user from updating activity log entries
-- Activity logs should be immutable once created
CREATE POLICY "Activity log entries cannot be updated"
ON public.activity_log
FOR UPDATE
TO authenticated
USING (false);

-- Policy to allow only admins to delete activity log entries
-- This is useful for maintenance and compliance requirements
CREATE POLICY "Only admins can delete activity log entries"
ON public.activity_log
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));