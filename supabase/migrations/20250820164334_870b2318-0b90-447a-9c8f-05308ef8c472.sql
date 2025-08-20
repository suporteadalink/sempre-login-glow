-- Create a function to safely delete a company and all related records
CREATE OR REPLACE FUNCTION public.delete_company_with_relations(company_id_param BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all related records in the correct order
  
  -- Delete activity logs
  DELETE FROM public.activity_log WHERE related_company_id = company_id_param;
  
  -- Delete tasks
  DELETE FROM public.tasks WHERE company_id = company_id_param;
  
  -- Delete contacts
  DELETE FROM public.contacts WHERE company_id = company_id_param;
  
  -- Delete proposals
  DELETE FROM public.proposals WHERE company_id = company_id_param;
  
  -- Delete opportunities
  DELETE FROM public.opportunities WHERE company_id = company_id_param;
  
  -- Delete projects
  DELETE FROM public.projects WHERE company_id = company_id_param;
  
  -- Finally delete the company
  DELETE FROM public.companies WHERE id = company_id_param;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, the transaction will be rolled back
    RAISE EXCEPTION 'Error deleting company: %', SQLERRM;
    RETURN FALSE;
END;
$$;