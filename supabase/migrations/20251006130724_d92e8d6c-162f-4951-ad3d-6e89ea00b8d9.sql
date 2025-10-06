-- Renomear tabela tasks para follow_ups
ALTER TABLE public.tasks RENAME TO follow_ups;

-- Renomear constraints e índices
ALTER INDEX IF EXISTS tasks_pkey RENAME TO follow_ups_pkey;
ALTER INDEX IF EXISTS idx_tasks_company_id RENAME TO idx_follow_ups_company_id;
ALTER INDEX IF EXISTS idx_tasks_contact_id RENAME TO idx_follow_ups_contact_id;
ALTER INDEX IF EXISTS idx_tasks_opportunity_id RENAME TO idx_follow_ups_opportunity_id;
ALTER INDEX IF EXISTS idx_tasks_project_id RENAME TO idx_follow_ups_project_id;
ALTER INDEX IF EXISTS idx_tasks_responsible_id RENAME TO idx_follow_ups_responsible_id;

-- Renomear foreign key constraints
ALTER TABLE public.follow_ups RENAME CONSTRAINT tasks_company_id_fkey TO follow_ups_company_id_fkey;
ALTER TABLE public.follow_ups RENAME CONSTRAINT tasks_contact_id_fkey TO follow_ups_contact_id_fkey;
ALTER TABLE public.follow_ups RENAME CONSTRAINT tasks_opportunity_id_fkey TO follow_ups_opportunity_id_fkey;
ALTER TABLE public.follow_ups RENAME CONSTRAINT tasks_project_id_fkey TO follow_ups_project_id_fkey;
ALTER TABLE public.follow_ups RENAME CONSTRAINT tasks_responsible_id_fkey TO follow_ups_responsible_id_fkey;