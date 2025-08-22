-- Função para converter Lead em Cliente automaticamente
CREATE OR REPLACE FUNCTION public.handle_lead_to_client_conversion()
RETURNS TRIGGER AS $$
DECLARE
    old_stage_name TEXT;
    new_stage_name TEXT;
BEGIN
    -- Busca o nome da etapa anterior
    SELECT name INTO old_stage_name
    FROM pipeline_stages 
    WHERE id = OLD.stage_id;
    
    -- Busca o nome da nova etapa
    SELECT name INTO new_stage_name
    FROM pipeline_stages 
    WHERE id = NEW.stage_id;
    
    -- Verifica se houve mudança de 'Novo Lead' para 'Orçamento'
    IF old_stage_name = 'Novo Lead' AND new_stage_name = 'Orçamento' THEN
        -- Atualiza o tipo da empresa de 'Lead' para 'Cliente'
        UPDATE public.companies 
        SET type = 'Cliente'
        WHERE id = NEW.company_id 
          AND type = 'Lead';
          
        -- Log da atividade
        INSERT INTO public.activity_log (description, type, user_id, related_company_id, related_opportunity_id)
        VALUES (
            'Empresa promovida automaticamente de Lead para Cliente devido ao avanço da oportunidade "' || NEW.title || '" para Orçamento.',
            'COMPANY_UPDATED',
            NEW.owner_id,
            NEW.company_id,
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que executa a função em atualizações da tabela opportunities
CREATE TRIGGER on_opportunity_stage_change
    AFTER UPDATE ON public.opportunities
    FOR EACH ROW
    WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id)
    EXECUTE FUNCTION public.handle_lead_to_client_conversion();