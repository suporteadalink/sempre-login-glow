-- Fix security issues with search_path for functions
ALTER FUNCTION public.get_dashboard_metrics() SET search_path = public;
ALTER FUNCTION public.log_new_company() SET search_path = public;
ALTER FUNCTION public.get_recent_activities() SET search_path = public;
ALTER FUNCTION public.get_my_goal_progress() SET search_path = public;