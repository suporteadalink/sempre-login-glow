-- Adicionar nova coluna goal_type à tabela goals
ALTER TABLE public.goals ADD COLUMN goal_type TEXT NOT NULL DEFAULT 'valor';

-- Adicionar constraint para goal_type
ALTER TABLE public.goals ADD CONSTRAINT check_goal_type 
CHECK (goal_type IN ('valor', 'leads', 'projetos', 'conversao'));

-- Criar função para buscar progresso de metas de leads
CREATE OR REPLACE FUNCTION public.get_leads_goal_progress()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    goal_data json;
    target_value NUMERIC;
    current_value INT;
    progress_percentage NUMERIC;
    goal_name TEXT;
    goal_start_date DATE;
    goal_end_date DATE;
BEGIN
    -- Get the user's current active leads goal
    SELECT 
        g.name,
        g.target_value,
        g.start_date,
        g.end_date
    INTO 
        goal_name,
        target_value,
        goal_start_date,
        goal_end_date
    FROM goals g
    WHERE g.user_id = auth.uid()
      AND g.goal_type = 'leads'
      AND CURRENT_DATE BETWEEN g.start_date AND g.end_date
    ORDER BY g.created_at DESC
    LIMIT 1;

    -- If no active goal found, return null
    IF goal_name IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate current value from leads created within the goal period
    SELECT COUNT(*)
    INTO current_value
    FROM companies c
    WHERE c.owner_id = auth.uid()
      AND c.type = 'Lead'
      AND c.created_at >= goal_start_date
      AND c.created_at <= goal_end_date + INTERVAL '1 day';

    -- Calculate progress percentage
    IF target_value > 0 THEN
        progress_percentage := ROUND((current_value::NUMERIC / target_value) * 100, 2);
    ELSE
        progress_percentage := 0;
    END IF;

    -- Build the JSON response
    goal_data := json_build_object(
        'goalName', goal_name,
        'targetValue', target_value,
        'currentValue', current_value,
        'progressPercentage', progress_percentage,
        'startDate', goal_start_date,
        'endDate', goal_end_date,
        'goalType', 'leads'
    );

    RETURN goal_data;
END;
$function$;

-- Criar função para buscar progresso de metas de projetos
CREATE OR REPLACE FUNCTION public.get_projects_goal_progress()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    goal_data json;
    target_value NUMERIC;
    current_value INT;
    progress_percentage NUMERIC;
    goal_name TEXT;
    goal_start_date DATE;
    goal_end_date DATE;
BEGIN
    -- Get the user's current active projects goal
    SELECT 
        g.name,
        g.target_value,
        g.start_date,
        g.end_date
    INTO 
        goal_name,
        target_value,
        goal_start_date,
        goal_end_date
    FROM goals g
    WHERE g.user_id = auth.uid()
      AND g.goal_type = 'projetos'
      AND CURRENT_DATE BETWEEN g.start_date AND g.end_date
    ORDER BY g.created_at DESC
    LIMIT 1;

    -- If no active goal found, return null
    IF goal_name IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate current value from projects completed within the goal period
    SELECT COUNT(*)
    INTO current_value
    FROM projects p
    WHERE (
        p.manager_id = auth.uid() 
        OR p.company_id IN (
            SELECT c.id FROM companies c WHERE c.owner_id = auth.uid()
        )
    )
    AND p.status = 'Concluído'
    AND p.created_at >= goal_start_date
    AND p.created_at <= goal_end_date + INTERVAL '1 day';

    -- Calculate progress percentage
    IF target_value > 0 THEN
        progress_percentage := ROUND((current_value::NUMERIC / target_value) * 100, 2);
    ELSE
        progress_percentage := 0;
    END IF;

    -- Build the JSON response
    goal_data := json_build_object(
        'goalName', goal_name,
        'targetValue', target_value,
        'currentValue', current_value,
        'progressPercentage', progress_percentage,
        'startDate', goal_start_date,
        'endDate', goal_end_date,
        'goalType', 'projetos'
    );

    RETURN goal_data;
END;
$function$;

