import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

  console.log('=== ADD PROPOSAL REQUEST START ===');
  console.log('Method:', req.method);
  console.log('User-Agent:', req.headers.get('User-Agent') || 'Unknown');

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Since verify_jwt = true in config.toml, the JWT is automatically validated
    // We just need to get it from the header to pass to our client
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No valid authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Token de autorização obrigatório' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('✅ Token extracted, length:', token.length);

    // Create clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !serviceKey || !anonKey) {
      throw new Error('Missing required environment variables');
    }

    // Service role client for admin operations and role checking
    const serviceClient = createClient(supabaseUrl, serviceKey);
    
    // Anon client for user validation
    const anonClient = createClient(supabaseUrl, anonKey);

    // Validate the JWT token and get user info
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ JWT validation failed:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ 
          error: 'Token inválido ou expirado',
          details: authError?.message || 'User not found'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User validated:', user.id, user.email);

    // Get user role (using service client to bypass RLS)
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('role, name')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('❌ Error fetching user data:', userError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao verificar dados do usuário',
          details: userError.message
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userRole = userData?.role || 'vendedor';
    console.log('✅ User role:', userRole, '| User name:', userData?.name);

    // Choose client based on role
    let supabaseClient;
    if (userRole === 'admin') {
      // Admins use service role (bypasses RLS)
      supabaseClient = serviceClient;
      console.log('🔑 Using service role for admin');
    } else {
      // Regular users use anon client with JWT
      supabaseClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      console.log('🔐 Using anon client for user');
    }

    // Parse request body
    const requestData: AddProposalRequest = await req.json();
    console.log('📋 Request data received:', {
      company: requestData.company_id || requestData.company_name,
      owner: requestData.owner_id || requestData.owner_name,
      project: requestData.project_id || requestData.project_title,
      status: requestData.status
    });
    
    // Resolve entity IDs from names if needed
    let companyId = requestData.company_id;
    let ownerId = requestData.owner_id;
    let projectId = requestData.project_id;

    // Resolve company ID
    if (!companyId && requestData.company_name) {
      const { data: company, error } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('name', requestData.company_name)
        .single();
      
      if (error || !company) {
        console.error('❌ Company not found:', requestData.company_name);
        return new Response(
          JSON.stringify({ error: `Empresa "${requestData.company_name}" não encontrada` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      companyId = company.id;
      console.log('✅ Company resolved:', requestData.company_name, '-> ID:', companyId);
    }

    // Resolve owner ID
    if (!ownerId && requestData.owner_name) {
      const { data: ownerUser, error } = await supabaseClient
        .from('users')
        .select('id')
        .eq('name', requestData.owner_name)
        .single();
      
      if (error || !ownerUser) {
        console.error('❌ Owner not found:', requestData.owner_name);
        return new Response(
          JSON.stringify({ error: `Usuário "${requestData.owner_name}" não encontrado` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      ownerId = ownerUser.id;
      console.log('✅ Owner resolved:', requestData.owner_name, '-> ID:', ownerId);
    }

    // Resolve project ID
    if (!projectId && requestData.project_title) {
      const { data: project, error } = await supabaseClient
        .from('projects')
        .select('id')
        .eq('title', requestData.project_title)
        .single();
      
      if (error || !project) {
        console.error('❌ Project not found:', requestData.project_title);
        return new Response(
          JSON.stringify({ error: `Projeto "${requestData.project_title}" não encontrado` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      projectId = project.id;
      console.log('✅ Project resolved:', requestData.project_title, '-> ID:', projectId);
    }

    // Validate required fields
    if (!companyId || !ownerId || !projectId || !requestData.status) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios: (company_id ou company_name), (owner_id ou owner_name), (project_id ou project_title), status' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate delegation permissions
    if (userRole !== 'admin' && ownerId !== user.id) {
      console.error('❌ Delegation not allowed for role:', userRole);
      return new Response(
        JSON.stringify({ 
          error: 'Apenas administradores podem delegar propostas para outros usuários' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Validation passed - creating proposal for:', ownerId, 'by user:', user.id);

    // Auto-generate title if not provided
    let title = requestData.title;
    if (!title) {
      const [companyRes, projectRes] = await Promise.all([
        supabaseClient.from('companies').select('name').eq('id', companyId).single(),
        supabaseClient.from('projects').select('title, project_code').eq('id', projectId).single()
      ]);

      const companyName = companyRes.data?.name || `Empresa #${companyId}`;
      const projectTitle = projectRes.data?.title || `Projeto #${projectId}`;
      const projectCode = projectRes.data?.project_code ? `[${projectRes.data.project_code}] ` : '';
      
      title = `Proposta ${companyName} - ${projectCode}${projectTitle}`;
      console.log('✅ Auto-generated title:', title);
    }

    // Insert the proposal
    console.log('🚀 Inserting proposal...');
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
      .select('*')
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar proposta: ' + insertError.message,
          details: insertError
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Proposal created successfully:', proposal.id);

    // Log the activity
    try {
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
      
      console.log('✅ Activity logged successfully');
    } catch (logError) {
      console.warn('⚠️ Failed to log activity:', logError);
      // Don't fail the whole request for logging errors
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Proposta criada com sucesso',
        proposal,
        debug: {
          user_id: user.id,
          user_role: userRole,
          owner_id: ownerId,
          company_id: companyId,
          project_id: projectId
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});