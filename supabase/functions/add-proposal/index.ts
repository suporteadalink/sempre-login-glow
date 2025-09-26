import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AddProposalRequest {
  company_id: number;
  owner_id: string;
  project_id: number;
  status: string;
  title?: string;
  value?: number;
  pdf_url?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: AddProposalRequest = await req.json();
    
    // Validate required fields
    if (!requestData.company_id || !requestData.owner_id || !requestData.project_id || !requestData.status) {
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios: company_id, owner_id, project_id, status' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auto-generate title if not provided
    let title = requestData.title;
    if (!title) {
      // Get company and project names for auto-generated title
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', requestData.company_id)
        .single();

      const { data: project } = await supabase
        .from('projects')
        .select('title')
        .eq('id', requestData.project_id)
        .single();

      title = `Proposta ${company?.name || 'Empresa'} - ${project?.title || 'Projeto'}`;
    }

    // Insert the proposal
    const { data: proposal, error: insertError } = await supabase
      .from('proposals')
      .insert({
        title,
        company_id: requestData.company_id,
        owner_id: requestData.owner_id,
        project_id: requestData.project_id,
        status: requestData.status,
        value: requestData.value || null,
        pdf_url: requestData.pdf_url || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting proposal:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar proposta: ' + insertError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the activity
    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', requestData.owner_id)
      .single();

    await supabase
      .from('activity_log')
      .insert({
        description: `${user?.name || 'Usuário'} criou a proposta "${title}".`,
        type: 'PROPOSAL_CREATED',
        user_id: requestData.owner_id,
        related_company_id: requestData.company_id
      });

    console.log('Proposal created successfully:', proposal.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        proposal,
        message: 'Proposta criada com sucesso' 
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});