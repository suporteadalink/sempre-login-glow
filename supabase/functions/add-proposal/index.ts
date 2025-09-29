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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      supabaseClient.auth.setSession({ access_token: authHeader.replace('Bearer ', ''), refresh_token: '' });
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
      const { data: user } = await supabaseClient
        .from('users')
        .select('id')
        .eq('name', requestData.owner_name)
        .single();
      
      if (!user) {
        return new Response(
          JSON.stringify({ error: `Usuário "${requestData.owner_name}" não encontrado` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      ownerId = user.id;
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
    const { data: user } = await supabaseClient
      .from('users')
      .select('name')
      .eq('id', ownerId)
      .single();

    await supabaseClient
      .from('activity_log')
      .insert({
        description: `${user?.name || 'Usuário'} criou a proposta "${title}".`,
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