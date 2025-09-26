import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProposalData {
  status: string;
  owner_name: string;
  project_name: string;
  company_name: string;
  title?: string;
  value?: number;
  pdf_url?: string;
}

interface RequestBody {
  action: 'create' | 'update' | 'get' | 'delete';
  data?: ProposalData;
  id?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    
    if (body.action === 'create') {
      return await createProposal(body.data!);
    }
    
    return new Response(
      JSON.stringify({ error: 'Action not implemented yet' }),
      { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createProposal(data: ProposalData) {
  // Validate required fields
  if (!data.status || !data.owner_name || !data.project_name || !data.company_name) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Convert names to IDs
    const conversionResult = await convertNamesToIds(data);
    if (!conversionResult.success) {
      return new Response(
        JSON.stringify({ error: conversionResult.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create proposal
    const proposalData = {
      title: data.title || `Proposta ${data.company_name} - ${data.project_name}`,
      status: data.status,
      owner_id: conversionResult.owner_id,
      project_id: conversionResult.project_id,
      company_id: conversionResult.company_id,
      value: data.value || null,
      pdf_url: data.pdf_url || null
    };

    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/proposals`, {
      method: 'POST',
      headers: {
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(proposalData),
    });

    if (!response.ok) {
      const error = await response.json();
      return new Response(
        JSON.stringify({ error: 'Failed to create proposal', details: error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const proposal = await response.json();

    return new Response(
      JSON.stringify({ success: true, data: proposal }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to create proposal', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function convertNamesToIds(data: ProposalData) {
  try {
    const headers = {
      'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      'Content-Type': 'application/json'
    };

    // Get user ID
    const userResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/rest/v1/users?name=eq.${encodeURIComponent(data.owner_name)}&select=id&limit=1`,
      { headers }
    );
    
    if (!userResponse.ok) {
      return { success: false, error: `Erro ao buscar usuário ${data.owner_name}` };
    }
    
    const users = await userResponse.json();
    if (!users || users.length === 0) {
      return { success: false, error: `Usuário ${data.owner_name} não encontrado` };
    }

    // Get project ID
    const projectResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/rest/v1/projects?title=eq.${encodeURIComponent(data.project_name)}&select=id&limit=1`,
      { headers }
    );
    
    if (!projectResponse.ok) {
      return { success: false, error: `Erro ao buscar projeto ${data.project_name}` };
    }
    
    const projects = await projectResponse.json();
    if (!projects || projects.length === 0) {
      return { success: false, error: `Projeto ${data.project_name} não encontrado` };
    }

    // Get company ID
    const companyResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/rest/v1/companies?name=eq.${encodeURIComponent(data.company_name)}&select=id&limit=1`,
      { headers }
    );
    
    if (!companyResponse.ok) {
      return { success: false, error: `Erro ao buscar empresa ${data.company_name}` };
    }
    
    const companies = await companyResponse.json();
    if (!companies || companies.length === 0) {
      return { success: false, error: `Empresa ${data.company_name} não encontrada` };
    }

    return {
      success: true,
      owner_id: users[0].id,
      project_id: projects[0].id,
      company_id: companies[0].id
    };

  } catch (error) {
    return { success: false, error: `Erro na conversão: ${error.message}` };
  }
}