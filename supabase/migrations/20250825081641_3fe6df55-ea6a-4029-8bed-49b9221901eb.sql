-- Restaurar a política original corrigida
DROP POLICY IF EXISTS "Usuários logados podem criar novas empresas" ON public.companies;

CREATE POLICY "Usuários logados podem criar novas empresas" 
ON public.companies 
FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND
    owner_id = auth.uid()
);