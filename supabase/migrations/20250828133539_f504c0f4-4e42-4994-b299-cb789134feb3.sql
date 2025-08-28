-- Add project_id field to opportunities table
ALTER TABLE public.opportunities 
ADD COLUMN project_id bigint REFERENCES public.projects(id);

-- Add index for better performance
CREATE INDEX idx_opportunities_project_id ON public.opportunities(project_id);