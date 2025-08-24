-- Add project_id column to proposals table
ALTER TABLE public.proposals 
ADD COLUMN project_id bigint;

-- Add foreign key constraint (optional, for data integrity)
ALTER TABLE public.proposals 
ADD CONSTRAINT fk_proposals_project_id 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- Update RLS policies to include project access
-- Users can view proposals if they own the proposal, own the company, own the project, or are admin
DROP POLICY IF EXISTS "SELECT: Dono da proposta, Dono da empresa ou Admin" ON public.proposals;

CREATE POLICY "SELECT: Dono da proposta, Dono da empresa, Dono do projeto ou Admin" 
ON public.proposals FOR SELECT 
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  OR owner_id = auth.uid() 
  OR company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  OR project_id IN (SELECT id FROM projects WHERE manager_id = auth.uid())
);