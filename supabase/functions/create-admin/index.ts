import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateAdminRequest {
  admin_name: string;
  admin_email: string;
  phone?: string;
  apartment_id: string;
  status: 'active' | 'inactive';
  password: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create regular client to verify the caller is a super admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user is a super admin
    const { data: superAdmin, error: superAdminError } = await supabaseClient
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (superAdminError || !superAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only super admins can create admins' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: CreateAdminRequest = await req.json();

    // Validate required fields
    if (!body.admin_name || !body.admin_email || !body.apartment_id || !body.password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Normalize email
    const email = body.admin_email.trim().toLowerCase();

    // Check if admin with this email already exists
    const { data: existingAdmin } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('admin_email', email)
      .maybeSingle();

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ error: 'An admin with this email already exists' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create user in auth.users using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        admin_name: body.admin_name.trim(),
        role: 'admin',
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${authError.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create admin record in admins table
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admins')
      .insert([
        {
          user_id: authData.user.id,
          admin_name: body.admin_name.trim(),
          admin_email: email,
          phone: body.phone?.trim() || null,
          apartment_id: body.apartment_id,
          status: body.status,
        },
      ])
      .select()
      .single();

    if (adminError) {
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('Admin insert error:', adminError);
      return new Response(
        JSON.stringify({ error: `Failed to create admin record: ${adminError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: adminData }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});