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

    // Fetch notification details for audit logging
    const { data: notificationData, error: notificationError } = await supabase
      .from('notification_outbox')
      .select('payment_submission_id, template_name')
      .eq('id', id)
      .maybeSingle();

    if (notificationError) {
      console.error('Error fetching notification data:', notificationError);
    }

    // Get flat number and apartment_id from payment submission
    let flatNumber = 'UNKNOWN';
    let apartmentId: string | null = null;
    let paymentId = notificationData?.payment_submission_id;
    const templateName = notificationData?.template_name || 'notification';

    if (paymentId) {
      const { data: paymentData } = await supabase
        .from('payment_submissions')
        .select('apartment_id, flat_id, flat_numbers(flat_number)')
        .eq('id', paymentId)
        .maybeSingle();

      if (paymentData) {
        apartmentId = paymentData.apartment_id;
        if (paymentData.flat_numbers) {
          flatNumber = paymentData.flat_numbers.flat_number;
        }
      }
    }

    // If we still don't have apartment_id, try to find it from phone number
    if (!apartmentId && recipient_phone) {
      const { data: flatMapping } = await supabase
        .from('flat_email_mappings')
        .select('flat_number, apartment_id')
        .eq('mobile', recipient_phone)
        .maybeSingle();

      if (flatMapping) {
        flatNumber = flatMapping.flat_number;
        apartmentId = flatMapping.apartment_id;
      }
    }

    console.log(`Resolved apartment_id: ${apartmentId}, flat_number: ${flatNumber}`);

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

      // Log to communication audit trail
      if (apartmentId) {
        await supabase.rpc('log_communication_event', {
          p_apartment_id: apartmentId,
          p_flat_number: flatNumber,
          p_recipient_name: recipient_name,
          p_recipient_email: null,
          p_recipient_mobile: recipient_phone,
          p_channel: 'WHATSAPP',
          p_type: templateName,
          p_payment_id: paymentId,
          p_subject: templateName,
          p_preview: message_preview,
          p_full_data: { notification_outbox_id: id, error: 'Gupshup API key not configured' },
          p_status: 'FAILED',
          p_triggered_by_user_id: null,
          p_triggered_by_event: 'whatsapp_notification',
          p_whatsapp_opt_in: true
        });
      } else {
        console.warn(`Cannot log to communication audit: apartment_id is null for notification ${id}`);
      }

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

    // Format phone number
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

    const responseText = await gupshupResponse.text();
    console.log(`Gupshup API response status: ${gupshupResponse.status}`);
    console.log(`Gupshup API response text: ${responseText}`);

    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
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

      // Log to communication audit trail
      if (apartmentId) {
        await supabase.rpc('log_communication_event', {
          p_apartment_id: apartmentId,
          p_flat_number: flatNumber,
          p_recipient_name: recipient_name,
          p_recipient_email: null,
          p_recipient_mobile: recipient_phone,
          p_channel: 'WHATSAPP',
          p_type: templateName,
          p_payment_id: paymentId,
          p_subject: templateName,
          p_preview: message_preview,
          p_full_data: { notification_outbox_id: id, error: friendlyMessage, error_details: errorMessage },
          p_status: 'FAILED',
          p_triggered_by_user_id: null,
          p_triggered_by_event: 'whatsapp_notification',
          p_whatsapp_opt_in: true
        });
      } else {
        console.warn(`Cannot log to communication audit: apartment_id is null for notification ${id}`);
      }

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

      // Log to communication audit trail
      if (apartmentId) {
        await supabase.rpc('log_communication_event', {
          p_apartment_id: apartmentId,
          p_flat_number: flatNumber,
          p_recipient_name: recipient_name,
          p_recipient_email: null,
          p_recipient_mobile: recipient_phone,
          p_channel: 'WHATSAPP',
          p_type: templateName,
          p_payment_id: paymentId,
          p_subject: templateName,
          p_preview: message_preview,
          p_full_data: { notification_outbox_id: id, gupshup_message_id: responseData.messageId },
          p_status: 'DELIVERED',
          p_triggered_by_user_id: null,
          p_triggered_by_event: 'whatsapp_notification',
          p_whatsapp_opt_in: true
        });
      } else {
        console.warn(`Cannot log to communication audit: apartment_id is null for notification ${id}`);
      }

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

      // Log to communication audit trail
      if (apartmentId) {
        await supabase.rpc('log_communication_event', {
          p_apartment_id: apartmentId,
          p_flat_number: flatNumber,
          p_recipient_name: recipient_name,
          p_recipient_email: null,
          p_recipient_mobile: recipient_phone,
          p_channel: 'WHATSAPP',
          p_type: templateName,
          p_payment_id: paymentId,
          p_subject: templateName,
          p_preview: message_preview,
          p_full_data: { notification_outbox_id: id, error: failureReason },
          p_status: 'FAILED',
          p_triggered_by_user_id: null,
          p_triggered_by_event: 'whatsapp_notification',
          p_whatsapp_opt_in: true
        });
      } else {
        console.warn(`Cannot log to communication audit: apartment_id is null for notification ${id}`);
      }

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