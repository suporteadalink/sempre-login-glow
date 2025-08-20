-- Add DELETE policy for projects table
CREATE POLICY "DELETE: Gerente do projeto ou Admin" 
ON public.projects 
FOR DELETE 
USING (
  (manager_id = auth.uid()) OR 
  ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
);