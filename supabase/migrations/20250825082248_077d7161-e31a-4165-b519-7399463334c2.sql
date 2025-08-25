-- Fix RLS policy for companies INSERT to allow admins to assign ownership
DROP POLICY IF EXISTS "Usuários logados podem criar novas empresas" ON public.companies;

CREATE POLICY "Usuários logados podem criar novas empresas" 
ON public.companies 
FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND (
        -- Regular users can only create companies they own
        owner_id = auth.uid() 
        OR 
        -- Admins can assign ownership to any user
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
            AND owner_id IS NOT NULL
        )
    )
);