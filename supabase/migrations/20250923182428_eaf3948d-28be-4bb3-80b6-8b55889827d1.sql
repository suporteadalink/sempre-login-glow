-- Remove the current trigger that syncs company when opportunity changes
DROP TRIGGER IF EXISTS sync_company_owner_trigger ON public.opportunities;
DROP FUNCTION IF EXISTS public.sync_company_owner_on_opportunity_change();

-- Create new trigger to sync opportunities when company owner changes
CREATE OR REPLACE FUNCTION public.sync_opportunities_owner_on_company_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update all opportunities' owner to match company owner when company owner changes
    IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
        UPDATE public.opportunities 
        SET owner_id = NEW.owner_id
        WHERE company_id = NEW.id;
        
        -- Log the synchronization activity
        INSERT INTO public.activity_log (description, type, user_id, related_company_id)
        VALUES (
            'Oportunidades da empresa "' || NEW.name || '" foram automaticamente sincronizadas com o novo responsável.',
            'OPPORTUNITIES_UPDATED',
            NEW.owner_id,
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for company owner changes
CREATE TRIGGER sync_opportunities_owner_trigger
    AFTER UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_opportunities_owner_on_company_change();

-- Fix current data to ensure companies are the source of truth
-- Update all opportunities to match their company's owner
UPDATE opportunities 
SET owner_id = companies.owner_id
FROM companies 
WHERE opportunities.company_id = companies.id 
AND opportunities.owner_id != companies.owner_id;

-- Log the synchronization
INSERT INTO activity_log (description, type, user_id)
VALUES (
    'Todas as oportunidades foram sincronizadas com os responsáveis das empresas.',
    'BULK_SYNC',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);