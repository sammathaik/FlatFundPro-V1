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

  try {
    const payload: ShareCollectionRequest = await req.json();
    const { collection_id, apartment_id, share_code, share_url } = payload;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get collection details
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

    if (collectionError) throw collectionError;

    // Get apartment details
    const { data: apartment, error: apartmentError } = await supabase
      .from("apartments")
      .select("apartment_name")
      .eq("id", apartment_id)
      .single();

    if (apartmentError) throw apartmentError;

    // Get all registered residents (email + WhatsApp opt-in)
    const { data: residents, error: residentsError } = await supabase
      .from("flat_email_mappings")
      .select(`
        email,
        mobile,
        name,
        flat_id,
        flats!inner (
          flat_number,
          building_id,
          buildings!inner (
            building_name
          )
        ),
        whatsapp_optin
      `)
      .eq("flats.apartment_id", apartment_id);

    if (residentsError) throw residentsError;

    const emailAddresses = residents
      .filter((r) => r.email)
      .map((r) => r.email);

    const whatsappNumbers = residents
      .filter((r) => r.mobile && r.whatsapp_optin)
      .map((r) => r.mobile);

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
    for (const email of emailAddresses) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          },
          body: JSON.stringify({
            from: "FlatFund Pro <noreply@flatfundpro.com>",
            to: [email],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        if (response.ok) {
          sent++;
          // Log to communication audit
          await supabase.from("communication_audit").insert({
            apartment_id,
            channel: "email",
            recipient: email,
            communication_type: "collection_status_share",
            metadata: {
              collection_id,
              collection_name: collection.collection_name,
              share_code,
              share_url,
            },
            status: "sent",
          });
        } else {
          failed++;
          await supabase.from("communication_audit").insert({
            apartment_id,
            channel: "email",
            recipient: email,
            communication_type: "collection_status_share",
            metadata: {
              collection_id,
              collection_name: collection.collection_name,
              share_code,
              error: await response.text(),
            },
            status: "failed",
          });
        }
      } catch (error) {
        failed++;
        console.error(`Failed to send email to ${email}:`, error);
      }
    }

    // Send WhatsApp messages
    const whatsappMessage = `*Payment Status Update*

Maintenance collection update for *${collection.collection_name}* is now available.

View the current payment status here:
${share_url}

– FlatFund Pro
${apartment.apartment_name}`;

    for (const mobile of whatsappNumbers) {
      try {
        const response = await fetch(
          `https://api.gupshup.io/wa/api/v1/msg`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "apikey": Deno.env.get("GUPSHUP_API_KEY") || "",
            },
            body: new URLSearchParams({
              channel: "whatsapp",
              source: Deno.env.get("GUPSHUP_APP_NAME") || "",
              destination: mobile,
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
          await supabase.from("communication_audit").insert({
            apartment_id,
            channel: "whatsapp",
            recipient: mobile,
            communication_type: "collection_status_share",
            metadata: {
              collection_id,
              collection_name: collection.collection_name,
              share_code,
              share_url,
              message_id: result.messageId,
            },
            status: "sent",
          });
        } else {
          failed++;
          await supabase.from("communication_audit").insert({
            apartment_id,
            channel: "whatsapp",
            recipient: mobile,
            communication_type: "collection_status_share",
            metadata: {
              collection_id,
              collection_name: collection.collection_name,
              share_code,
              error: JSON.stringify(result),
            },
            status: "failed",
          });
        }
      } catch (error) {
        failed++;
        console.error(`Failed to send WhatsApp to ${mobile}:`, error);
      }
    }

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
    console.error("Error sharing collection status:", error);
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
