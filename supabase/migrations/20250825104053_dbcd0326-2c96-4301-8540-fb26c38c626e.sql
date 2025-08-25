-- Atualizar a política de DELETE da tabela opportunities
-- para permitir que vendedores excluam suas próprias oportunidades
DROP POLICY IF EXISTS "Apenas admins podem excluir oportunidades" ON public.opportunities;

CREATE POLICY "Usuários podem excluir suas próprias oportunidades ou admins podem excluir qualquer uma" 
ON public.opportunities 
FOR DELETE 
USING (
  owner_id = auth.uid() OR 
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);