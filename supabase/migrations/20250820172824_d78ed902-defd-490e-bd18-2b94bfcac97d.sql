-- Function to get conversion trend data (last 6 months)
CREATE OR REPLACE FUNCTION public.get_conversion_trend()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    trend_data json;
BEGIN
    -- Get monthly conversion data for the last 6 months
    SELECT json_agg(
        json_build_object(
            'month', month_name,
            'conversions', COALESCE(conversions, 0),
            'total_opportunities', COALESCE(total_opps, 0),
            'conversion_rate', COALESCE(
                CASE 
                    WHEN total_opps > 0 THEN ROUND((conversions::NUMERIC / total_opps::NUMERIC) * 100, 1)
                    ELSE 0 
                END, 
                0
            )
        )
        ORDER BY month_date
    )
    INTO trend_data
    FROM (
        SELECT 
            TO_CHAR(month_date, 'Mon/YY') as month_name,
            month_date,
            COUNT(CASE WHEN won_stage.id IS NOT NULL THEN 1 END) as conversions,
            COUNT(*) as total_opps
        FROM (
            SELECT 
                date_trunc('month', generate_series(
                    date_trunc('month', CURRENT_DATE - INTERVAL '5 months'),
                    date_trunc('month', CURRENT_DATE),
                    INTERVAL '1 month'
                )) as month_date
        ) months
        LEFT JOIN opportunities o ON (
            date_trunc('month', o.created_at) = months.month_date
            AND (
                -- If user is admin, see all opportunities
                (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
                OR 
                -- If user is vendedor, see only their own opportunities
                o.owner_id = auth.uid()
            )
        )
        LEFT JOIN pipeline_stages won_stage ON (
            o.stage_id = won_stage.id 
            AND won_stage.name = 'Ganho'
        )
        GROUP BY month_date, month_name
    ) monthly_data;

    RETURN COALESCE(trend_data, '[]'::json);
END;
$function$