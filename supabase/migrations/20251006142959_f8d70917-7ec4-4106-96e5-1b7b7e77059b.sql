-- Corrige o search_path de funções existentes para prevenir ataques de injeção

-- Função delete_company_with_relations
CREATE OR REPLACE FUNCTION public.delete_company_with_relations(company_id_param bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.activity_log WHERE related_company_id = company_id_param;
  DELETE FROM public.follow_ups WHERE company_id = company_id_param;
  DELETE FROM public.opportunities WHERE contact_id IN (
    SELECT id FROM public.contacts WHERE company_id = company_id_param
  );
  DELETE FROM public.opportunities WHERE company_id = company_id_param;
  DELETE FROM public.contacts WHERE company_id = company_id_param;
  DELETE FROM public.proposals WHERE company_id = company_id_param;
  DELETE FROM public.projects WHERE company_id = company_id_param;
  DELETE FROM public.companies WHERE id = company_id_param;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting company: %', SQLERRM;
    RETURN FALSE;
END;
$function$;

-- Função delete_opportunity_with_relations
CREATE OR REPLACE FUNCTION public.delete_opportunity_with_relations(opportunity_id_param bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.activity_log WHERE related_opportunity_id = opportunity_id_param;
  DELETE FROM public.opportunities WHERE id = opportunity_id_param;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting opportunity: %', SQLERRM;
    RETURN FALSE;
END;
$function$;

-- Função initialize_proposal_versions
CREATE OR REPLACE FUNCTION public.initialize_proposal_versions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  prop RECORD;
BEGIN
  FOR prop IN 
    SELECT p.* FROM public.proposals p 
    WHERE NOT EXISTS (
      SELECT 1 FROM public.proposal_versions pv WHERE pv.proposal_id = p.id
    )
  LOOP
    INSERT INTO public.proposal_versions (
      proposal_id, version_number, title, value, status, pdf_url,
      change_description, changed_by, is_current
    ) VALUES (
      prop.id, prop.current_version, prop.title, prop.value, prop.status,
      prop.pdf_url, 'Versão inicial', prop.owner_id, true
    );
  END LOOP;
END;
$function$;

-- Função create_proposal_version
CREATE OR REPLACE FUNCTION public.create_proposal_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF OLD.title IS DISTINCT FROM NEW.title OR 
     OLD.value IS DISTINCT FROM NEW.value OR 
     OLD.status IS DISTINCT FROM NEW.status OR 
     OLD.pdf_url IS DISTINCT FROM NEW.pdf_url THEN
    
    UPDATE public.proposal_versions 
    SET is_current = false 
    WHERE proposal_id = NEW.id;
    
    NEW.current_version = COALESCE(OLD.current_version, 1) + 1;
    NEW.version_count = COALESCE(OLD.version_count, 1) + 1;
    
    INSERT INTO public.proposal_versions (
      proposal_id, version_number, title, value, status, pdf_url,
      change_description, changed_by, is_current
    ) VALUES (
      NEW.id, NEW.current_version, NEW.title, NEW.value, NEW.status, NEW.pdf_url,
      CASE 
        WHEN OLD.title IS DISTINCT FROM NEW.title THEN 'Título alterado'
        WHEN OLD.value IS DISTINCT FROM NEW.value THEN 'Valor alterado'
        WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'Status alterado'
        WHEN OLD.pdf_url IS DISTINCT FROM NEW.pdf_url THEN 'PDF atualizado'
        ELSE 'Proposta atualizada'
      END,
      auth.uid(), true
    );
  END IF;
  RETURN NEW;
END;
$function$;