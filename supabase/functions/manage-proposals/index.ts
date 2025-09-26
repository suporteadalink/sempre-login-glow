import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProposalData {
  // Campos obrigatórios
  status: string;
  owner_id: string; // responsável
  project_id: number;
  company_id: number;
  
  // Campos opcionais
  title?: string;
  value?: number;
  pdf_url?: string;
}

interface CreateProposalRequest {
  action: 'create';
  data: ProposalData;
}

interface UpdateProposalRequest {
  action: 'update';
  id: number;
  data: Partial<ProposalData>;
}

interface GetProposalRequest {
  action: 'get';
  id?: number;
  filters?: {
    company_id?: number;
    project_id?: number;
    owner_id?: string;
    status?: string;
  };
}

interface DeleteProposalRequest {
  action: 'delete';
  id: number;
}

type ProposalRequest = CreateProposalRequest | UpdateProposalRequest | GetProposalRequest | DeleteProposalRequest;

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

    const requestBody: ProposalRequest = await req.json();
    console.log('Received request:', requestBody);

    switch (requestBody.action) {
      case 'create':
        return await createProposal(supabaseClient, requestBody);
      
      case 'update':
        return await updateProposal(supabaseClient, requestBody);
      
      case 'get':
        return await getProposals(supabaseClient, requestBody);
      
      case 'delete':
        return await deleteProposal(supabaseClient, requestBody);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: create, update, get, or delete' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('Error in manage-proposals function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function createProposal(supabase: any, request: CreateProposalRequest) {
  const { data } = request;
  
  // Validar campos obrigatórios
  if (!data.status || !data.owner_id || !data.project_id || !data.company_id) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required fields: status, owner_id, project_id, company_id' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Gerar título automático se não fornecido
  if (!data.title) {
    // Buscar nomes da empresa e projeto para gerar título
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', data.company_id)
      .single();
    
    const { data: project } = await supabase
      .from('projects')
      .select('title, project_code')
      .eq('id', data.project_id)
      .single();

    const companyName = company?.name || `Empresa #${data.company_id}`;
    const projectTitle = project?.title || `Projeto #${data.project_id}`;
    const projectCode = project?.project_code ? `[${project.project_code}] ` : '';
    
    data.title = `Proposta ${companyName} - ${projectCode}${projectTitle}`;
  }

  // Criar proposta
  const { data: proposal, error } = await supabase
    .from('proposals')
    .insert([{
      title: data.title,
      status: data.status,
      owner_id: data.owner_id,
      project_id: data.project_id,
      company_id: data.company_id,
      value: data.value || null,
      pdf_url: data.pdf_url || null
    }])
    .select(`
      *,
      companies:company_id(id, name),
      projects:project_id(id, title, project_code)
    `)
    .single();

  if (error) {
    console.error('Error creating proposal:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create proposal', details: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Log da atividade
  await supabase
    .from('activity_log')
    .insert({
      description: `Proposta "${proposal.title}" criada via API.`,
      type: 'PROPOSAL_CREATED',
      user_id: data.owner_id,
      related_company_id: data.company_id
    });

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Proposal created successfully',
      data: proposal 
    }),
    { 
      status: 201, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function updateProposal(supabase: any, request: UpdateProposalRequest) {
  const { id, data } = request;

  // Verificar se a proposta existe
  const { data: existingProposal, error: fetchError } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existingProposal) {
    return new Response(
      JSON.stringify({ error: 'Proposal not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Atualizar proposta
  const { data: updatedProposal, error } = await supabase
    .from('proposals')
    .update(data)
    .eq('id', id)
    .select(`
      *,
      companies:company_id(id, name),
      projects:project_id(id, title, project_code)
    `)
    .single();

  if (error) {
    console.error('Error updating proposal:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update proposal', details: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Log da atividade
  await supabase
    .from('activity_log')
    .insert({
      description: `Proposta "${updatedProposal.title}" atualizada via API.`,
      type: 'PROPOSAL_UPDATED',
      user_id: updatedProposal.owner_id,
      related_company_id: updatedProposal.company_id
    });

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Proposal updated successfully',
      data: updatedProposal 
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function getProposals(supabase: any, request: GetProposalRequest) {
  let query = supabase
    .from('proposals')
    .select(`
      *,
      companies:company_id(id, name),
      projects:project_id(id, title, project_code)
    `);

  // Se um ID específico foi fornecido
  if (request.id) {
    query = query.eq('id', request.id);
    
    const { data, error } = await query.single();
    
    if (error) {
      return new Response(
        JSON.stringify({ error: 'Proposal not found', details: error.message }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Aplicar filtros se fornecidos
  if (request.filters) {
    const { company_id, project_id, owner_id, status } = request.filters;
    
    if (company_id) query = query.eq('company_id', company_id);
    if (project_id) query = query.eq('project_id', project_id);
    if (owner_id) query = query.eq('owner_id', owner_id);
    if (status) query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch proposals', details: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data,
      count: data.length 
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function deleteProposal(supabase: any, request: DeleteProposalRequest) {
  const { id } = request;

  // Verificar se a proposta existe e buscar dados antes de deletar
  const { data: existingProposal, error: fetchError } = await supabase
    .from('proposals')
    .select('title, owner_id, company_id')
    .eq('id', id)
    .single();

  if (fetchError || !existingProposal) {
    return new Response(
      JSON.stringify({ error: 'Proposal not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Deletar proposta
  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting proposal:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete proposal', details: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Log da atividade
  await supabase
    .from('activity_log')
    .insert({
      description: `Proposta "${existingProposal.title}" excluída via API.`,
      type: 'PROPOSAL_DELETED',
      user_id: existingProposal.owner_id,
      related_company_id: existingProposal.company_id
    });

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Proposal deleted successfully' 
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}