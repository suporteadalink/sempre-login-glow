-- Add tracking fields for AI integration
ALTER TABLE public.companies 
ADD COLUMN source TEXT DEFAULT 'manual',
ADD COLUMN ai_confidence NUMERIC,
ADD COLUMN ai_metadata JSONB;

ALTER TABLE public.contacts 
ADD COLUMN source TEXT DEFAULT 'manual',
ADD COLUMN ai_confidence NUMERIC,
ADD COLUMN ai_metadata JSONB;

ALTER TABLE public.opportunities 
ADD COLUMN source TEXT DEFAULT 'manual',
ADD COLUMN ai_confidence NUMERIC,
ADD COLUMN ai_metadata JSONB;

-- Add index for better query performance on source field
CREATE INDEX idx_companies_source ON public.companies(source);
CREATE INDEX idx_contacts_source ON public.contacts(source);
CREATE INDEX idx_opportunities_source ON public.opportunities(source);

-- Update activity log to track AI actions
ALTER TABLE public.activity_log 
ADD COLUMN source TEXT DEFAULT 'manual',
ADD COLUMN ai_metadata JSONB;