import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ShareCollectionRequest {
  collection_id: string;
  apartment_id: string;
  share_code: string;
  share_url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  console.log("=== Share Collection Status: Function Entry ===");

  try {
    const payload: ShareCollectionRequest = await req.json();
    const { collection_id, apartment_id, share_code, share_url } = payload;

    console.log("Request payload:", { collection_id, apartment_id, share_code });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const gupshupApiKey = Deno.env.get("GUPSHUP_API_KEY");
    const gupshupAppName = Deno.env.get("GUPSHUP_APP_NAME");

    console.log("Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      hasResendKey: !!resendApiKey,
      hasGupshupKey: !!gupshupApiKey,
      hasGupshupAppName: !!gupshupAppName,
    });

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get collection details
    console.log("Fetching collection details...");
    const { data: collection, error: collectionError } = await supabase
      .from("expected_collections")
      .select(`
        collection_name,
        payment_type,
        due_date,
        quarter,
        financial_year
      `)
      .eq("id", collection_id)
      .single();

    if (collectionError) {
      console.error("Error fetching collection:", collectionError);
      throw collectionError;
    }
    console.log("Collection loaded:", collection?.collection_name);

    // Get apartment details
    console.log("Fetching apartment details...");
    const { data: apartment, error: apartmentError } = await supabase
      .from("apartments")
      .select("apartment_name")
      .eq("id", apartment_id)
      .single();

    if (apartmentError) {
      console.error("Error fetching apartment:", apartmentError);
      throw apartmentError;
    }
    console.log("Apartment loaded:", apartment?.apartment_name);

    // Get all registered residents - FIXED QUERY
    console.log("Fetching residents...");
    const { data: residents, error: residentsError } = await supabase
      .from("flat_email_mappings")
      .select(`
        email,
        mobile,
        name,
        flat_id,
        whatsapp_opt_in,
        flat_numbers!inner (
          flat_number,
          block_id,
          buildings_blocks_phases!inner (
            block_name,
            apartment_id
          )
        )
      `)
      .eq("flat_numbers.buildings_blocks_phases.apartment_id", apartment_id);

    if (residentsError) {
      console.error("Error fetching residents:", residentsError);
      throw residentsError;
    }

    console.log(`Found ${residents?.length || 0} resident mappings`);

    const emailAddresses = residents
      ?.filter((r) => r.email)
      .map((r) => ({
        email: r.email,
        name: r.name,
        flat_number: r.flat_numbers?.flat_number,
      })) || [];

    const whatsappNumbers = residents
      ?.filter((r) => r.mobile && r.whatsapp_opt_in === true)
      .map((r) => ({
        mobile: r.mobile,
        name: r.name,
        flat_number: r.flat_numbers?.flat_number,
      })) || [];

    console.log(`Email recipients: ${emailAddresses.length}`);
    console.log(`WhatsApp recipients (opt-in): ${whatsappNumbers.length}`);

    let sent = 0;
    let failed = 0;

    // Email subject and body
    const emailSubject = `Payment Status Update | ${collection.collection_name}`;
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collection Status Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Collection Status Update</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0; font-size: 16px;">${apartment.apartment_name}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Dear Resident,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                Here is the current payment status for the <strong>${collection.collection_name}</strong> maintenance collection.
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                This shared view helps keep everyone informed and reduces the need for individual follow-ups.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 10px; overflow: hidden; margin: 0 0 25px; border: 2px solid #3b82f6;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="color: #1e3a8a; margin: 0 0 15px; font-size: 16px; font-weight: 600;">Collection Details</h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #1e40af; font-weight: 600; padding: 5px 0;">Collection:</td>
                        <td style="color: #1e3a8a; padding: 5px 0;">${collection.collection_name}</td>
                      </tr>
                      <tr>
                        <td style="color: #1e40af; font-weight: 600; padding: 5px 0;">Period:</td>
                        <td style="color: #1e3a8a; padding: 5px 0;">${collection.quarter} ${collection.financial_year}</td>
                      </tr>
                      <tr>
                        <td style="color: #1e40af; font-weight: 600; padding: 5px 0;">Due Date:</td>
                        <td style="color: #1e3a8a; padding: 5px 0;">${new Date(collection.due_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 25px;">
                    <a href="${share_url}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                      View Collection Status
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; padding: 20px 0 0; border-top: 1px solid #e5e7eb;">
                <strong>Note:</strong> This status view is informational and helps maintain transparency. Individual payment amounts are not displayed for privacy.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">Powered by <strong style="color: #374151;">FlatFund Pro</strong></p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Payment governance built for accountability</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    // Send emails
    console.log("=== Starting Email Delivery ===");
    for (const recipient of emailAddresses) {
      try {
        console.log(`Sending email to ${recipient.email} (Flat ${recipient.flat_number})`);

        if (!resendApiKey) {
          console.error("RESEND_API_KEY not configured");
          failed++;

          // Log failed attempt to communication_logs
          await supabase.from("communication_logs").insert({
            apartment_id,
            flat_number: recipient.flat_number || "Unknown",
            recipient_name: recipient.name,
            recipient_email: recipient.email,
            communication_channel: "EMAIL",
            communication_type: "collection_status_share",
            related_entity_type: "expected_collection",
            related_entity_id: collection_id,
            message_subject: emailSubject,
            message_preview: `Collection status shared for ${collection.collection_name}`,
            status: "FAILED",
            error_message: "RESEND_API_KEY not configured",
            triggered_by_event: "share_collection_status",
            template_name: "share_collection_status_v1",
            metadata: {
              collection_id,
              collection_name: collection.collection_name,
              share_code,
              share_url,
            },
          });
          continue;
        }

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "FlatFund Pro <onboarding@resend.dev>",
            to: [recipient.email],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        const responseData = await response.json();

        if (response.ok) {
          sent++;
          console.log(`✓ Email sent successfully to ${recipient.email}`);

          // Log to communication_logs
          await supabase.from("communication_logs").insert({
            apartment_id,
            flat_number: recipient.flat_number || "Unknown",
            recipient_name: recipient.name,
            recipient_email: recipient.email,
            communication_channel: "EMAIL",
            communication_type: "collection_status_share",
            related_entity_type: "expected_collection",
            related_entity_id: collection_id,
            message_subject: emailSubject,
            message_preview: `Collection status shared for ${collection.collection_name}`,
            full_message_data: {
              html_length: emailHtml.length,
              share_url,
            },
            status: "DELIVERED",
            delivery_status_details: responseData,
            sent_at: new Date().toISOString(),
            triggered_by_event: "share_collection_status",
            template_name: "share_collection_status_v1",
            metadata: {
              collection_id,
              collection_name: collection.collection_name,
              share_code,
              email_id: responseData.id,
            },
          });
        } else {
          failed++;
          console.error(`✗ Email failed for ${recipient.email}:`, responseData);

          await supabase.from("communication_logs").insert({
            apartment_id,
            flat_number: recipient.flat_number || "Unknown",
            recipient_name: recipient.name,
            recipient_email: recipient.email,
            communication_channel: "EMAIL",
            communication_type: "collection_status_share",
            related_entity_type: "expected_collection",
            related_entity_id: collection_id,
            message_subject: emailSubject,
            message_preview: `Collection status share attempt for ${collection.collection_name}`,
            status: "FAILED",
            error_message: JSON.stringify(responseData),
            triggered_by_event: "share_collection_status",
            template_name: "share_collection_status_v1",
            metadata: {
              collection_id,
              collection_name: collection.collection_name,
              share_code,
            },
          });
        }
      } catch (error) {
        failed++;
        console.error(`✗ Exception sending email to ${recipient.email}:`, error);

        await supabase.from("communication_logs").insert({
          apartment_id,
          flat_number: recipient.flat_number || "Unknown",
          recipient_name: recipient.name,
          recipient_email: recipient.email,
          communication_channel: "EMAIL",
          communication_type: "collection_status_share",
          related_entity_type: "expected_collection",
          related_entity_id: collection_id,
          message_subject: emailSubject,
          status: "FAILED",
          error_message: error instanceof Error ? error.message : String(error),
          triggered_by_event: "share_collection_status",
          template_name: "share_collection_status_v1",
          metadata: {
            collection_id,
            collection_name: collection.collection_name,
          },
        });
      }
    }

    // Send WhatsApp messages
    console.log("=== Starting WhatsApp Delivery ===");
    const whatsappMessage = `*Payment Status Update*

Maintenance collection update for *${collection.collection_name}* is now available.

View the current payment status here:
${share_url}

– FlatFund Pro
${apartment.apartment_name}`;

    for (const recipient of whatsappNumbers) {
      try {
        console.log(`Sending WhatsApp to ${recipient.mobile} (Flat ${recipient.flat_number})`);

        if (!gupshupApiKey || !gupshupAppName) {
          console.error("Gupshup configuration missing");
          failed++;

          await supabase.from("communication_logs").insert({
            apartment_id,
            flat_number: recipient.flat_number || "Unknown",
            recipient_name: recipient.name,
            recipient_mobile: recipient.mobile,
            communication_channel: "WHATSAPP",
            communication_type: "collection_status_share",
            related_entity_type: "expected_collection",
            related_entity_id: collection_id,
            message_subject: "Collection Status Update",
            message_preview: whatsappMessage.substring(0, 100),
            status: "FAILED",
            error_message: "Gupshup API key or app name not configured",
            whatsapp_opt_in_status: true,
            triggered_by_event: "share_collection_status",
            template_name: "share_collection_status_whatsapp_v1",
            metadata: {
              collection_id,
              collection_name: collection.collection_name,
              share_code,
            },
          });
          continue;
        }

        const response = await fetch(
          `https://api.gupshup.io/wa/api/v1/msg`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "apikey": gupshupApiKey,
            },
            body: new URLSearchParams({
              channel: "whatsapp",
              source: gupshupAppName,
              destination: recipient.mobile,
              "src.name": "FlatFundPro",
              message: JSON.stringify({
                type: "text",
                text: whatsappMessage,
              }),
            }),
          }
        );

        const result = await response.json();

        if (response.ok && result.status === "submitted") {
          sent++;
          console.log(`✓ WhatsApp sent successfully to ${recipient.mobile}`);

          await supabase.from("communication_logs").insert({
            apartment_id,
            flat_number: recipient.flat_number || "Unknown",
            recipient_name: recipient.name,
            recipient_mobile: recipient.mobile,
            communication_channel: "WHATSAPP",
            communication_type: "collection_status_share",
            related_entity_type: "expected_collection",
            related_entity_id: collection_id,
            message_subject: "Collection Status Update",
            message_preview: whatsappMessage.substring(0, 100),
            full_message_data: {
              message: whatsappMessage,
              message_id: result.messageId,
            },
            status: "DELIVERED",
            delivery_status_details: result,
            sent_at: new Date().toISOString(),
            whatsapp_opt_in_status: true,
            triggered_by_event: "share_collection_status",
            template_name: "share_collection_status_whatsapp_v1",
            metadata: {
              collection_id,
              collection_name: collection.collection_name,
              share_code,
              gupshup_message_id: result.messageId,
            },
          });
        } else {
          failed++;
          console.error(`✗ WhatsApp failed for ${recipient.mobile}:`, result);

          await supabase.from("communication_logs").insert({
            apartment_id,
            flat_number: recipient.flat_number || "Unknown",
            recipient_name: recipient.name,
            recipient_mobile: recipient.mobile,
            communication_channel: "WHATSAPP",
            communication_type: "collection_status_share",
            related_entity_type: "expected_collection",
            related_entity_id: collection_id,
            message_subject: "Collection Status Update",
            message_preview: whatsappMessage.substring(0, 100),
            status: "FAILED",
            error_message: JSON.stringify(result),
            whatsapp_opt_in_status: true,
            triggered_by_event: "share_collection_status",
            template_name: "share_collection_status_whatsapp_v1",
            metadata: {
              collection_id,
              collection_name: collection.collection_name,
              share_code,
            },
          });
        }
      } catch (error) {
        failed++;
        console.error(`✗ Exception sending WhatsApp to ${recipient.mobile}:`, error);

        await supabase.from("communication_logs").insert({
          apartment_id,
          flat_number: recipient.flat_number || "Unknown",
          recipient_name: recipient.name,
          recipient_mobile: recipient.mobile,
          communication_channel: "WHATSAPP",
          communication_type: "collection_status_share",
          related_entity_type: "expected_collection",
          related_entity_id: collection_id,
          message_subject: "Collection Status Update",
          status: "FAILED",
          error_message: error instanceof Error ? error.message : String(error),
          whatsapp_opt_in_status: true,
          triggered_by_event: "share_collection_status",
          template_name: "share_collection_status_whatsapp_v1",
          metadata: {
            collection_id,
            collection_name: collection.collection_name,
          },
        });
      }
    }

    console.log(`=== Delivery Complete: Sent=${sent}, Failed=${failed} ===`);

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        message: `Collection status shared successfully. Sent: ${sent}, Failed: ${failed}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("=== Fatal Error in Share Collection Status ===");
    console.error(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
