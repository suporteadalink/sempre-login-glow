-- =====================================================
-- CRITICAL SECURITY FIX: Implement proper role-based access control
-- This migration addresses privilege escalation vulnerabilities
-- =====================================================

-- Step 1: Create app_role enum type
CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor');

-- Step 2: Create user_roles table with proper structure
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Step 4: Migrate existing role data from users.role to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::public.app_role
FROM public.users
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 6: Update is_admin() function to use new user_roles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- Step 7: Update all RLS policies to use has_role() function

-- ===== COMPANIES TABLE =====
DROP POLICY IF EXISTS "Usuários logados podem criar novas empresas" ON public.companies;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias empresas ou se forem a" ON public.companies;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias empresas ou se forem adm" ON public.companies;
DROP POLICY IF EXISTS "Usuários podem ver empresas se forem donos ou admins" ON public.companies;

CREATE POLICY "Users can create companies"
  ON public.companies
  FOR INSERT
  WITH CHECK (
    (auth.role() = 'authenticated') AND 
    (owner_id = auth.uid() OR (public.has_role(auth.uid(), 'admin') AND owner_id IS NOT NULL))
  );

CREATE POLICY "Users can update their own companies or admins can update all"
  ON public.companies
  FOR UPDATE
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own companies or admins can delete all"
  ON public.companies
  FOR DELETE
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own companies or admins can view all"
  ON public.companies
  FOR SELECT
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ===== CONTACTS TABLE =====
DROP POLICY IF EXISTS "Usuários logados podem criar novos contatos" ON public.contacts;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios contatos ou se forem a" ON public.contacts;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios contatos ou se forem adm" ON public.contacts;
DROP POLICY IF EXISTS "Usuários podem ver contatos se forem donos ou admins" ON public.contacts;

CREATE POLICY "Users can create contacts"
  ON public.contacts
  FOR INSERT
  WITH CHECK (
    (auth.role() = 'authenticated') AND 
    (owner_id = auth.uid() OR (public.has_role(auth.uid(), 'admin') AND owner_id IS NOT NULL))
  );

CREATE POLICY "Users can update their own contacts or admins can update all"
  ON public.contacts
  FOR UPDATE
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own contacts or admins can delete all"
  ON public.contacts
  FOR DELETE
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own contacts or admins can view all"
  ON public.contacts
  FOR SELECT
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ===== OPPORTUNITIES TABLE =====
DROP POLICY IF EXISTS "Usuários logados podem criar oportunidades" ON public.opportunities;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias oportunidades ou se fo" ON public.opportunities;
DROP POLICY IF EXISTS "Usuários podem excluir suas próprias oportunidades ou admins " ON public.opportunities;
DROP POLICY IF EXISTS "Usuários podem ver oportunidades se forem donos ou admins" ON public.opportunities;

CREATE POLICY "Users can create opportunities"
  ON public.opportunities
  FOR INSERT
  WITH CHECK (
    (auth.role() = 'authenticated') AND 
    (owner_id = auth.uid() OR (public.has_role(auth.uid(), 'admin') AND owner_id IS NOT NULL))
  );

CREATE POLICY "Users can update their own opportunities or admins can update all"
  ON public.opportunities
  FOR UPDATE
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own opportunities or admins can delete all"
  ON public.opportunities
  FOR DELETE
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own opportunities or admins can view all"
  ON public.opportunities
  FOR SELECT
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ===== ACTIVITY_LOG TABLE =====
DROP POLICY IF EXISTS "Users can create activity log entries" ON public.activity_log;
DROP POLICY IF EXISTS "Users can view activity log if authenticated" ON public.activity_log;
DROP POLICY IF EXISTS "Usuários logados podem ver o log de atividades" ON public.activity_log;

CREATE POLICY "Users can create their own activity log entries"
  ON public.activity_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own activity or admins can view all"
  ON public.activity_log
  FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ===== USERS TABLE =====
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Only admins can create users" ON public.users;
DROP POLICY IF EXISTS "Only admins can update users" ON public.users;
DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;

