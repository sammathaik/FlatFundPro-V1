import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaymentAcknowledgmentRequest {
  email: string;
  mobile?: string;
  name: string;
  flat_number: string;
  apartment_name: string;
  apartment_id: string;
  payment_id: string;
  payment_type: string;
  payment_amount: number;
  payment_quarter?: string;
  submission_date: string;
  whatsapp_optin?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: PaymentAcknowledgmentRequest = await req.json();

    const {
      email,
      mobile,
      name,
      flat_number,
      apartment_name,
      apartment_id,
      payment_id,
      payment_type,
      payment_amount,
      payment_quarter,
      submission_date,
      whatsapp_optin
    } = payload;

    const paymentTypeLabel = payment_type === 'maintenance' ? 'Maintenance'
      : payment_type === 'contingency' ? 'Contingency Fund'
      : payment_type === 'emergency' ? 'Emergency'
      : payment_type;

    const formattedAmount = `₹${payment_amount.toLocaleString('en-IN')}`;
    const formattedDate = new Date(submission_date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const quarterInfo = payment_quarter ? ` for ${payment_quarter}` : '';
    const emailSubject = `Payment Received - Under Review | ${paymentTypeLabel} ${formattedAmount}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Received - Under Review</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Payment Received!</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0; font-size: 16px;">Thank you for your submission</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Dear <strong>${name}</strong>,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                We have successfully received your payment submission for <strong>Flat ${flat_number}</strong> at ${apartment_name}. Your payment details have been recorded in our system.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; overflow: hidden; margin: 0 0 25px; border: 2px solid #fbbf24;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="color: #92400e; margin: 0 0 15px; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Payment Details</h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #78350f; font-weight: 600; font-size: 14px;">Payment Type:</td>
                        <td style="color: #92400e; font-size: 14px; text-align: right;">${paymentTypeLabel}${quarterInfo}</td>
                      </tr>
                      <tr>
                        <td style="color: #78350f; font-weight: 600; font-size: 14px;">Amount:</td>
                        <td style="color: #92400e; font-size: 14px; text-align: right; font-weight: 700;">${formattedAmount}</td>
                      </tr>
                      <tr>
                        <td style="color: #78350f; font-weight: 600; font-size: 14px;">Submitted On:</td>
                        <td style="color: #92400e; font-size: 14px; text-align: right;">${formattedDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 6px; margin: 0 0 25px;">
                <h3 style="color: #1e40af; margin: 0 0 10px; font-size: 16px; font-weight: 600;">📋 What Happens Next?</h3>
                <p style="color: #1e3a8a; font-size: 15px; line-height: 1.6; margin: 0;">Your payment is now <strong>under review</strong>. Our admin team will verify and reconcile your submission with our bank statements. Once confirmed, your payment status will be updated to <strong>"Approved"</strong> and you'll receive a confirmation email.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 0 0 10px;">This is an automated acknowledgment from FlatFund Pro<br>${apartment_name}</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} FlatFund Pro. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const messagePreview = `Payment received for Flat ${flat_number} - ${paymentTypeLabel} ${formattedAmount} - Under Review`;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

    let emailStatus: 'DELIVERED' | 'FAILED' = 'DELIVERED';
    let errorMessage: string | null = null;
    let emailId: string | null = null;

    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'FlatFund Pro <onboarding@resend.dev>',
          to: [email],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      const emailResult = await emailResponse.json();

      if (!emailResponse.ok) {
        emailStatus = 'FAILED';
        errorMessage = JSON.stringify(emailResult);
        console.error('Failed to send email:', emailResult);
      } else {
        emailId = emailResult.id;
        console.log('Email sent successfully:', emailId);
      }
    } catch (emailError) {
      emailStatus = 'FAILED';
      errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
      console.error('Error sending email:', emailError);
    }

    try {
      await supabase.rpc('log_communication_event', {
        p_apartment_id: apartment_id,
        p_flat_number: flat_number,
        p_recipient_name: name,
        p_recipient_email: email,
        p_recipient_mobile: null,
        p_channel: 'EMAIL',
        p_type: 'payment_acknowledgment',
        p_payment_id: payment_id,
        p_subject: emailSubject,
        p_preview: messagePreview,
        p_full_data: {
          payment_type: paymentTypeLabel,
          payment_amount: payment_amount,
          payment_quarter: payment_quarter,
          submission_date: submission_date,
          email_id: emailId,
          html_length: emailHtml.length
        },
        p_status: emailStatus,
        p_triggered_by_user_id: null,
        p_triggered_by_event: 'payment_submitted',
        p_template_name: 'payment_acknowledgment_v1'
      });
      console.log('EMAIL communication logged to audit trail');
    } catch (logError) {
      console.error('Failed to log email communication:', logError);
    }

    const results = {
      email_sent: emailStatus === 'DELIVERED',
      whatsapp_sent: false,
      email_error: errorMessage,
      whatsapp_error: null as string | null,
    };

    if (whatsapp_optin && mobile && mobile.trim() !== "") {
      try {
        const whatsappMessage = `Your ${paymentTypeLabel.toLowerCase()} payment for ${apartment_name} has been received and is under review. Thank you!\n\nFlat: ${flat_number}\nType: ${paymentTypeLabel}${quarterInfo}\nAmount: ${formattedAmount}\nSubmitted: ${formattedDate}\n\nYou will receive a confirmation once your payment is approved by the committee.`;

        const { data: notificationData, error: notificationError } = await supabase
          .from("notification_outbox")
          .insert({
            payment_submission_id: payment_id,
            recipient_phone: mobile,
            recipient_name: name,
            channel: "WHATSAPP",
            delivery_mode: "GUPSHUP_SANDBOX",
            template_name: "payment_acknowledgment",
            message_preview: whatsappMessage,
            trigger_reason: "Payment Submitted",
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
                recipient_phone: mobile,
                recipient_name: name,
                message_preview: whatsappMessage,
              }),
            }
          );

          const whatsappResult = await whatsappResponse.json();

          if (whatsappResponse.ok) {
            results.whatsapp_sent = true;

            await supabase.rpc('log_communication_event', {
              p_apartment_id: apartment_id,
              p_flat_number: flat_number,
              p_recipient_name: name,
              p_recipient_email: null,
              p_recipient_mobile: mobile,
              p_channel: 'WHATSAPP',
              p_type: 'payment_acknowledgment',
              p_payment_id: payment_id,
              p_subject: 'Payment Received',
              p_preview: whatsappMessage,
              p_full_data: {
                payment_type: payment_type,
                payment_amount: payment_amount,
                payment_quarter: payment_quarter,
                submission_date: submission_date,
                gupshup_message_id: whatsappResult.messageId || null,
                notification_outbox_id: notificationData.id
              },
              p_status: 'DELIVERED',
              p_triggered_by_user_id: null,
              p_triggered_by_event: 'payment_submitted',
              p_template_name: 'payment_acknowledgment_whatsapp_v1',
              p_whatsapp_optin: true
            });

            console.log(`WhatsApp sent successfully to ${mobile}`);
          } else {
            results.whatsapp_error = JSON.stringify(whatsappResult);

            await supabase.rpc('log_communication_event', {
              p_apartment_id: apartment_id,
              p_flat_number: flat_number,
              p_recipient_name: name,
              p_recipient_email: null,
              p_recipient_mobile: mobile,
              p_channel: 'WHATSAPP',
              p_type: 'payment_acknowledgment',
              p_payment_id: payment_id,
              p_subject: 'Payment Received',
              p_preview: whatsappMessage,
              p_full_data: { error: results.whatsapp_error },
              p_status: 'FAILED',
              p_triggered_by_user_id: null,
              p_triggered_by_event: 'payment_submitted',
              p_template_name: 'payment_acknowledgment_whatsapp_v1',
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

    if (emailStatus === 'FAILED') {
      throw new Error(`Failed to send email: ${errorMessage}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment acknowledgment notifications sent',
        emailId: emailId,
        results,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in send-payment-acknowledgment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});