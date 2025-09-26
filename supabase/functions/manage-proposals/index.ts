import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProposalData {
  // Campos obrigatórios
  status: string;
  owner_name: string; // nome do responsável
  project_name: string; // nome do projeto
  company_name: string; // nome da empresa
  
  // Campos opcionais
  title?: string;
  value?: number;
  pdf_url?: string;
  related_name?: string; // nome do relacionado (opcional)
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

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
  if (!data.status || !data.owner_name || !data.project_name || !data.company_name) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required fields: status, owner_name, project_name, company_name' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Converter nomes para IDs
  const conversionResult = await convertNamesToIds(supabase, data);
  if (!conversionResult.success) {
    return new Response(
      JSON.stringify({ 
        error: 'Conversion error', 
        details: conversionResult.error 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const { owner_id, project_id, company_id } = conversionResult;

  // Gerar título automático se não fornecido
  if (!data.title) {
    // Buscar dados da empresa e projeto para gerar título
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', company_id)
      .single();
    
    const { data: project } = await supabase
      .from('projects')
      .select('title, project_code')
      .eq('id', project_id)
      .single();

    const companyName = company?.name || data.company_name;
    const projectTitle = project?.title || data.project_name;
    const projectCode = project?.project_code ? `[${project.project_code}] ` : '';
    
    data.title = `Proposta ${companyName} - ${projectCode}${projectTitle}`;
  }

  // Criar proposta
  const { data: proposal, error } = await supabase
    .from('proposals')
    .insert([{
      title: data.title,
      status: data.status,
      owner_id: owner_id,
      project_id: project_id,
      company_id: company_id,
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
      user_id: owner_id,
      related_company_id: company_id
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

  // Converter nomes para IDs se fornecidos
  let updateData = { ...data };
  if (data.owner_name || data.project_name || data.company_name) {
    const conversionResult = await convertNamesToIds(supabase, data);
    if (!conversionResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Conversion error', 
          details: conversionResult.error 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Substituir os nomes pelos IDs
    updateData = {
      ...data,
      owner_id: conversionResult.owner_id || data.owner_id,
      project_id: conversionResult.project_id || data.project_id,
      company_id: conversionResult.company_id || data.company_id
    };
    
    // Remover os campos de nome do update
    delete updateData.owner_name;
    delete updateData.project_name;
    delete updateData.company_name;
    delete updateData.related_name;
  }

  // Atualizar proposta
  const { data: updatedProposal, error } = await supabase
    .from('proposals')
    .update(updateData)
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

// Função auxiliar para converter nomes em IDs
async function convertNamesToIds(supabase: any, data: any) {
  try {
    let owner_id = null;
    let project_id = null;
    let company_id = null;

    // Converter nome do responsável para ID
    if (data.owner_name) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('name', data.owner_name)
        .single();

      if (userError || !user) {
        return { success: false, error: `Responsável "${data.owner_name}" não encontrado` };
      }
      owner_id = user.id;
    }

    // Converter nome do projeto para ID
    if (data.project_name) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('title', data.project_name)
        .single();

      if (projectError || !project) {
        return { success: false, error: `Projeto "${data.project_name}" não encontrado` };
      }
      project_id = project.id;
    }

    // Converter nome da empresa para ID
    if (data.company_name) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('name', data.company_name)
        .single();

      if (companyError || !company) {
        return { success: false, error: `Empresa "${data.company_name}" não encontrada` };
      }
      company_id = company.id;
    }

    return {
      success: true,
      owner_id,
      project_id,
      company_id
    };

  } catch (error) {
    return { success: false, error: `Erro na conversão: ${error.message}` };
  }
}