-- Criar função para buscar progresso de metas de conversão
CREATE OR REPLACE FUNCTION public.get_conversion_goal_progress()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    goal_data json;
    target_value NUMERIC;
    current_conversion_rate NUMERIC;
    progress_percentage NUMERIC;
    goal_name TEXT;
    goal_start_date DATE;
    goal_end_date DATE;
    total_leads INT;
    converted_leads INT;
BEGIN
    -- Get the user's current active conversion goal
    SELECT 
        g.name,
        g.target_value,
        g.start_date,
        g.end_date
    INTO 
        goal_name,
        target_value,
        goal_start_date,
        goal_end_date
    FROM goals g
    WHERE g.user_id = auth.uid()
      AND g.goal_type = 'conversao'
      AND CURRENT_DATE BETWEEN g.start_date AND g.end_date
    ORDER BY g.created_at DESC
    LIMIT 1;

    -- If no active goal found, return null
    IF goal_name IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate total leads created in period
    SELECT COUNT(*)
    INTO total_leads
    FROM companies c
    WHERE c.owner_id = auth.uid()
      AND c.created_at >= goal_start_date
      AND c.created_at <= goal_end_date + INTERVAL '1 day'
      AND c.type = 'Lead';

    -- Calculate leads that converted to clients
    SELECT COUNT(*)
    INTO converted_leads
    FROM companies c
    WHERE c.owner_id = auth.uid()
      AND c.created_at >= goal_start_date
      AND c.created_at <= goal_end_date + INTERVAL '1 day'
      AND c.type = 'Cliente';

    -- Calculate current conversion rate
    IF total_leads > 0 THEN
        current_conversion_rate := ROUND((converted_leads::NUMERIC / total_leads::NUMERIC) * 100, 2);
    ELSE
        current_conversion_rate := 0;
    END IF;

    -- Calculate progress percentage (how close to target conversion rate)
    IF target_value > 0 THEN
        progress_percentage := ROUND((current_conversion_rate / target_value) * 100, 2);
    ELSE
        progress_percentage := 0;
    END IF;

    -- Build the JSON response
    goal_data := json_build_object(
        'goalName', goal_name,
        'targetValue', target_value,
        'currentValue', current_conversion_rate,
        'progressPercentage', progress_percentage,
        'startDate', goal_start_date,
        'endDate', goal_end_date,
        'goalType', 'conversao',
        'totalLeads', total_leads,
        'convertedLeads', converted_leads
    );

    RETURN goal_data;
END;
$function$;

-- Atualizar a função existente de meta de valor para incluir goalType
CREATE OR REPLACE FUNCTION public.get_my_goal_progress()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    goal_data json;
    target_value NUMERIC;
    current_value NUMERIC;
    progress_percentage NUMERIC;
    goal_name TEXT;
    goal_start_date DATE;
    goal_end_date DATE;
BEGIN
    -- Get the user's current active value goal
    SELECT 
        g.name,
        g.target_value,
        g.start_date,
        g.end_date
    INTO 
        goal_name,
        target_value,
        goal_start_date,
        goal_end_date
    FROM goals g
    WHERE g.user_id = auth.uid()
      AND g.goal_type = 'valor'
      AND CURRENT_DATE BETWEEN g.start_date AND g.end_date
    ORDER BY g.created_at DESC
    LIMIT 1;

    -- If no active goal found, return null
    IF goal_name IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate current value from won opportunities within the goal period
    SELECT COALESCE(SUM(o.value), 0)
    INTO current_value
    FROM opportunities o
    JOIN pipeline_stages ps ON o.stage_id = ps.id
    WHERE o.owner_id = auth.uid()
      AND ps.name = 'Ganho'
      AND o.created_at >= goal_start_date
      AND o.created_at <= goal_end_date + INTERVAL '1 day';

    -- Calculate progress percentage
    IF target_value > 0 THEN
        progress_percentage := ROUND((current_value / target_value) * 100, 2);
    ELSE
        progress_percentage := 0;
    END IF;

    -- Build the JSON response
    goal_data := json_build_object(
        'goalName', goal_name,
        'targetValue', target_value,
        'currentValue', current_value,
        'progressPercentage', progress_percentage,
        'startDate', goal_start_date,
        'endDate', goal_end_date,
        'goalType', 'valor'
    );

    RETURN goal_data;
END;
$function$;