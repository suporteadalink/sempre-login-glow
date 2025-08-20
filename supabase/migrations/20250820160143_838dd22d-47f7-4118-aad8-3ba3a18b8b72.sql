-- Allow admins to insert new users
CREATE POLICY "Admins can insert new users" 
ON public.users 
FOR INSERT 
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Allow admins to update any user
CREATE POLICY "Admins can update any user" 
ON public.users 
FOR UPDATE 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Allow admins to delete any user
CREATE POLICY "Admins can delete any user" 
ON public.users 
FOR DELETE 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);