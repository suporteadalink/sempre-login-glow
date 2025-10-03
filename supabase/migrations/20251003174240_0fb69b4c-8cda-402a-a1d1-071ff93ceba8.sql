
-- Transferir todos os registros da Karina Guimaraes para Adalink
-- Karina ID: c0233013-2e47-4a50-9510-bd8879bebe41
-- Adalink ID: 5fc094e9-cdb0-4c94-a093-7c446ad9121d

-- Transferir empresas
UPDATE public.companies 
SET owner_id = '5fc094e9-cdb0-4c94-a093-7c446ad9121d' 
WHERE owner_id = 'c0233013-2e47-4a50-9510-bd8879bebe41';

-- Transferir tarefas
UPDATE public.tasks 
SET responsible_id = '5fc094e9-cdb0-4c94-a093-7c446ad9121d' 
WHERE responsible_id = 'c0233013-2e47-4a50-9510-bd8879bebe41';

-- Transferir oportunidades
UPDATE public.opportunities 
SET owner_id = '5fc094e9-cdb0-4c94-a093-7c446ad9121d' 
WHERE owner_id = 'c0233013-2e47-4a50-9510-bd8879bebe41';

-- Transferir propostas
UPDATE public.proposals 
SET owner_id = '5fc094e9-cdb0-4c94-a093-7c446ad9121d' 
WHERE owner_id = 'c0233013-2e47-4a50-9510-bd8879bebe41';

-- Transferir projetos
UPDATE public.projects 
SET manager_id = '5fc094e9-cdb0-4c94-a093-7c446ad9121d' 
WHERE manager_id = 'c0233013-2e47-4a50-9510-bd8879bebe41';

-- Transferir contatos
UPDATE public.contacts 
SET owner_id = '5fc094e9-cdb0-4c94-a093-7c446ad9121d' 
WHERE owner_id = 'c0233013-2e47-4a50-9510-bd8879bebe41';

-- Transferir metas
UPDATE public.goals 
SET user_id = '5fc094e9-cdb0-4c94-a093-7c446ad9121d' 
WHERE user_id = 'c0233013-2e47-4a50-9510-bd8879bebe41';

-- Atualizar atividades no log
UPDATE public.activity_log 
SET user_id = '5fc094e9-cdb0-4c94-a093-7c446ad9121d' 
WHERE user_id = 'c0233013-2e47-4a50-9510-bd8879bebe41';

-- Excluir a usuária Karina Guimaraes
DELETE FROM public.users WHERE id = 'c0233013-2e47-4a50-9510-bd8879bebe41';
