-- Check if functions exist and recreate triggers
SELECT 'Checking functions...' as status;

-- Recreate the sync function (may have been lost)
CREATE OR REPLACE FUNCTION public.sync_company_opportunity_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Handle company stage updates
    IF TG_TABLE_NAME = 'companies' THEN
        -- When company stage changes, update all related opportunities
        IF OLD.stage_id IS DISTINCT FROM NEW.stage_id AND NEW.stage_id IS NOT NULL THEN
            UPDATE public.opportunities 
            SET stage_id = NEW.stage_id
            WHERE company_id = NEW.id;
            
            -- Log the activity
            INSERT INTO public.activity_log (description, type, user_id, related_company_id)
            VALUES (
                'Etapa da empresa "' || NEW.name || '" alterada para "' || (SELECT name FROM pipeline_stages WHERE id = NEW.stage_id) || '". Oportunidades sincronizadas automaticamente.',
                'COMPANY_STAGE_UPDATED',
                COALESCE(NEW.owner_id, auth.uid()),
                NEW.id
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle opportunity stage updates
    IF TG_TABLE_NAME = 'opportunities' THEN
        -- When opportunity stage changes, update the company stage if it's a Lead
        IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
            UPDATE public.companies 
            SET stage_id = NEW.stage_id
            WHERE id = NEW.company_id AND type = 'Lead';
            
            -- Log the activity
            INSERT INTO public.activity_log (description, type, user_id, related_company_id, related_opportunity_id)
            VALUES (
                'Oportunidade "' || NEW.title || '" movida para "' || (SELECT name FROM pipeline_stages WHERE id = NEW.stage_id) || '". Empresa sincronizada automaticamente.',
                'OPPORTUNITY_STAGE_UPDATED',
                NEW.owner_id,
                NEW.company_id,
                NEW.id
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS sync_company_stage_trigger ON public.companies;
DROP TRIGGER IF EXISTS sync_opportunity_stage_trigger ON public.opportunities;

-- Create triggers for bidirectional sync
CREATE TRIGGER sync_company_stage_trigger
    AFTER UPDATE OF stage_id ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_company_opportunity_stages();

CREATE TRIGGER sync_opportunity_stage_trigger
    AFTER UPDATE OF stage_id ON public.opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_company_opportunity_stages();

SELECT 'Triggers created successfully!' as status;