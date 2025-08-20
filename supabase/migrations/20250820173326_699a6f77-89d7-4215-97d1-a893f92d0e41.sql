-- Update the delete_company_with_relations function to handle the correct deletion order
CREATE OR REPLACE FUNCTION public.delete_company_with_relations(company_id_param bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Delete all related records in the correct order to avoid foreign key violations
  
  -- Delete activity logs first
  DELETE FROM public.activity_log WHERE related_company_id = company_id_param;
  
  -- Delete tasks that reference this company
  DELETE FROM public.tasks WHERE company_id = company_id_param;
  
  -- Delete opportunities that reference contacts from this company
  DELETE FROM public.opportunities WHERE contact_id IN (
    SELECT id FROM public.contacts WHERE company_id = company_id_param
  );
  
  -- Delete opportunities that reference this company directly
  DELETE FROM public.opportunities WHERE company_id = company_id_param;
  
  -- Now we can safely delete contacts
  DELETE FROM public.contacts WHERE company_id = company_id_param;
  
  -- Delete proposals
  DELETE FROM public.proposals WHERE company_id = company_id_param;
  
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
$function$