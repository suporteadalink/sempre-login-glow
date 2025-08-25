-- Create function to safely delete opportunities with all related records
CREATE OR REPLACE FUNCTION public.delete_opportunity_with_relations(opportunity_id_param bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all related records in the correct order to avoid foreign key violations
  
  -- Delete activity logs that reference this opportunity
  DELETE FROM public.activity_log WHERE related_opportunity_id = opportunity_id_param;
  
  -- Delete the opportunity
  DELETE FROM public.opportunities WHERE id = opportunity_id_param;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, the transaction will be rolled back
    RAISE EXCEPTION 'Error deleting opportunity: %', SQLERRM;
    RETURN FALSE;
END;
$$;