CREATE POLICY "Users can view their own profile or admins can view all"
  ON public.users
  FOR SELECT
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can create users"
  ON public.users
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update users"
  ON public.users
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete users"
  ON public.users
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== FOLLOW_UPS TABLE =====
DROP POLICY IF EXISTS "INSERT: Admin pode delegar, vendedor não" ON public.follow_ups;
DROP POLICY IF EXISTS "SELECT: Dono da tarefa ou Admin" ON public.follow_ups;
DROP POLICY IF EXISTS "UPDATE: Dono da tarefa ou Admin" ON public.follow_ups;
DROP POLICY IF EXISTS "DELETE: Dono da tarefa ou Admin" ON public.follow_ups;

CREATE POLICY "Admins can delegate tasks, vendors can only assign to themselves"
  ON public.follow_ups
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR responsible_id = auth.uid());

CREATE POLICY "Users can view their own tasks or admins can view all"
  ON public.follow_ups
  FOR SELECT
  USING (responsible_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own tasks or admins can update all"
  ON public.follow_ups
  FOR UPDATE
  USING (responsible_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own tasks or admins can delete all"
  ON public.follow_ups
  FOR DELETE
  USING (responsible_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ===== GOALS TABLE =====
DROP POLICY IF EXISTS "Admins can create goals" ON public.goals;
DROP POLICY IF EXISTS "Admins can update goals" ON public.goals;
DROP POLICY IF EXISTS "Admins can delete goals" ON public.goals;
DROP POLICY IF EXISTS "Users can view their own goals or admins can view all" ON public.goals;

CREATE POLICY "Admins can create goals"
  ON public.goals
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update goals"
  ON public.goals
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete goals"
  ON public.goals
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own goals or admins can view all"
  ON public.goals
  FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ===== PROJECTS TABLE =====
DROP POLICY IF EXISTS "Usuários logados podem criar projetos" ON public.projects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios projetos ou se forem a" ON public.projects;
DROP POLICY IF EXISTS "SELECT: Gerente do projeto, Dono da empresa ou Admin" ON public.projects;
DROP POLICY IF EXISTS "DELETE: Gerente do projeto ou Admin" ON public.projects;

CREATE POLICY "Authenticated users can create projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Project managers or admins can update projects"
  ON public.projects
  FOR UPDATE
  USING (manager_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their projects or admins can view all"
  ON public.projects
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    manager_id = auth.uid() OR 
    company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Project managers or admins can delete projects"
  ON public.projects
  FOR DELETE
  USING (manager_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ===== PROPOSALS TABLE =====
DROP POLICY IF EXISTS "Usuários logados podem criar propostas" ON public.proposals;
DROP POLICY IF EXISTS "Usuários podem ver propostas se forem donos ou admins" ON public.proposals;
DROP POLICY IF EXISTS "INSERT: Admin pode delegar, vendedor não" ON public.proposals;
DROP POLICY IF EXISTS "SELECT: Dono da proposta, Dono da empresa, Dono do projeto ou A" ON public.proposals;
DROP POLICY IF EXISTS "UPDATE: Dono da proposta ou Admin" ON public.proposals;
DROP POLICY IF EXISTS "DELETE: Dono da proposta ou Admin" ON public.proposals;

CREATE POLICY "Admins can delegate proposals, vendors can only assign to themselves"
  ON public.proposals
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR owner_id = auth.uid());

CREATE POLICY "Users can view their proposals or admins can view all"
  ON public.proposals
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    owner_id = auth.uid() OR 
    company_id IN (SELECT id FROM public.companies WHERE owner_id = auth.uid()) OR 
    project_id IN (SELECT id FROM public.projects WHERE manager_id = auth.uid())
  );

CREATE POLICY "Proposal owners or admins can update proposals"
  ON public.proposals
  FOR UPDATE
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Proposal owners or admins can delete proposals"
  ON public.proposals
  FOR DELETE
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ===== PROPOSAL_VERSIONS TABLE =====
DROP POLICY IF EXISTS "INSERT: Apenas sistema pode criar versões" ON public.proposal_versions;
DROP POLICY IF EXISTS "SELECT: Dono da proposta, Dono da empresa, Dono do projeto ou A" ON public.proposal_versions;

CREATE POLICY "System can create versions"
  ON public.proposal_versions
  FOR INSERT
  WITH CHECK (changed_by = auth.uid());

CREATE POLICY "Users can view versions of their proposals or admins can view all"
  ON public.proposal_versions
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    proposal_id IN (
      SELECT p.id FROM public.proposals p 
      WHERE p.owner_id = auth.uid() OR 
            p.company_id IN (SELECT c.id FROM public.companies c WHERE c.owner_id = auth.uid()) OR 
            p.project_id IN (SELECT pr.id FROM public.projects pr WHERE pr.manager_id = auth.uid())
    )
  );

-- ===== PROJECT_ADDITIONS TABLE =====
DROP POLICY IF EXISTS "Users can view project additions if they own the project or com" ON public.project_additions;
DROP POLICY IF EXISTS "Users can create project additions for their projects" ON public.project_additions;
DROP POLICY IF EXISTS "Users can update project additions for their projects" ON public.project_additions;
DROP POLICY IF EXISTS "Users can delete project additions for their projects" ON public.project_additions;

CREATE POLICY "Users can view project additions they own or admins can view all"
  ON public.project_additions
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p 
      WHERE p.manager_id = auth.uid() OR 
            p.company_id IN (SELECT c.id FROM public.companies c WHERE c.owner_id = auth.uid())
    ) OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can create project additions for their projects"
  ON public.project_additions
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p 
      WHERE p.manager_id = auth.uid() OR 
            p.company_id IN (SELECT c.id FROM public.companies c WHERE c.owner_id = auth.uid())
    ) OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can update project additions for their projects"
  ON public.project_additions
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p 
      WHERE p.manager_id = auth.uid() OR 
            p.company_id IN (SELECT c.id FROM public.companies c WHERE c.owner_id = auth.uid())
    ) OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can delete project additions for their projects"
  ON public.project_additions
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p 
      WHERE p.manager_id = auth.uid() OR 
            p.company_id IN (SELECT c.id FROM public.companies c WHERE c.owner_id = auth.uid())
    ) OR public.has_role(auth.uid(), 'admin')
  );

