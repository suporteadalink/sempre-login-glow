-- Create trigger to synchronize company owner when opportunity owner changes
CREATE OR REPLACE FUNCTION public.sync_company_owner_on_opportunity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update company owner to match opportunity owner when opportunity owner changes
    IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
        UPDATE public.companies 
        SET owner_id = NEW.owner_id
        WHERE id = NEW.company_id;
        
        -- Log the synchronization activity
        INSERT INTO public.activity_log (description, type, user_id, related_company_id, related_opportunity_id)
        VALUES (
            'Responsável da empresa automaticamente sincronizado com a oportunidade "' || NEW.title || '".',
            'COMPANY_UPDATED',
            NEW.owner_id,
            NEW.company_id,
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for opportunity owner changes
CREATE TRIGGER sync_company_owner_trigger
    AFTER UPDATE ON public.opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_company_owner_on_opportunity_change();

-- Function to fix existing inconsistencies
CREATE OR REPLACE FUNCTION public.fix_company_opportunity_owner_inconsistencies()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    fixed_count INTEGER := 0;
    inconsistency_record RECORD;
BEGIN
    -- Find and fix all inconsistencies where company owner != opportunity owner
    FOR inconsistency_record IN 
        SELECT DISTINCT 
            c.id as company_id,
            c.name as company_name,
            c.owner_id as current_company_owner,
            o.owner_id as opportunity_owner
        FROM companies c
        INNER JOIN opportunities o ON c.id = o.company_id
        WHERE c.owner_id != o.owner_id
    LOOP
        -- Update company owner to match opportunity owner
        UPDATE companies 
        SET owner_id = inconsistency_record.opportunity_owner
        WHERE id = inconsistency_record.company_id;
        
        -- Log the fix
        INSERT INTO activity_log (description, type, user_id, related_company_id)
        VALUES (
            'Responsável da empresa "' || inconsistency_record.company_name || '" corrigido para manter consistência com oportunidades.',
            'COMPANY_UPDATED',
            inconsistency_record.opportunity_owner,
            inconsistency_record.company_id
        );
        
        fixed_count := fixed_count + 1;
    END LOOP;
    
    RETURN json_build_object(
        'message', 'Inconsistências corrigidas com sucesso',
        'fixed_count', fixed_count
    );
END;
$$;

-- Execute the fix function immediately
SELECT public.fix_company_opportunity_owner_inconsistencies();