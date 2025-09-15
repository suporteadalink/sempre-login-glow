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

    const data: ValidationRequest = await req.json();
    
    console.log('Validating AI lead data:', JSON.stringify(data, null, 2));

    const result = {
      isValid: true,
      warnings: [] as string[],
      errors: [] as string[],
      duplicates: {
        company: null as any,
        contact: null as any
      },
      preview: {
        company: data.company,
        contact: data.contact,
        opportunity: data.opportunity || null,
        confidence: data.confidence,
        source: data.source
      }
    };

    // Basic validation
    if (!data.company?.name) {
      result.errors.push('Nome da empresa é obrigatório');
    }
    
    if (!data.contact?.name) {
      result.errors.push('Nome do contato é obrigatório');
    }

    // Check for existing company
    if (data.company.cnpj) {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, name, type')
        .eq('cnpj', data.company.cnpj)
        .single();
      
      if (existingCompany) {
        result.duplicates.company = existingCompany;
        result.warnings.push(`Empresa já existe no sistema (CNPJ: ${data.company.cnpj})`);
      }
    } else {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, name, type')
        .ilike('name', data.company.name)
        .single();
      
      if (existingCompany) {
        result.duplicates.company = existingCompany;
        result.warnings.push(`Empresa similar já existe no sistema: "${existingCompany.name}"`);
      }
    }

    // Check for existing contact (if company exists)
    if (result.duplicates.company && data.contact.email) {
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id, name, email')
        .eq('company_id', result.duplicates.company.id)
        .eq('email', data.contact.email)
        .single();
      
      if (existingContact) {
        result.duplicates.contact = existingContact;
        result.warnings.push(`Contato já existe na empresa: ${existingContact.email}`);
      }
    }

    // Validate AI confidence
    if (data.confidence && data.confidence < 0.5) {
      result.warnings.push('Baixa confiança da IA (< 50%)');
    }

    // Validate opportunity
    if (data.opportunity) {
      if (!data.opportunity.title) {
        result.errors.push('Título da oportunidade é obrigatório');
      }
      if (data.opportunity.value && data.opportunity.value <= 0) {
        result.warnings.push('Valor da oportunidade deve ser maior que zero');
      }
    }

    // Validate contact info
    if (!data.contact.email && !data.contact.phone) {
      result.warnings.push('Contato não possui email nem telefone');
    }

    // Check if "Novo Lead" pipeline stage exists
    const { data: pipelineStage, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('name', 'Novo Lead')
      .single();

    if (stageError || !pipelineStage) {
      result.errors.push('Etapa "Novo Lead" não encontrada no pipeline');
    }

    // Set validation result
    result.isValid = result.errors.length === 0;

    console.log('Validation completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-lead-validate function:', error);
    
    return new Response(
      JSON.stringify({ 
        isValid: false,
        error: error.message || 'Erro interno do servidor',
        warnings: [],
        errors: [error.message || 'Erro interno do servidor'],
        duplicates: { company: null, contact: null },
        preview: null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});