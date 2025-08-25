-- Função para verificar o contexto do auth.uid() durante insert
CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS TEXT AS $$
BEGIN
    RETURN format('auth.uid(): %s, auth.role(): %s', auth.uid(), auth.role());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Temporariamente, vamos modificar a política para permitir debug
DROP POLICY IF EXISTS "Usuários logados podem criar novas empresas" ON public.companies;

CREATE POLICY "Usuários logados podem criar novas empresas" 
ON public.companies 
FOR INSERT 
WITH CHECK (
    -- Log para debug
    (SELECT debug_auth_context()) IS NOT NULL AND
    -- Verifica se o usuário está autenticado
    auth.role() = 'authenticated' AND
    -- Verifica se o owner_id é válido
    owner_id IS NOT NULL AND
    -- Verifica se o owner_id pertence a um usuário ativo
    owner_id IN (SELECT id FROM public.users WHERE status = 'Ativo')
);