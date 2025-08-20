-- Update RLS policies for activity_log table to allow INSERT operations
DROP POLICY IF EXISTS "Users can view their own activities" ON public.activity_log;
DROP POLICY IF EXISTS "Users can create their own activities" ON public.activity_log;

-- Create new policies that match the user requirement  
CREATE POLICY "Users can view activity log if authenticated" 
ON public.activity_log 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create activity log entries" 
ON public.activity_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);