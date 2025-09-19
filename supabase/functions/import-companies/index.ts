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

  const startTime = Date.now();
  console.log('Import function started');

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

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { companies, owner_id }: ImportRequest = requestBody;
    console.log(`Processing ${companies?.length || 0} companies`);

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

    // Separate companies for creation and update
    const companiesToCreate: CompanyData[] = [];
    const companiesToUpdate: Array<CompanyData & { existingId: number }> = [];
    
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const rowNumber = i + 1;

      try {
        // Check for existing CNPJ only if it's not empty and has reasonable length
        if (company.cnpj && company.cnpj.trim().length >= 11) {
          const { data: existingCompany } = await supabaseClient
            .from('companies')
            .select('id')
            .eq('cnpj', company.cnpj)
            .single()

          if (existingCompany) {
            // Add to update list
            companiesToUpdate.push({
              ...company,
              existingId: existingCompany.id
            });
            result.details.push({
              row: rowNumber,
              status: 'success',
              message: `ATUALIZAÇÃO: Empresa "${company.name}" atualizada (CNPJ ${company.cnpj} já existia no sistema)`
            });
            continue;
          }
        }

        // Add to creation list
        companiesToCreate.push(company);
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

    // Process companies to create in smaller batches to avoid timeout
    let insertedCompanies: any[] = [];
    if (companiesToCreate.length > 0) {
      try {
        console.log(`Creating ${companiesToCreate.length} new companies`);
        
        const companiesToInsert = companiesToCreate.map(company => ({
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

        // Process in batches of 50 to avoid timeout
        const batchSize = 50;
        for (let i = 0; i < companiesToInsert.length; i += batchSize) {
          const batch = companiesToInsert.slice(i, i + batchSize);
          console.log(`Processing batch ${Math.floor(i/batchSize) + 1} with ${batch.length} companies`);

          const { data: newCompanies, error: insertError } = await supabaseClient
            .from('companies')
            .insert(batch)
            .select('id, name');

          if (insertError) {
            console.error('Batch insert error:', insertError);
            throw insertError;
          }

          insertedCompanies = insertedCompanies.concat(newCompanies || []);
        }
        console.log(`Created ${insertedCompanies.length} new companies`);

        // Add success details for new companies
        for (let i = 0; i < insertedCompanies.length; i++) {
          const newCompany = insertedCompanies[i];
          const originalCompany = companiesToCreate[i];
          result.details.push({
            row: companiesToCreate.findIndex(c => c.name === originalCompany.name) + 1,
            status: 'success',
            message: `NOVO CADASTRO: Empresa "${newCompany.name}" cadastrada com sucesso${originalCompany.cnpj ? ` (CNPJ: ${originalCompany.cnpj})` : ''}`
          });
        }

      } catch (error) {
        console.error('Batch insert error:', error);
        result.errors += companiesToCreate.length;
        result.details.push({
          row: 0,
          status: 'error',
          message: `Erro na criação em lote: ${error.message}`
        });
      }
    }

    // Process companies to update
    for (const companyToUpdate of companiesToUpdate) {
      try {
        const updateData = {
          name: companyToUpdate.name,
          cnpj: companyToUpdate.cnpj,
          phone: companyToUpdate.phone,
          email: companyToUpdate.email,
          city: companyToUpdate.city,
          state: companyToUpdate.state,
          sector: companyToUpdate.sector,
          website: companyToUpdate.website,
          type: companyToUpdate.type || 'Lead',
          annual_revenue: companyToUpdate.annual_revenue,
          number_of_employees: companyToUpdate.number_of_employees,
          size: companyToUpdate.size,
          owner_id: companyToUpdate.owner_id || actualOwnerId,
          source: 'import'
        };

        const { error: updateError } = await supabaseClient
          .from('companies')
          .update(updateData)
          .eq('id', companyToUpdate.existingId);

        if (updateError) {
          throw updateError;
        }

        console.log(`Updated company ID ${companyToUpdate.existingId}`);

        // Update or create contact for updated company
        if (companyToUpdate.contact_name) {
          // Check if contact already exists for this company
          const { data: existingContact } = await supabaseClient
            .from('contacts')
            .select('id')
            .eq('company_id', companyToUpdate.existingId)
            .eq('name', companyToUpdate.contact_name)
            .single();

          const contactData = {
            name: companyToUpdate.contact_name,
            phone: companyToUpdate.contact_phone,
            role: companyToUpdate.contact_cargo,
            email: companyToUpdate.email,
            company_id: companyToUpdate.existingId,
            owner_id: companyToUpdate.owner_id || actualOwnerId,
            source: 'import'
          };

          if (existingContact) {
            // Update existing contact
            await supabaseClient
              .from('contacts')
              .update(contactData)
              .eq('id', existingContact.id);
          } else {
            // Create new contact
            await supabaseClient
              .from('contacts')
              .insert(contactData);
          }
        }

      } catch (error) {
        console.error('Error updating company:', error);
        result.errors++;
        result.details.push({
          row: 0,
          status: 'error',
          message: `Erro ao atualizar empresa: ${error.message}`
        });
      }
    }

    // Create contacts for new companies
    if (insertedCompanies.length > 0) {
      const contactsToCreate = [];
      for (let i = 0; i < companiesToCreate.length; i++) {
        const company = companiesToCreate[i];
        const insertedCompany = insertedCompanies[i];
        
        if (company.contact_name && insertedCompany) {
          contactsToCreate.push({
            name: company.contact_name,
            phone: company.contact_phone,
            role: company.contact_cargo,
            email: company.email,
            company_id: insertedCompany.id,
            owner_id: company.owner_id || actualOwnerId,
            source: 'import'
          });
        }
      }
      
      if (contactsToCreate.length > 0) {
        const { error: contactsError } = await supabaseClient
          .from('contacts')
          .insert(contactsToCreate);
          
        if (contactsError) {
          console.error('Error inserting contacts:', contactsError);
          result.warnings++;
        } else {
          console.log(`Created ${contactsToCreate.length} contacts`);
        }
      }

      // Create opportunities for new Lead companies
      const opportunitiesToCreate = [];
      for (let i = 0; i < companiesToCreate.length; i++) {
        const company = companiesToCreate[i];
        const insertedCompany = insertedCompanies[i];
        
        if (company.type === 'Lead' && insertedCompany) {
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
    }

    // Update success count
    result.success = insertedCompanies.length + companiesToUpdate.length;

    // Log the import activity with detailed information
    try {
      const createdCount = insertedCompanies.length;
      const updatedCount = companiesToUpdate.length;
      const totalProcessed = createdCount + updatedCount;
      
      let logDescription = `Importação em massa concluída: `;
      
      if (createdCount > 0) {
        logDescription += `${createdCount} ${createdCount === 1 ? 'nova empresa cadastrada' : 'novas empresas cadastradas'}`;
      }
      
      if (updatedCount > 0) {
        if (createdCount > 0) logDescription += ', ';
        logDescription += `${updatedCount} ${updatedCount === 1 ? 'empresa atualizada' : 'empresas atualizadas'} (CNPJ já existente)`;
      }
      
      if (result.errors > 0) {
        logDescription += `, ${result.errors} ${result.errors === 1 ? 'erro' : 'erros'}`;
      }
      
      if (result.warnings > 0) {
        logDescription += `, ${result.warnings} ${result.warnings === 1 ? 'aviso' : 'avisos'}`;
      }
      
      logDescription += `. Total processado: ${totalProcessed}/${result.total} empresas.`;

        await supabaseClient
        .from('activity_log')
        .insert({
          description: logDescription,
          type: 'BULK_IMPORT',
          user_id: user.id
        })
    } catch (logError) {
      console.error('Failed to log activity:', logError)
    }

    const duration = Date.now() - startTime;
    console.log(`Import completed in ${duration}ms`);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Function error after ${duration}ms:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        duration: duration
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})