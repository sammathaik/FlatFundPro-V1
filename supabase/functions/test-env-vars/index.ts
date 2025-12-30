import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Check all environment variables we need
    const envVars = {
      SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "SET (hidden)" : "NOT SET",
      GUPSHUP_API_KEY: Deno.env.get("GUPSHUP_API_KEY"),
      GUPSHUP_APP_NAME: Deno.env.get("GUPSHUP_APP_NAME"),
    };

    // Get detailed info about GUPSHUP_API_KEY
    const gupshupApiKey = Deno.env.get("GUPSHUP_API_KEY");
    let gupshupDetails = {
      exists: !!gupshupApiKey,
      length: gupshupApiKey?.length || 0,
      firstChars: gupshupApiKey?.substring(0, 4) || "N/A",
      lastChars: gupshupApiKey?.substring(gupshupApiKey.length - 4) || "N/A",
      hasSpaces: gupshupApiKey?.includes(" ") || false,
      hasQuotes: gupshupApiKey?.includes('"') || gupshupApiKey?.includes("'") || false,
    };

    // Try to list all available environment variables (this might be limited by Deno security)
    const allEnvKeys: string[] = [];
    try {
      for (const key in Deno.env.toObject()) {
        allEnvKeys.push(key);
      }
    } catch (e) {
      console.log("Cannot enumerate all env vars:", e);
    }

    const response = {
      timestamp: new Date().toISOString(),
      message: "Environment Variable Diagnostic",
      envVars,
      gupshupDetails,
      availableEnvKeys: allEnvKeys.length > 0 ? allEnvKeys : "Cannot enumerate (security restricted)",
      diagnostics: {
        gupshupConfigured: !!gupshupApiKey,
        supabaseConfigured: !!Deno.env.get("SUPABASE_URL") && !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
        allRequiredPresent: !!(gupshupApiKey && Deno.env.get("SUPABASE_URL") && Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
      }
    };

    console.log("Environment diagnostic response:", JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response, null, 2),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in diagnostic:", error);

    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});