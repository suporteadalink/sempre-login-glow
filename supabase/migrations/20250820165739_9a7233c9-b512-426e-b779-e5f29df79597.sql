-- Create trigger to handle cascade deletion for users
CREATE OR REPLACE FUNCTION public.delete_user_cascade()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete related goals first
  DELETE FROM public.goals WHERE user_id = OLD.id;
  
  -- Update related records to remove user reference or handle as needed
  UPDATE public.opportunities SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.companies SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.contacts SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.proposals SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.tasks SET responsible_id = NULL WHERE responsible_id = OLD.id;
  UPDATE public.projects SET manager_id = NULL WHERE manager_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;