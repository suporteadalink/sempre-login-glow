import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CompanyData {
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  sector?: string;
  website?: string;
  type?: string;
  annual_revenue?: number;
  number_of_employees?: number;
  size?: string;
  owner_id?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_cargo?: string;
}

interface ImportRequest {
  companies: CompanyData[];
  owner_id?: string;
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

    const { companies, owner_id }: ImportRequest = await req.json()

    if (!companies || !Array.isArray(companies)) {
      return new Response(
        JSON.stringify({ error: 'Invalid companies data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine the actual owner for the companies
    let actualOwnerId = user.id;
    if (owner_id) {
      // Only admins can assign companies to other users
      if (userData.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Only admins can assign companies to other users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Validate that the target user exists and is active
      const { data: targetUser, error: userError } = await supabaseClient
        .from('users')
        .select('id, name, role, status')
        .eq('id', owner_id)
        .eq('status', 'Ativo')
        .single()
      
      if (userError || !targetUser) {
        return new Response(
          JSON.stringify({ error: 'Target user not found or inactive' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      actualOwnerId = owner_id;
    }

    const result: ImportResult = {
      total: companies.length,
      success: 0,
      errors: 0,
      warnings: 0,
      details: []
    }

    // Filter valid companies and check for duplicates
    const validCompanies: CompanyData[] = [];
    
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const rowNumber = i + 1;

      try {
        // Check for duplicate CNPJ only if it's not empty and has reasonable length
        if (company.cnpj && company.cnpj.trim().length >= 11) {
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

        validCompanies.push(company);
      } catch (error) {
        console.error('Error validating company:', error);
        result.errors++;
        result.details.push({
          row: rowNumber,
          status: 'error',
          message: `Erro na validação: ${error.message}`
        });
      }
    }

    if (validCompanies.length > 0) {
      try {
        // Insert companies in batches
        const companiesToInsert = validCompanies.map(company => ({
          name: company.name,
          cnpj: company.cnpj,
          phone: company.phone,
          email: company.email,
          city: company.city,
          state: company.state,
          sector: company.sector,
          website: company.website,
          type: company.type || 'Lead',
          annual_revenue: company.annual_revenue,
          number_of_employees: company.number_of_employees,
          size: company.size,
          owner_id: company.owner_id || actualOwnerId,
          source: 'import'
        }));

        const { data: insertedCompanies, error: insertError } = await supabaseClient
          .from('companies')
          .insert(companiesToInsert)
          .select('id, name');

        if (insertError) {
          throw insertError;
        }

        console.log(`Imported ${insertedCompanies.length} companies successfully`);
        
        // Create contacts for companies that have contact information
        const contactsToCreate = [];
        for (let i = 0; i < validCompanies.length; i++) {
          const company = validCompanies[i];
          const insertedCompany = insertedCompanies[i];
          
          if (company.contact_name && insertedCompany) {
            contactsToCreate.push({
              name: company.contact_name,
              phone: company.contact_phone,
              role: company.contact_cargo,
              email: company.email, // Usar o email da empresa como fallback
              company_id: insertedCompany.id,
              owner_id: company.owner_id || actualOwnerId,
              source: 'import'
            });
          }
        }
        
        // Insert contacts if any
        if (contactsToCreate.length > 0) {
          const { data: insertedContacts, error: contactsError } = await supabaseClient
            .from('contacts')
            .insert(contactsToCreate)
            .select('id, name, company_id');
            
          if (contactsError) {
            console.error('Error inserting contacts:', contactsError);
            result.warnings++;
          } else {
            console.log(`Created ${insertedContacts?.length || 0} contacts`);
            if (insertedContacts?.length) {
              result.warnings++;
            }
          }
        }

        // Create opportunities for Lead companies
        const opportunitiesToCreate = [];
        for (let i = 0; i < validCompanies.length; i++) {
          const company = validCompanies[i];
          const insertedCompany = insertedCompanies[i];
          
          if (company.type === 'Lead' && insertedCompany) {
            // Get the first pipeline stage (usually "Novo Lead")
            const { data: pipelineStages } = await supabaseClient
              .from('pipeline_stages')
              .select('id')
              .order('order')
              .limit(1);

            if (pipelineStages && pipelineStages.length > 0) {
              opportunitiesToCreate.push({
                title: `Oportunidade - ${company.name}`,
                description: 'Oportunidade criada automaticamente via importação',
                value: company.annual_revenue || 0,
                company_id: insertedCompany.id,
                stage_id: pipelineStages[0].id,
                owner_id: company.owner_id || actualOwnerId,
                probability: 10
              });
            }
          }
        }

        // Insert opportunities if any
        if (opportunitiesToCreate.length > 0) {
          const { error: opportunityError } = await supabaseClient
            .from('opportunities')
            .insert(opportunitiesToCreate);

          if (opportunityError) {
            console.error('Error inserting opportunities:', opportunityError);
            result.warnings++;
          } else {
            console.log(`Created ${opportunitiesToCreate.length} opportunities`);
          }
        }

        // Update success count
        result.success = insertedCompanies.length;
        
        // Add success details for each company
        insertedCompanies.forEach((company, index) => {
          result.details.push({
            row: result.details.length + 1,
            status: 'success',
            message: 'Importado com sucesso'
          });
        });

      } catch (error) {
        console.error('Batch insert error:', error);
        result.errors += validCompanies.length;
        result.details.push({
          row: 0,
          status: 'error',
          message: `Erro na inserção em lote: ${error.message}`
        });
      }
    }

    // Log the import activity
    try {
      await supabaseClient
        .from('activity_log')
        .insert({
          description: `Importação em massa: ${result.success} empresas importadas com sucesso, ${result.errors} erros, ${result.warnings} avisos`,
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