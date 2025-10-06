-- Garante que RLS está habilitado na tabela users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remove todas as políticas existentes para recriar com segurança
DROP POLICY IF EXISTS "Admin can delete users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete any user" ON public.users;
DROP POLICY IF EXISTS "Admins can insert new users" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Usuários logados podem ver os perfis uns dos outros" ON public.users;

-- Cria função de segurança para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  )
$$;

-- Política SELECT: Apenas usuários autenticados podem ver perfis
CREATE POLICY "Authenticated users can view profiles"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Política INSERT: Apenas admins podem criar usuários
CREATE POLICY "Only admins can create users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Política UPDATE: Apenas admins podem atualizar usuários
CREATE POLICY "Only admins can update users"
ON public.users
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Política DELETE: Apenas admins podem deletar usuários
CREATE POLICY "Only admins can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (public.is_admin());