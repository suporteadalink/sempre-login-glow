import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('add_task function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    const body = await req.json();
    console.log('Request body:', body);

    // Extract task data with defaults
    const taskData = {
      name: body.name || 'Nova Tarefa',
      description: body.description || null,
      type: body.type || null,
      priority: body.priority || null,
      status: body.status || 'Pendente',
      estimated_hours: body.estimated_hours ? parseFloat(body.estimated_hours) : null,
      due_date: body.due_date || null,
      notes: body.notes || null,
      responsible_id: user.id, // Will be updated below if responsible_name is provided
      company_id: null, // Will be updated below if company_name is provided
      contact_id: null, // Will be updated below if contact_name is provided
      opportunity_id: null, // Will be updated below if opportunity_title is provided
      project_id: null, // Will be updated below if project_title is provided
    };

    // Convert names to IDs
    if (body.responsible_name) {
      const { data: responsibleUser } = await supabaseClient
        .from('users')
        .select('id')
        .eq('name', body.responsible_name)
        .single();
      
      if (responsibleUser) {
        taskData.responsible_id = responsibleUser.id;
      }
    }

    if (body.company_name) {
      const { data: company } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('name', body.company_name)
        .single();
      
      if (company) {
        taskData.company_id = company.id;
      }
    }

    if (body.contact_name && taskData.company_id) {
      const { data: contact } = await supabaseClient
        .from('contacts')
        .select('id')
        .eq('name', body.contact_name)
        .eq('company_id', taskData.company_id)
        .single();
      
      if (contact) {
        taskData.contact_id = contact.id;
      }
    }

    if (body.opportunity_title && taskData.company_id) {
      const { data: opportunity } = await supabaseClient
        .from('opportunities')
        .select('id')
        .eq('title', body.opportunity_title)
        .eq('company_id', taskData.company_id)
        .single();
      
      if (opportunity) {
        taskData.opportunity_id = opportunity.id;
      }
    }

    if (body.project_title && taskData.company_id) {
      const { data: project } = await supabaseClient
        .from('projects')
        .select('id')
        .eq('title', body.project_title)
        .eq('company_id', taskData.company_id)
        .single();
      
      if (project) {
        taskData.project_id = project.id;
      }
    }

    console.log('Processed task data:', taskData);

    // No admin restrictions - anyone can assign tasks to anyone

    // Insert task into database and get responsible person's name
    const { data: task, error: insertError } = await supabaseClient
      .from('tasks')
      .insert(taskData)
      .select(`
        *,
        responsible:responsible_id (
          id,
          name
        )
      `)
      .single();

    if (insertError) {
      console.error('Error inserting task:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create task', details: insertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Task created successfully:', task);

    // Log activity
    try {
      const { error: activityError } = await supabaseClient
        .from('activity_log')
        .insert({
          description: `Tarefa "${task.name}" foi criada via API`,
          type: 'TASK_CREATED',
          user_id: user.id,
          related_company_id: task.company_id,
          related_opportunity_id: task.opportunity_id,
          source: 'api'
        });

      if (activityError) {
        console.error('Error logging activity:', activityError);
        // Don't fail the request if activity logging fails
      }
    } catch (activityLogError) {
      console.error('Error in activity logging:', activityLogError);
      // Continue without failing
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        task,
        message: 'Tarefa criada com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in add_task function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});