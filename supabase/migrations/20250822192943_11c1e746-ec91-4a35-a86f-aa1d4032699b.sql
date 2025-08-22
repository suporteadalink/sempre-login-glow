-- Corrigir search_path das funções existentes
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Corrigir outras funções com search_path
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    -- Variáveis para guardar os resultados
    total_revenue NUMERIC;
    active_leads INT;
    active_projects INT;
    conversion_rate NUMERIC;
    total_opportunities INT;
    won_opportunities INT;
BEGIN
    -- Calcula a Receita Total (soma das oportunidades com stage 'Ganho')
    SELECT COALESCE(SUM(value), 0)
    INTO total_revenue
    FROM opportunities
    WHERE stage_id IN (SELECT id FROM pipeline_stages WHERE name = 'Ganho');

    -- Conta os Leads Ativos
    SELECT COUNT(*)
    INTO active_leads
    FROM companies
    WHERE type = 'Lead';

    -- Conta os Projetos Ativos
    SELECT COUNT(*)
    INTO active_projects
    FROM projects
    WHERE status = 'Em Andamento';

    -- Calcula a Taxa de Conversão
    SELECT COUNT(*) INTO total_opportunities FROM opportunities;
    SELECT COUNT(*) INTO won_opportunities FROM opportunities WHERE stage_id IN (SELECT id FROM pipeline_stages WHERE name = 'Ganho');

    IF total_opportunities > 0 THEN
        conversion_rate := (won_opportunities::NUMERIC / total_opportunities::NUMERIC) * 100;
    ELSE
        conversion_rate := 0;
    END IF;

    -- Monta o objeto JSON de retorno
    RETURN json_build_object(
        'totalRevenue', total_revenue,
        'activeLeads', active_leads,
        'activeProjects', active_projects,
        'conversionRate', conversion_rate
    );
END;
$function$;