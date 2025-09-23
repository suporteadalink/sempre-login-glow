-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.get_leads_goal_progress()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_projects_goal_progress()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;