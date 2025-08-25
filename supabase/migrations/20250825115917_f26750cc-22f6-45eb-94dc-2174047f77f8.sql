-- Adicionar novos campos à tabela tasks para melhorar o formulário de tarefas
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS opportunity_id bigint REFERENCES public.opportunities(id),
ADD COLUMN IF NOT EXISTS estimated_hours numeric,
ADD COLUMN IF NOT EXISTS notes text;