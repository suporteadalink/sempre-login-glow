-- Add RLS policy for deleting users
CREATE POLICY "Admin can delete users" 
ON public.users 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);