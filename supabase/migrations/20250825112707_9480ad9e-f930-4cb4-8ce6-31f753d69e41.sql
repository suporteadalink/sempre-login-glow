-- Update get_dashboard_metrics function to filter data by user role
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    -- Variáveis para guardar os resultados
    total_revenue NUMERIC;
    active_leads INT;
    active_projects INT;
    conversion_rate NUMERIC;
    total_opportunities INT;
    won_opportunities INT;
    user_role TEXT;
    current_user_id UUID;
BEGIN
    -- Get current user info
    current_user_id := auth.uid();
    SELECT role INTO user_role FROM users WHERE id = current_user_id;

    -- Calcula a Receita Total (soma das oportunidades com stage 'Ganho')
    IF user_role = 'admin' THEN
        SELECT COALESCE(SUM(value), 0)
        INTO total_revenue
        FROM opportunities
        WHERE stage_id IN (SELECT id FROM pipeline_stages WHERE name = 'Ganho');
    ELSE
        SELECT COALESCE(SUM(value), 0)
        INTO total_revenue
        FROM opportunities
        WHERE stage_id IN (SELECT id FROM pipeline_stages WHERE name = 'Ganho')
          AND owner_id = current_user_id;
    END IF;

    -- Conta os Leads Ativos
    IF user_role = 'admin' THEN
        SELECT COUNT(*)
        INTO active_leads
        FROM companies
        WHERE type = 'Lead';
    ELSE
        SELECT COUNT(*)
        INTO active_leads
        FROM companies
        WHERE type = 'Lead'
          AND owner_id = current_user_id;
    END IF;

    -- Conta os Projetos Ativos
    IF user_role = 'admin' THEN
        SELECT COUNT(*)
        INTO active_projects
        FROM projects
        WHERE status = 'Em Andamento';
    ELSE
        SELECT COUNT(*)
        INTO active_projects
        FROM projects
        WHERE status = 'Em Andamento'
          AND (manager_id = current_user_id 
               OR company_id IN (SELECT id FROM companies WHERE owner_id = current_user_id));
    END IF;

    -- Calcula a Taxa de Conversão
    IF user_role = 'admin' THEN
        SELECT COUNT(*) INTO total_opportunities FROM opportunities;
        SELECT COUNT(*) INTO won_opportunities FROM opportunities WHERE stage_id IN (SELECT id FROM pipeline_stages WHERE name = 'Ganho');
    ELSE
        SELECT COUNT(*) INTO total_opportunities FROM opportunities WHERE owner_id = current_user_id;
        SELECT COUNT(*) INTO won_opportunities FROM opportunities WHERE stage_id IN (SELECT id FROM pipeline_stages WHERE name = 'Ganho') AND owner_id = current_user_id;
    END IF;

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
$function$