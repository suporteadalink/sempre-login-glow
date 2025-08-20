-- Add RLS policies for goals table
CREATE POLICY "Users can view their own goals or admins can view all"
ON public.goals
FOR SELECT
USING (
  user_id = auth.uid() OR 
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can create goals"
ON public.goals  
FOR INSERT
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can update goals"
ON public.goals
FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can delete goals"
ON public.goals
FOR DELETE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Add RLS policies for project_additions table
CREATE POLICY "Users can view project additions if they own the project or company"
ON public.project_additions
FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM projects p 
    WHERE p.manager_id = auth.uid() 
    OR p.company_id IN (
      SELECT c.id FROM companies c WHERE c.owner_id = auth.uid()
    )
  ) OR 
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Users can create project additions for their projects"
ON public.project_additions
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT p.id FROM projects p 
    WHERE p.manager_id = auth.uid() 
    OR p.company_id IN (
      SELECT c.id FROM companies c WHERE c.owner_id = auth.uid()
    )
  ) OR 
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Users can update project additions for their projects"
ON public.project_additions
FOR UPDATE
USING (
  project_id IN (
    SELECT p.id FROM projects p 
    WHERE p.manager_id = auth.uid() 
    OR p.company_id IN (
      SELECT c.id FROM companies c WHERE c.owner_id = auth.uid()
    )
  ) OR 
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Users can delete project additions for their projects"
ON public.project_additions
FOR DELETE
USING (
  project_id IN (
    SELECT p.id FROM projects p 
    WHERE p.manager_id = auth.uid() 
    OR p.company_id IN (
      SELECT c.id FROM companies c WHERE c.owner_id = auth.uid()
    )
  ) OR 
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);