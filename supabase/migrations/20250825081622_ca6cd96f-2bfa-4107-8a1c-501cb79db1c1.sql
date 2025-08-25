-- Temporariamente, vamos simplificar a política para identificar o problema
DROP POLICY IF EXISTS "Usuários logados podem criar novas empresas" ON public.companies;

CREATE POLICY "Usuários logados podem criar novas empresas" 
ON public.companies 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');