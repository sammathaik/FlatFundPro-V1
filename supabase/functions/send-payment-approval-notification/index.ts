import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ApprovalNotificationRequest {
  payment_id: string;
  apartment_id: string;
  email: string;
  name: string;
  mobile?: string;
  flat_number: string;
  apartment_name: string;
  payment_type: string;
  payment_amount: number;
  payment_quarter?: string;
  approved_date: string;
  whatsapp_optin?: boolean;
  approved_by_user_id?: string;
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body: ApprovalNotificationRequest = await req.json();

    const {
      payment_id,
      apartment_id,
      email: recipient_email,
      name: recipient_name,
      mobile: recipient_mobile,
      flat_number,
      apartment_name,
      payment_type,
      payment_amount,
      payment_quarter,
      approved_date,
      whatsapp_optin: whatsapp_opt_in,
      approved_by_user_id,
    } = body;

    const results = {
      email_sent: false,
      whatsapp_sent: false,
      email_error: null as string | null,
      whatsapp_error: null as string | null,
    };

    const paymentTypeLabel = payment_type === 'maintenance' ? 'Maintenance'
      : payment_type === 'contingency' ? 'Contingency Fund'
      : payment_type === 'emergency' ? 'Emergency'
      : payment_type;

    const quarterInfo = payment_quarter ? ` (${payment_quarter})` : '';
    const emailSubject = `Payment Approved - ${paymentTypeLabel}${quarterInfo} | Flat ${flat_number}`;
    const messagePreview = `Your ${paymentTypeLabel.toLowerCase()} payment for Flat ${flat_number} has been approved - ₹${Number(payment_amount).toLocaleString()}`;

    // 1. SEND EMAIL NOTIFICATION (MANDATORY)
    if (resendApiKey && recipient_email) {
      try {
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px;">
          <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Payment Approved</h1>
              <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">FlatFund Pro</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Dear <strong>${recipient_name}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Your maintenance payment has been approved after committee verification.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Apartment</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${apartment_name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Flat Number</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${flat_number}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 12px 0; border-top: 1px solid #e5e7eb;"></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Payment Type</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${paymentTypeLabel}${quarterInfo}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Approved Amount</td>
                        <td style="padding: 8px 0; font-size: 18px; color: #059669; font-weight: 700; text-align: right;">₹${Number(payment_amount).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Payment Date</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${new Date(approved_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #065f46; line-height: 1.6;">
                  <strong>Committee Verified:</strong> This payment has been verified and approved by your management committee.
                </p>
              </div>
              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Thank you for your timely payment. If you have any questions, please contact your management committee.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; text-align: center;">
                This is an automated notification from FlatFund Pro
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                © ${new Date().getFullYear()} FlatFund Pro. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "FlatFund Pro <onboarding@resend.dev>",
            to: [recipient_email],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        const resendResult = await resendResponse.json();

        if (resendResponse.ok) {
          results.email_sent = true;

          await supabase
            .from("payment_submissions")
            .update({ approval_email_sent_at: new Date().toISOString() })
            .eq("id", payment_id);

          // Log to communication audit trail
          await supabase.rpc('log_communication_event', {
            p_apartment_id: apartment_id,
            p_flat_number: flat_number,
            p_recipient_name: recipient_name,
            p_recipient_email: recipient_email,
            p_recipient_mobile: null,
            p_channel: 'EMAIL',
            p_type: 'payment_approval',
            p_payment_id: payment_id,
            p_subject: emailSubject,
            p_preview: messagePreview,
            p_full_data: {
              payment_type: payment_type,
              payment_amount: payment_amount,
              payment_quarter: payment_quarter,
              approved_date: approved_date,
              email_id: resendResult.id,
              html_length: emailHtml.length
            },
            p_status: 'DELIVERED',
            p_triggered_by_user_id: approved_by_user_id || null,
            p_triggered_by_event: 'payment_approved',
            p_template_name: 'payment_approval_v1'
          });

          console.log(`Email sent successfully to ${recipient_email}`);
        } else {
          results.email_error = JSON.stringify(resendResult);
          
          // Log failed email
          await supabase.rpc('log_communication_event', {
            p_apartment_id: apartment_id,
            p_flat_number: flat_number,
            p_recipient_name: recipient_name,
            p_recipient_email: recipient_email,
            p_recipient_mobile: null,
            p_channel: 'EMAIL',
            p_type: 'payment_approval',
            p_payment_id: payment_id,
            p_subject: emailSubject,
            p_preview: messagePreview,
            p_full_data: { error: results.email_error },
            p_status: 'FAILED',
            p_triggered_by_user_id: approved_by_user_id || null,
            p_triggered_by_event: 'payment_approved',
            p_template_name: 'payment_approval_v1'
          });
          
          console.error("Email send failed:", resendResult);
        }
      } catch (emailError) {
        results.email_error = emailError instanceof Error ? emailError.message : "Unknown error";
        console.error("Email send error:", emailError);
      }
    } else {
      results.email_error = "Missing Resend API key or recipient email";
    }

    // 2. SEND WHATSAPP NOTIFICATION (CONDITIONAL)
    if (whatsapp_opt_in && recipient_mobile && recipient_mobile.trim() !== "") {
      try {
        const whatsappMessage = `Your ${paymentTypeLabel.toLowerCase()} payment for ${apartment_name} has been approved after committee verification. Thank you!\n\nFlat: ${flat_number}\nType: ${paymentTypeLabel}${quarterInfo}\nAmount: ₹${Number(payment_amount).toLocaleString()}\nDate: ${new Date(approved_date).toLocaleDateString('en-IN')}`;

        const { data: notificationData, error: notificationError } = await supabase
          .from("notification_outbox")
          .insert({
            apartment_id: apartment_id,
            flat_number: flat_number,
            recipient_mobile: recipient_mobile,
            recipient_name: recipient_name,
            message_type: "payment_approval",
            message_preview: whatsappMessage,
            full_message_data: {
              payment_id: payment_id,
              flat_number: flat_number,
              payment_type: payment_type,
              payment_amount: payment_amount,
              payment_quarter: payment_quarter,
              approved_date: approved_date,
            },
            status: "PENDING",
          })
          .select("id")
          .single();

        if (notificationError) {
          results.whatsapp_error = notificationError.message;
          console.error("WhatsApp queue error:", notificationError);
        } else {
          const whatsappResponse = await fetch(
            `${supabaseUrl}/functions/v1/send-whatsapp-notification`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseServiceRoleKey}`,
              },
              body: JSON.stringify({
                id: notificationData.id,
                recipient_phone: recipient_mobile,
                recipient_name: recipient_name,
                message_preview: whatsappMessage,
              }),
            }
          );

          const whatsappResult = await whatsappResponse.json();

          if (whatsappResponse.ok) {
            results.whatsapp_sent = true;

            await supabase
              .from("payment_submissions")
              .update({ approval_whatsapp_sent_at: new Date().toISOString() })
              .eq("id", payment_id);

            // Log WhatsApp to communication audit trail
            await supabase.rpc('log_communication_event', {
              p_apartment_id: apartment_id,
              p_flat_number: flat_number,
              p_recipient_name: recipient_name,
              p_recipient_email: null,
              p_recipient_mobile: recipient_mobile,
              p_channel: 'WHATSAPP',
              p_type: 'payment_approval',
              p_payment_id: payment_id,
              p_subject: 'Payment Approved',
              p_preview: whatsappMessage,
              p_full_data: {
                payment_type: payment_type,
                payment_amount: payment_amount,
                payment_quarter: payment_quarter,
                approved_date: approved_date,
                gupshup_message_id: whatsappResult.messageId || null,
                notification_outbox_id: notificationData.id
              },
              p_status: 'DELIVERED',
              p_triggered_by_user_id: approved_by_user_id || null,
              p_triggered_by_event: 'payment_approved',
              p_template_name: 'payment_approval_whatsapp_v1',
              p_whatsapp_optin: true
            });

            console.log(`WhatsApp sent successfully to ${recipient_mobile}`);
          } else {
            results.whatsapp_error = JSON.stringify(whatsappResult);

            // Log failed WhatsApp
            await supabase.rpc('log_communication_event', {
              p_apartment_id: apartment_id,
              p_flat_number: flat_number,
              p_recipient_name: recipient_name,
              p_recipient_email: null,
              p_recipient_mobile: recipient_mobile,
              p_channel: 'WHATSAPP',
              p_type: 'payment_approval',
              p_payment_id: payment_id,
              p_subject: 'Payment Approved',
              p_preview: whatsappMessage,
              p_full_data: { error: results.whatsapp_error },
              p_status: 'FAILED',
              p_triggered_by_user_id: approved_by_user_id || null,
              p_triggered_by_event: 'payment_approved',
              p_template_name: 'payment_approval_whatsapp_v1',
              p_whatsapp_optin: true
            });

            console.error("WhatsApp send failed:", whatsappResult);
          }
        }
      } catch (whatsappError) {
        results.whatsapp_error = whatsappError instanceof Error ? whatsappError.message : "Unknown error";
        console.error("WhatsApp send error:", whatsappError);
      }
    } else {
      results.whatsapp_error = "WhatsApp opted out or mobile not provided";
    }

    await supabase
      .from("payment_submissions")
      .update({ approval_notification_sent: results.email_sent })
      .eq("id", payment_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Approval notifications processed",
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in send-payment-approval-notification:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