-- ===== PIPELINE_STAGES TABLE =====
DROP POLICY IF EXISTS "Qualquer usuário logado pode ver as etapas do pipeline" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Apenas admins podem criar etapas do pipeline" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Apenas admins podem atualizar etapas do pipeline" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Apenas admins podem deletar etapas do pipeline" ON public.pipeline_stages;

CREATE POLICY "Authenticated users can view pipeline stages"
  ON public.pipeline_stages
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can create pipeline stages"
  ON public.pipeline_stages
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update pipeline stages"
  ON public.pipeline_stages
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete pipeline stages"
  ON public.pipeline_stages
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 8: Update database functions that reference users.role
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_revenue NUMERIC;
    active_leads INT;
    active_projects INT;
    conversion_rate NUMERIC;
    total_opportunities INT;
    won_opportunities INT;
    user_is_admin BOOLEAN;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    user_is_admin := public.has_role(current_user_id, 'admin');

    IF user_is_admin THEN
        SELECT COALESCE(SUM(value), 0)
        INTO total_revenue
        FROM opportunities
        WHERE stage_id IN (SELECT id FROM pipeline_stages WHERE name = 'Ganho');
    ELSE
        SELECT COALESCE(SUM(value), 0)
        INTO total_revenue
        FROM opportunities
        WHERE stage_id IN (SELECT id FROM pipeline_stages WHERE name = 'Ganho')
          AND owner_id = current_user_id;
    END IF;

    IF user_is_admin THEN
        SELECT COUNT(*)
        INTO active_leads
        FROM companies
        WHERE type = 'Lead';
    ELSE
        SELECT COUNT(*)
        INTO active_leads
        FROM companies
        WHERE type = 'Lead'
          AND owner_id = current_user_id;
    END IF;

    IF user_is_admin THEN
        SELECT COUNT(*)
        INTO active_projects
        FROM projects
        WHERE status = 'Em Andamento';
    ELSE
        SELECT COUNT(*)
        INTO active_projects
        FROM projects
        WHERE status = 'Em Andamento'
          AND (manager_id = current_user_id 
               OR company_id IN (SELECT id FROM companies WHERE owner_id = current_user_id));
    END IF;

    IF user_is_admin THEN
        SELECT COUNT(*) INTO total_opportunities FROM opportunities;
        SELECT COUNT(*) INTO won_opportunities FROM opportunities WHERE stage_id IN (SELECT id FROM pipeline_stages WHERE name = 'Ganho');
    ELSE
        SELECT COUNT(*) INTO total_opportunities FROM opportunities WHERE owner_id = current_user_id;
        SELECT COUNT(*) INTO won_opportunities FROM opportunities WHERE stage_id IN (SELECT id FROM pipeline_stages WHERE name = 'Ganho') AND owner_id = current_user_id;
    END IF;

    IF total_opportunities > 0 THEN
        conversion_rate := (won_opportunities::NUMERIC / total_opportunities::NUMERIC) * 100;
    ELSE
        conversion_rate := 0;
    END IF;

    RETURN json_build_object(
        'totalRevenue', total_revenue,
        'activeLeads', active_leads,
        'activeProjects', active_projects,
        'conversionRate', conversion_rate
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pipeline_distribution()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    pipeline_data JSON;
    user_is_admin BOOLEAN;
BEGIN
    user_is_admin := public.has_role(auth.uid(), 'admin');

    SELECT json_agg(
        json_build_object(
            'stage', ps.name,
            'count', COALESCE(stage_counts.count, 0),
            'color', ps.color
        )
        ORDER BY ps.order
    )
    INTO pipeline_data
    FROM pipeline_stages ps
    LEFT JOIN (
        SELECT 
            o.stage_id,
            COUNT(*) as count
        FROM opportunities o
        WHERE (
            user_is_admin OR o.owner_id = auth.uid()
        )
        GROUP BY o.stage_id
    ) stage_counts ON ps.id = stage_counts.stage_id;

    RETURN COALESCE(pipeline_data, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_conversion_trend()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    trend_data JSON;
    user_is_admin BOOLEAN;
BEGIN
    user_is_admin := public.has_role(auth.uid(), 'admin');

    SELECT json_agg(
        json_build_object(
            'month', month_name,
            'conversions', COALESCE(conversions, 0),
            'total_opportunities', COALESCE(total_opps, 0),
            'conversion_rate', COALESCE(
                CASE 
                    WHEN total_opps > 0 THEN ROUND((conversions::NUMERIC / total_opps::NUMERIC) * 100, 1)
                    ELSE 0 
                END, 
                0
            )
        )
        ORDER BY month_date
    )
    INTO trend_data
    FROM (
        SELECT 
            TO_CHAR(month_date, 'Mon/YY') as month_name,
            month_date,
            COUNT(CASE WHEN won_stage.id IS NOT NULL THEN 1 END) as conversions,
            COUNT(*) as total_opps
        FROM (
            SELECT 
                date_trunc('month', generate_series(
                    date_trunc('month', CURRENT_DATE - INTERVAL '5 months'),
                    date_trunc('month', CURRENT_DATE),
                    INTERVAL '1 month'
                )) as month_date
        ) months
        LEFT JOIN opportunities o ON (
            date_trunc('month', o.created_at) = months.month_date
            AND (user_is_admin OR o.owner_id = auth.uid())
        )
        LEFT JOIN pipeline_stages won_stage ON (
            o.stage_id = won_stage.id 
            AND won_stage.name = 'Ganho'
        )
        GROUP BY month_date, month_name
    ) monthly_data;

    RETURN COALESCE(trend_data, '[]'::json);
END;
$$;