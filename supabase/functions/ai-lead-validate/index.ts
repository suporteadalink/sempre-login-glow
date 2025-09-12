import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
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

    const validationData: ValidationRequest = await req.json();
    
    console.log('Validating AI lead data:', JSON.stringify(validationData, null, 2));

    const validation = {
      isValid: true,
      warnings: [] as string[],
      errors: [] as string[],
      duplicates: {
        company: null as any,
        contact: null as any
      },
      preview: {
        will_create_company: true,
        will_create_contact: true,
        will_create_opportunity: !!validationData.opportunity
      }
    };

    // Validate required fields
    if (!validationData.company?.name) {
      validation.errors.push('Nome da empresa é obrigatório');
      validation.isValid = false;
    }

    if (!validationData.contact?.name) {
      validation.errors.push('Nome do contato é obrigatório');
      validation.isValid = false;
    }

    // Check for duplicate company
    if (validationData.company.cnpj) {
      const { data: existingCompanyByCNPJ } = await supabase
        .from('companies')
        .select('id, name, type, created_at')
        .eq('cnpj', validationData.company.cnpj)
        .maybeSingle();
      
      if (existingCompanyByCNPJ) {
        validation.duplicates.company = existingCompanyByCNPJ;
        validation.preview.will_create_company = false;
        validation.warnings.push(`Empresa já existe (CNPJ): ${existingCompanyByCNPJ.name}`);
      }
    }

    if (!validation.duplicates.company && validationData.company.name) {
      const { data: existingCompanyByName } = await supabase
        .from('companies')
        .select('id, name, type, created_at')
        .ilike('name', validationData.company.name)
        .maybeSingle();
      
      if (existingCompanyByName) {
        validation.duplicates.company = existingCompanyByName;
        validation.preview.will_create_company = false;
        validation.warnings.push(`Empresa similar já existe: ${existingCompanyByName.name}`);
      }
    }

    // Check for duplicate contact (only if we have a company to check against)
    if (validation.duplicates.company && validationData.contact.email) {
      const { data: existingContactByEmail } = await supabase
        .from('contacts')
        .select('id, name, email, created_at')
        .eq('company_id', validation.duplicates.company.id)
        .eq('email', validationData.contact.email)
        .maybeSingle();
      
      if (existingContactByEmail) {
        validation.duplicates.contact = existingContactByEmail;
        validation.preview.will_create_contact = false;
        validation.warnings.push(`Contato já existe (email): ${existingContactByEmail.name}`);
      }
    }

    // Validate AI confidence score
    if (validationData.ai_metadata.confidence_score < 0.7) {
      validation.warnings.push(`Confiança da IA baixa: ${(validationData.ai_metadata.confidence_score * 100).toFixed(0)}%`);
    }

    // Validate opportunity data if provided
    if (validationData.opportunity) {
      if (!validationData.opportunity.title) {
        validation.errors.push('Título da oportunidade é obrigatório');
        validation.isValid = false;
      }
      
      if (validationData.opportunity.value && validationData.opportunity.value <= 0) {
        validation.warnings.push('Valor da oportunidade deve ser maior que zero');
      }
    }

    // Validate contact information quality
    if (!validationData.contact.email && !validationData.contact.phone) {
      validation.warnings.push('Contato não possui email nem telefone');
    }

    // Check pipeline stages availability
    const { data: stageData } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('name', 'Novo Lead')
      .maybeSingle();

    if (!stageData && validationData.opportunity) {
      validation.warnings.push('Stage "Novo Lead" não encontrado no pipeline');
    }

    const result = {
      success: true,
      validation,
      data_preview: {
        company: {
          ...validationData.company,
          type: 'Lead',
          source: 'ai'
        },
        contact: {
          ...validationData.contact,
          source: 'ai'
        },
        opportunity: validationData.opportunity ? {
          ...validationData.opportunity,
          source: 'ai'
        } : null
      }
    };

    console.log('Validation completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-lead-validate function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});