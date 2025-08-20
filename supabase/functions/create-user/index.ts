import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

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
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, password, name, role, phone } = await req.json();

    console.log('Creating user with data:', { email, name, role, phone });

    // Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin-created users
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      throw authError;
    }

    console.log('Auth user created:', authData.user?.id);

    // Insert into users table
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authData.user?.id,
        name: name,
        phone: phone,
        role: role || 'vendedor',
        status: 'Ativo'
      }]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw profileError;
    }

    console.log('User profile created successfully');

    return new Response(
      JSON.stringify({ 
        message: 'Usuário criado com sucesso!',
        user_id: authData.user?.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});