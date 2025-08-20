-- Create trigger for user deletion
CREATE TRIGGER before_user_delete
  BEFORE DELETE ON public.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.delete_user_cascade();