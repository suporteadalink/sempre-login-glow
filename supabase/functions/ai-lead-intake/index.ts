import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AILeadData {
  company: {
    name: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    website?: string;
    city?: string;
    state?: string;
    sector?: string;
    size?: string;
    annual_revenue?: number;
    number_of_employees?: number;
  };
  contact: {
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    observations?: string;
  };
  opportunity?: {
    title: string;
    description?: string;
    value?: number;
    expected_close_date?: string;
    probability?: number;
  };
  ai_metadata: {
    confidence_score: number;
    conversation_source: string;
    conversation_summary?: string;
    extracted_at: string;
    ai_model?: string;
  };
  n8n_metadata?: {
    workflow_id?: string;
    execution_id?: string;
    webhook_token?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const aiData: AILeadData = await req.json();
    
    console.log('Received AI lead data:', JSON.stringify(aiData, null, 2));

    // Validate required fields
    if (!aiData.company?.name || !aiData.contact?.name) {
      throw new Error('Company name and contact name are required');
    }

    // Check for duplicate company by CNPJ or name
    let existingCompany = null;
    if (aiData.company.cnpj) {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .eq('cnpj', aiData.company.cnpj)
        .maybeSingle();
      existingCompany = data;
    }
    
    if (!existingCompany) {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', aiData.company.name)
        .maybeSingle();
      existingCompany = data;
    }

    let companyId: number;
    let contactId: number;
    let opportunityId: number | null = null;

    // Create or update company
    if (existingCompany) {
      companyId = existingCompany.id;
      console.log(`Using existing company: ${existingCompany.name} (ID: ${companyId})`);
    } else {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          ...aiData.company,
          type: 'Lead',
          source: 'ai',
          ai_confidence: aiData.ai_metadata.confidence_score,
          ai_metadata: {
            ...aiData.ai_metadata,
            n8n_metadata: aiData.n8n_metadata
          }
        })
        .select('id')
        .single();

      if (companyError) throw companyError;
      companyId = companyData.id;
      console.log(`Created new company with ID: ${companyId}`);
    }

    // Check for existing contact
    let existingContact = null;
    if (aiData.contact.email) {
      const { data } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('email', aiData.contact.email)
        .maybeSingle();
      existingContact = data;
    }

    if (!existingContact) {
      const { data } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('company_id', companyId)
        .ilike('name', aiData.contact.name)
        .maybeSingle();
      existingContact = data;
    }

    // Create or update contact
    if (existingContact) {
      contactId = existingContact.id;
      console.log(`Using existing contact: ${existingContact.name} (ID: ${contactId})`);
    } else {
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .insert({
          ...aiData.contact,
          company_id: companyId,
          source: 'ai',
          ai_confidence: aiData.ai_metadata.confidence_score,
          ai_metadata: {
            ...aiData.ai_metadata,
            n8n_metadata: aiData.n8n_metadata
          }
        })
        .select('id')
        .single();

      if (contactError) throw contactError;
      contactId = contactData.id;
      console.log(`Created new contact with ID: ${contactId}`);
    }

    // Create opportunity if provided
    if (aiData.opportunity) {
      // Get the "Novo Lead" pipeline stage
      const { data: stageData, error: stageError } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('name', 'Novo Lead')
        .single();

      if (stageError) {
        console.warn('Could not find "Novo Lead" stage, using first available stage');
        const { data: firstStage } = await supabase
          .from('pipeline_stages')
          .select('id')
          .order('order')
          .limit(1)
          .single();
        
        if (!firstStage) throw new Error('No pipeline stages configured');
        
        var stageId = firstStage.id;
      } else {
        var stageId = stageData.id;
      }

      const { data: opportunityData, error: opportunityError } = await supabase
        .from('opportunities')
        .insert({
          ...aiData.opportunity,
          company_id: companyId,
          contact_id: contactId,
          stage_id: stageId,
          owner_id: null, // Will be assigned later
          source: 'ai',
          ai_confidence: aiData.ai_metadata.confidence_score,
          ai_metadata: {
            ...aiData.ai_metadata,
            n8n_metadata: aiData.n8n_metadata
          }
        })
        .select('id')
        .single();

      if (opportunityError) throw opportunityError;
      opportunityId = opportunityData.id;
      console.log(`Created new opportunity with ID: ${opportunityId}`);
    }

    // Log the activity
    await supabase
      .from('activity_log')
      .insert({
        description: `Lead automaticamente criado pela IA: ${aiData.company.name} - ${aiData.contact.name}`,
        type: 'COMPANY_CREATED',
        user_id: null,
        related_company_id: companyId,
        related_opportunity_id: opportunityId,
        source: 'ai',
        ai_metadata: {
          confidence_score: aiData.ai_metadata.confidence_score,
          conversation_source: aiData.ai_metadata.conversation_source,
          n8n_metadata: aiData.n8n_metadata
        }
      });

    const result = {
      success: true,
      data: {
        company_id: companyId,
        contact_id: contactId,
        opportunity_id: opportunityId,
        confidence_score: aiData.ai_metadata.confidence_score
      },
      message: 'Lead criado com sucesso pela IA'
    };

    console.log('AI lead intake completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-lead-intake function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});