-- Function to get pipeline distribution data
CREATE OR REPLACE FUNCTION public.get_pipeline_distribution()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    pipeline_data json;
BEGIN
    -- Get pipeline distribution based on user role
    SELECT json_agg(
        json_build_object(
            'stage', ps.name,
            'count', COALESCE(stage_counts.count, 0),
            'color', ps.color
        )
        ORDER BY ps.order
    )
    INTO pipeline_data
    FROM pipeline_stages ps
    LEFT JOIN (
        SELECT 
            o.stage_id,
            COUNT(*) as count
        FROM opportunities o
        WHERE (
            -- If user is admin, see all opportunities
            (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
            OR 
            -- If user is vendedor, see only their own opportunities
            o.owner_id = auth.uid()
        )
        GROUP BY o.stage_id
    ) stage_counts ON ps.id = stage_counts.stage_id;

    RETURN COALESCE(pipeline_data, '[]'::json);
END;
$function$