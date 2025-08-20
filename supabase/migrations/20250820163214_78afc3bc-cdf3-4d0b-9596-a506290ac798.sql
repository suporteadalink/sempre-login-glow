-- Add DELETE policy for opportunities table - only admins can delete
CREATE POLICY "Apenas admins podem excluir oportunidades" 
ON public.opportunities 
FOR DELETE 
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);