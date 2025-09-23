-- Add stage_id column to companies table
ALTER TABLE public.companies 
ADD COLUMN stage_id bigint REFERENCES public.pipeline_stages(id);

-- Create index for better performance
CREATE INDEX idx_companies_stage_id ON public.companies(stage_id);

-- Migrate existing data: set stage_id for companies based on their opportunities
UPDATE public.companies 
SET stage_id = (
    SELECT o.stage_id 
    FROM public.opportunities o 
    WHERE o.company_id = companies.id 
    ORDER BY o.created_at DESC 
    LIMIT 1
)
WHERE type = 'Lead' AND stage_id IS NULL;

-- For companies without opportunities, set to first pipeline stage
UPDATE public.companies 
SET stage_id = (SELECT id FROM public.pipeline_stages ORDER BY "order" LIMIT 1)
WHERE type = 'Lead' AND stage_id IS NULL;

-- Create function to sync company and opportunity stages bidirectionally
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

-- Create triggers for bidirectional sync
CREATE TRIGGER sync_company_stage_trigger
    AFTER UPDATE OF stage_id ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_company_opportunity_stages();

CREATE TRIGGER sync_opportunity_stage_trigger
    AFTER UPDATE OF stage_id ON public.opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_company_opportunity_stages();

-- Enable RLS for companies table to ensure consistent permissions
-- (This should already be enabled, but ensuring it's properly configured)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;