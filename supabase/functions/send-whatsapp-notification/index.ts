import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationPayload {
  id: string;
  recipient_phone: string;
  message_preview: string;
  recipient_name: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const payload: NotificationPayload = await req.json();
    const { id, recipient_phone, message_preview, recipient_name } = payload;

    console.log(`Processing WhatsApp notification ${id} for ${recipient_name} (${recipient_phone})`);

    // Check for TEST_SECRET
    const testSecret = Deno.env.get("TEST_SECRET");
    if (!testSecret) {
      console.log("TEST_SECRET not found");

      return new Response(
        JSON.stringify({
          success: false,
          message: "TEST_SECRET_NOT_FOUND",
          notification_id: id,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("TEST_SECRET found and available");

    // Gupshup Sandbox API credentials
    const gupshupApiKey = Deno.env.get("GUPSHUP_API_KEY");
    const gupshupAppName = Deno.env.get("GUPSHUP_APP_NAME") || "FlatFundPro";

    if (!gupshupApiKey) {
      console.log("Gupshup API key not configured - marking as SANDBOX_FAILED");

      await supabase
        .from("notification_outbox")
        .update({
          status: "SANDBOX_FAILED",
          failure_reason: "Gupshup API key not configured",
        })
        .eq("id", id);

      return new Response(
        JSON.stringify({
          success: false,
          message: "Gupshup API key not configured",
          notification_id: id,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Format phone number (remove any spaces, ensure + prefix)
    let formattedPhone = recipient_phone.trim();
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+" + formattedPhone;
    }

    console.log(`Attempting to send via Gupshup Sandbox to ${formattedPhone}`);

    // Gupshup Sandbox API call
    const gupshupUrl = "https://api.gupshup.io/sm/api/v1/msg";

    const formData = new URLSearchParams();
    formData.append("channel", "whatsapp");
    formData.append("source", gupshupAppName);
    formData.append("destination", formattedPhone);
    formData.append("message", JSON.stringify({
      type: "text",
      text: message_preview,
    }));
    formData.append("src.name", gupshupAppName);

    const gupshupResponse = await fetch(gupshupUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": gupshupApiKey,
      },
      body: formData.toString(),
    });

    // Get response as text first to handle non-JSON responses
    const responseText = await gupshupResponse.text();
    console.log(`Gupshup API response status: ${gupshupResponse.status}`);
    console.log(`Gupshup API response text: ${responseText}`);

    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      // Response is not valid JSON - likely an error page or plain text
      const errorMessage = responseText.substring(0, 200);
      console.error(`Gupshup returned non-JSON response: ${errorMessage}`);

      let friendlyMessage = "Gupshup API returned an error";
      if (responseText.toLowerCase().includes("portal user")) {
        friendlyMessage = "Invalid Gupshup API key or account not found";
      } else if (responseText.toLowerCase().includes("unauthorized")) {
        friendlyMessage = "Gupshup API key is unauthorized";
      } else if (responseText.toLowerCase().includes("not found")) {
        friendlyMessage = "Gupshup API endpoint not found or app not configured";
      }

      await supabase
        .from("notification_outbox")
        .update({
          status: "SANDBOX_FAILED",
          failure_reason: `${friendlyMessage}: ${errorMessage}`.substring(0, 500),
        })
        .eq("id", id);

      return new Response(
        JSON.stringify({
          success: false,
          message: friendlyMessage,
          details: errorMessage,
          notification_id: id,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Gupshup API parsed response:", JSON.stringify(responseData));

    if (gupshupResponse.ok && (responseData.status === "success" || responseData.status === "submitted")) {
      console.log(`Successfully sent via Gupshup Sandbox. Message ID: ${responseData.messageId}`);

      await supabase
        .from("notification_outbox")
        .update({
          status: "SANDBOX_SENT",
          sent_at: new Date().toISOString(),
        })
        .eq("id", id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Notification sent via Gupshup Sandbox",
          notification_id: id,
          gupshup_message_id: responseData.messageId,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      const failureReason = responseData.message || responseData.response?.message || "Gupshup API rejected the request";
      console.log(`Gupshup Sandbox failed: ${failureReason}`);

      await supabase
        .from("notification_outbox")
        .update({
          status: "SANDBOX_FAILED",
          failure_reason: failureReason.substring(0, 500),
        })
        .eq("id", id);

      return new Response(
        JSON.stringify({
          success: false,
          message: failureReason,
          notification_id: id,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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