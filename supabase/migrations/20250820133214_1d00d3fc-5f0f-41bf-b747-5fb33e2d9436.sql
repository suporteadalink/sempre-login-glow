-- Add update and delete policies for proposals table
CREATE POLICY "Usuários podem atualizar suas próprias propostas ou se forem adm" 
ON public.proposals 
FOR UPDATE 
USING ((owner_id = auth.uid()) OR ((SELECT users.role FROM users WHERE users.id = auth.uid()) = 'admin'));

CREATE POLICY "Usuários podem deletar suas próprias propostas ou se forem adm" 
ON public.proposals 
FOR DELETE 
USING ((owner_id = auth.uid()) OR ((SELECT users.role FROM users WHERE users.id = auth.uid()) = 'admin'));