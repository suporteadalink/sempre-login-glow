-- Função para lidar com a aceitação de propostas
CREATE OR REPLACE FUNCTION public.handle_proposal_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    project_record RECORD;
    user_name TEXT;
BEGIN
    -- Verifica se o status mudou para 'Aceita' e se há um projeto vinculado
    IF NEW.status = 'Aceita' AND OLD.status != 'Aceita' AND NEW.project_id IS NOT NULL THEN
        -- Busca o projeto vinculado
        SELECT p.*, c.name as company_name 
        INTO project_record 
        FROM projects p
        LEFT JOIN companies c ON p.company_id = c.id
        WHERE p.id = NEW.project_id;
        
        -- Se o projeto existe e está com status 'Proposta', muda para 'Em Andamento'
        IF project_record.id IS NOT NULL AND project_record.status = 'Proposta' THEN
            -- Atualiza o status do projeto
            UPDATE projects 
            SET status = 'Em Andamento'
            WHERE id = NEW.project_id;
            
            -- Busca o nome do usuário que fez a mudança
            SELECT name INTO user_name
            FROM users 
            WHERE id = NEW.owner_id;
            
            -- Registra a ação no log de atividades
            INSERT INTO activity_log (
                description, 
                type, 
                user_id, 
                related_company_id, 
                related_project_id
            )
            VALUES (
                'Projeto "' || project_record.title || '" foi automaticamente alterado para Em Andamento devido à aceitação da proposta "' || NEW.title || '".',
                'PROJECT_UPDATED',
                NEW.owner_id,
                project_record.company_id,
                NEW.project_id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$