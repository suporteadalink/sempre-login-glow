import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddProposalRequest {
  // Accept either ID or name for each entity
  company_id?: number;
  company_name?: string;
  owner_id?: string;
  owner_name?: string;
  project_id?: number;
  project_title?: string;
  status: string;
  title?: string;
  value?: number;
  pdf_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header first to validate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização obrigatório' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Initialize service role client first for user validation
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Initialize anon client for auth validation
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Set session to get current user
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Check user role using service client to avoid RLS issues
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user role:', userError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões do usuário' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userRole = userData?.role || 'vendedor';
    console.log('User role:', userRole);

    // Initialize the appropriate Supabase client based on user role and operation
    let supabaseClient;
    if (userRole === 'admin') {
      // Use service role for admin operations (bypasses RLS)
      supabaseClient = serviceClient;
      console.log('Using service role client for admin user');
    } else {
      // Use anon key for regular users with proper session
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      );
      const { error: sessionError } = await supabaseClient.auth.setSession({
        access_token: token,
        refresh_token: ''
      });
      if (sessionError) {
        console.error('Session error:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Erro ao estabelecer sessão' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Using anon client with session for regular user');
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: AddProposalRequest = await req.json();
    console.log('Received request:', requestData);
    
    // Resolve IDs from names if needed
    let companyId = requestData.company_id;
    let ownerId = requestData.owner_id;
    let projectId = requestData.project_id;

    // Resolve company ID from name if provided
    if (!companyId && requestData.company_name) {
      const { data: company } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('name', requestData.company_name)
        .single();
      
      if (!company) {
        return new Response(
          JSON.stringify({ error: `Empresa "${requestData.company_name}" não encontrada` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      companyId = company.id;
    }

    // Resolve owner ID from name if provided
    if (!ownerId && requestData.owner_name) {
      const { data: ownerUser } = await supabaseClient
        .from('users')
        .select('id')
        .eq('name', requestData.owner_name)
        .single();
      
      if (!ownerUser) {
        return new Response(
          JSON.stringify({ error: `Usuário "${requestData.owner_name}" não encontrado` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      ownerId = ownerUser.id;
    }

    // Resolve project ID from title if provided
    if (!projectId && requestData.project_title) {
      const { data: project } = await supabaseClient
        .from('projects')
        .select('id')
        .eq('title', requestData.project_title)
        .single();
      
      if (!project) {
        return new Response(
          JSON.stringify({ error: `Projeto "${requestData.project_title}" não encontrado` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      projectId = project.id;
    }
     
    // Validate required fields
    if (!companyId || !ownerId || !projectId || !requestData.status) {
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios: (company_id ou company_name), (owner_id ou owner_name), (project_id ou project_title), status' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate delegation permissions
    if (userRole !== 'admin' && ownerId !== user.id) {
      return new Response(
        JSON.stringify({ 
          error: 'Apenas administradores podem delegar propostas para outros usuários' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Validation passed. Creating proposal for owner:', ownerId, 'by user:', user.id);

    // Auto-generate title if not provided
    let title = requestData.title;
    if (!title) {
      // Get company and project names for auto-generated title
      const { data: company } = await supabaseClient
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();

      const { data: project } = await supabaseClient
        .from('projects')
        .select('title, project_code')
        .eq('id', projectId)
        .single();

      const companyName = company?.name || `Empresa #${companyId}`;
      const projectTitle = project?.title || `Projeto #${projectId}`;
      const projectCode = project?.project_code ? `[${project.project_code}] ` : '';
      
      title = `Proposta ${companyName} - ${projectCode}${projectTitle}`;
    }

    // Insert the proposal
    console.log('Attempting to insert proposal with data:', {
      title,
      company_id: companyId,
      owner_id: ownerId,
      project_id: projectId,
      status: requestData.status,
      value: requestData.value || null,
      pdf_url: requestData.pdf_url || null,
      authenticated_user: user.id,
      user_role: userRole
    });

    const { data: proposal, error: insertError } = await supabaseClient
      .from('proposals')
      .insert([{
        title,
        company_id: companyId,
        owner_id: ownerId,
        project_id: projectId,
        status: requestData.status,
        value: requestData.value || null,
        pdf_url: requestData.pdf_url || null
      }])
      .select(`
        *,
        companies:company_id(id, name),
        projects:project_id(id, title, project_code)
      `)
      .single();

    if (insertError) {
      console.error('Error inserting proposal:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar proposta: ' + insertError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the activity
    const { data: logUser } = await supabaseClient
      .from('users')
      .select('name')
      .eq('id', ownerId)
      .single();

    await supabaseClient
      .from('activity_log')
      .insert({
        description: `${logUser?.name || 'Usuário'} criou a proposta "${title}".`,
        type: 'PROPOSAL_CREATED',
        user_id: ownerId,
        related_company_id: companyId
      });

    console.log('Proposal created successfully:', proposal.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Proposta criada com sucesso',
        proposal
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});