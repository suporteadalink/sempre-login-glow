import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CompanyData {
  nome: string;
  cnpj?: string;
  cidade?: string;
  estado?: string;
  setor?: string;
  porte?: string;
  funcionarios?: number;
  receita_anual?: number;
  telefone?: string;
  email?: string;
  website?: string;
  tipo: 'Lead' | 'Cliente';
}

interface ImportResult {
  total: number;
  success: number;
  errors: number;
  warnings: number;
  details: Array<{
    row: number;
    status: 'success' | 'error';
    message: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header and verify the user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has permission to import (admin or has owner_id)
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { companies }: { companies: CompanyData[] } = await req.json()

    if (!companies || !Array.isArray(companies)) {
      return new Response(
        JSON.stringify({ error: 'Invalid companies data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result: ImportResult = {
      total: companies.length,
      success: 0,
      errors: 0,
      warnings: 0,
      details: []
    }

    // Process companies in batches
    const batchSize = 50
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize)
      
      for (let j = 0; j < batch.length; j++) {
        const company = batch[j]
        const rowNumber = i + j + 1

        try {
          // Check for duplicate CNPJ if provided
          if (company.cnpj) {
            const { data: existingCompany } = await supabaseClient
              .from('companies')
              .select('id')
              .eq('cnpj', company.cnpj)
              .single()

            if (existingCompany) {
              result.errors++
              result.details.push({
                row: rowNumber,
                status: 'error',
                message: `CNPJ ${company.cnpj} já existe`
              })
              continue
            }
          }

          // Prepare company data for insertion
          const companyData = {
            name: company.nome,
            cnpj: company.cnpj || null,
            city: company.cidade || null,
            state: company.estado || null,
            sector: company.setor || null,
            size: company.porte || null,
            number_of_employees: company.funcionarios || null,
            annual_revenue: company.receita_anual || null,
            phone: company.telefone || null,
            email: company.email || null,
            website: company.website || null,
            type: company.tipo,
            owner_id: user.id
          }

          // Insert company
          const { data: insertedCompany, error: insertError } = await supabaseClient
            .from('companies')
            .insert(companyData)
            .select('id')
            .single()

          if (insertError) {
            console.error('Insert error:', insertError)
            result.errors++
            result.details.push({
              row: rowNumber,
              status: 'error',
              message: `Erro ao inserir: ${insertError.message}`
            })
            continue
          }

          // If company type is Lead, create an opportunity
          if (company.tipo === 'Lead' && insertedCompany) {
            // Get the first pipeline stage (usually "Novo Lead")
            const { data: pipelineStages } = await supabaseClient
              .from('pipeline_stages')
              .select('id')
              .order('order')
              .limit(1)

            if (pipelineStages && pipelineStages.length > 0) {
              const opportunityData = {
                title: `Oportunidade - ${company.nome}`,
                description: 'Oportunidade criada automaticamente via importação',
                value: company.receita_anual || 0,
                company_id: insertedCompany.id,
                stage_id: pipelineStages[0].id,
                owner_id: user.id,
                probability: 10
              }

              const { error: opportunityError } = await supabaseClient
                .from('opportunities')
                .insert(opportunityData)

              if (opportunityError) {
                console.error('Opportunity creation error:', opportunityError)
                // Don't fail the company import if opportunity creation fails
                result.warnings++
              }
            }
          }

          result.success++
          result.details.push({
            row: rowNumber,
            status: 'success',
            message: 'Importado com sucesso'
          })

        } catch (error) {
          console.error('Processing error:', error)
          result.errors++
          result.details.push({
            row: rowNumber,
            status: 'error',
            message: `Erro inesperado: ${error.message}`
          })
        }
      }
    }

    // Log the import activity
    try {
      await supabaseClient
        .from('activity_log')
        .insert({
          description: `Importação em massa: ${result.success} empresas importadas com sucesso, ${result.errors} erros`,
          type: 'BULK_IMPORT',
          user_id: user.id
        })
    } catch (logError) {
      console.error('Failed to log activity:', logError)
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})