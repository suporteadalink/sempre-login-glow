-- Create function to get current user's goal progress
CREATE OR REPLACE FUNCTION public.get_my_goal_progress()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
    -- Get the user's current active goal (goal that encompasses current date)
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
        'endDate', goal_end_date
    );

    RETURN goal_data;
END;
$function$;