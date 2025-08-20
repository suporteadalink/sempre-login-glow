-- Create function to get recent activities
CREATE OR REPLACE FUNCTION public.get_recent_activities()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    activities_json json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', id,
            'description', description,
            'type', type,
            'created_at', created_at,
            'user_id', user_id,
            'related_company_id', related_company_id
        )
        ORDER BY created_at DESC
    )
    INTO activities_json
    FROM activity_log
    WHERE created_at >= NOW() - INTERVAL '30 days'
    LIMIT 10;

    RETURN COALESCE(activities_json, '[]'::json);
END;
$function$;