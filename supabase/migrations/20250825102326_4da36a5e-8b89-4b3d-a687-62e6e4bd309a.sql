-- Fix RLS policy for opportunities INSERT to allow admins to assign ownership
DROP POLICY IF EXISTS "Usuários logados podem criar oportunidades" ON public.opportunities;

CREATE POLICY "Usuários logados podem criar oportunidades" 
ON public.opportunities 
FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND (
        -- Regular users can only create opportunities they own
        owner_id = auth.uid() 
        OR 
        -- Admins can assign ownership to any user
        (
            (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
            AND owner_id IS NOT NULL
        )
    )
);