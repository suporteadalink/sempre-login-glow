import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

interface AILeadData {
  company: {
    name: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    website?: string;
    sector?: string;
    city?: string;
    state?: string;
    size?: string;
    number_of_employees?: number;
    annual_revenue?: number;
  };
  contact: {
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    observations?: string;
    origin?: string;
  };
  opportunity?: {
    title: string;
    description?: string;
    value?: number;
    probability?: number;
    expected_close_date?: string;
  };
  source?: string;
  confidence?: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const aiData: AILeadData = await req.json();
    
    console.log('Received AI lead data:', JSON.stringify(aiData, null, 2));

    // Validate required fields
    if (!aiData.company?.name) {
      throw new Error('Nome da empresa é obrigatório');
    }
    
    if (!aiData.contact?.name) {
      throw new Error('Nome do contato é obrigatório');
    }

    // Get first admin user as default owner (fallback to null if none found)
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1);
    
    const adminUserId = adminRoles?.[0]?.user_id;
    
    // Verify admin user is active
    let defaultOwnerId = null;
    if (adminUserId) {
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', adminUserId)
        .eq('status', 'Ativo')
        .maybeSingle();
      
      defaultOwnerId = adminUser?.id || null;
    }

    // Check if company already exists (by CNPJ if provided, otherwise by name)
    let existingCompany = null;
    if (aiData.company.cnpj) {
      const { data: companyByCnpj } = await supabase
        .from('companies')
        .select('id, name, owner_id')
        .eq('cnpj', aiData.company.cnpj)
        .single();
      existingCompany = companyByCnpj;
    }
    
    if (!existingCompany) {
      const { data: companyByName } = await supabase
        .from('companies')
        .select('id, name, owner_id')
        .ilike('name', aiData.company.name)
        .single();
      existingCompany = companyByName;
    }

    let companyId: number;
    let companyOwnerId = defaultOwnerId;
    
    if (existingCompany) {
      console.log('Company already exists:', existingCompany.id);
      companyId = existingCompany.id;
      companyOwnerId = existingCompany.owner_id || defaultOwnerId;
    } else {
      // Create new company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([{
          ...aiData.company,
          type: 'Lead',
          source: aiData.source || 'ai',
          ai_confidence: aiData.confidence || null,
          ai_metadata: aiData.confidence ? { confidence: aiData.confidence, source: aiData.source } : null,
          owner_id: defaultOwnerId
        }])
        .select('id')
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError);
        throw companyError;
      }

      companyId = newCompany.id;
      console.log('Created new company:', companyId);
    }

    // Check if contact already exists (by email within the company)
    let existingContact = null;
    if (aiData.contact.email) {
      const { data: contactByEmail } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('email', aiData.contact.email)
        .single();
      existingContact = contactByEmail;
    }
    
    if (!existingContact) {
      const { data: contactByName } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('company_id', companyId)
        .ilike('name', aiData.contact.name)
        .single();
      existingContact = contactByName;
    }

    let contactId: number;
    if (existingContact) {
      console.log('Contact already exists:', existingContact.id);
      contactId = existingContact.id;
    } else {
      // Create new contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert([{
          ...aiData.contact,
          company_id: companyId,
          source: aiData.source || 'ai',
          ai_confidence: aiData.confidence || null,
          ai_metadata: aiData.confidence ? { confidence: aiData.confidence, source: aiData.source } : null,
          owner_id: companyOwnerId
        }])
        .select('id')
        .single();

      if (contactError) {
        console.error('Error creating contact:', contactError);
        throw contactError;
      }

      contactId = newContact.id;
      console.log('Created new contact:', contactId);
    }

    // Create opportunity if provided
    let opportunityId: number | null = null;
    if (aiData.opportunity?.title) {
      // Get the "Novo Lead" pipeline stage
      const { data: pipelineStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('name', 'Novo Lead')
        .single();

      if (!pipelineStage) {
        throw new Error('Pipeline stage "Novo Lead" not found');
      }

      const { data: newOpportunity, error: opportunityError } = await supabase
        .from('opportunities')
        .insert([{
          ...aiData.opportunity,
          company_id: companyId,
          contact_id: contactId,
          stage_id: pipelineStage.id,
          source: aiData.source || 'ai',
          ai_confidence: aiData.confidence || null,
          ai_metadata: aiData.confidence ? { confidence: aiData.confidence, source: aiData.source } : null,
          owner_id: companyOwnerId
        }])
        .select('id')
        .single();

      if (opportunityError) {
        console.error('Error creating opportunity:', opportunityError);
        throw opportunityError;
      }

      opportunityId = newOpportunity.id;
      console.log('Created new opportunity:', opportunityId);
    }

    // Log the activity
    const { error: activityError } = await supabase
      .from('activity_log')
      .insert([{
        description: `Lead da IA processado: empresa "${aiData.company.name}", contato "${aiData.contact.name}"${opportunityId ? `, oportunidade "${aiData.opportunity?.title}"` : ''}`,
        type: 'AI_LEAD_CREATED',
        source: aiData.source || 'ai',
        ai_metadata: aiData.confidence ? { confidence: aiData.confidence, source: aiData.source } : null,
        related_company_id: companyId,
        related_opportunity_id: opportunityId,
        user_id: companyOwnerId
      }]);

    if (activityError) {
      console.error('Error logging activity:', activityError);
      // Don't throw here, as the main operation was successful
    }

    console.log('AI lead processing completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Lead processado com sucesso',
        data: {
          company_id: companyId,
          contact_id: contactId,
          opportunity_id: opportunityId,
          confidence: aiData.confidence,
          source: aiData.source
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-lead-intake function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});