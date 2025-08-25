-- Corrigir a função para ter search_path definido
CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN format('auth.uid(): %s, auth.role(): %s', auth.uid(), auth.role());
END;
$$;