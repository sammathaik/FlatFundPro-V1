import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LeadAcknowledgmentRequest {
  email: string;
  name: string;
  apartment_name: string;
  city: string;
  phone?: string;
  message?: string;
  submission_date: string;
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

    const payload: LeadAcknowledgmentRequest = await req.json();

    const {
      email,
      name,
      apartment_name,
      city,
      phone,
      message,
      submission_date
    } = payload;

    const formattedDate = new Date(submission_date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Your Interest in FlatFund Pro</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center;">
              <div style="background-color: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to FlatFund Pro!</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0; font-size: 16px;">Thank you for your interest</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Dear <strong>${name}</strong>,
              </p>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                Thank you for reaching out to us! We've received your request for a demo of FlatFund Pro for
                <strong>${apartment_name}</strong> in ${city}. We're excited to help you revolutionize your apartment's
                maintenance collection and payment management.
              </p>

              <!-- Submission Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 10px; overflow: hidden; margin: 0 0 25px; border: 2px solid #3b82f6;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="color: #1e3a8a; margin: 0 0 15px; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Your Submission Details
                    </h3>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #1e40af; font-weight: 600; font-size: 14px;">Apartment:</td>
                        <td style="color: #1e3a8a; font-size: 14px; text-align: right;">${apartment_name}</td>
                      </tr>
                      <tr>
                        <td style="color: #1e40af; font-weight: 600; font-size: 14px;">City:</td>
                        <td style="color: #1e3a8a; font-size: 14px; text-align: right;">${city}</td>
                      </tr>
                      ${phone ? `
                      <tr>
                        <td style="color: #1e40af; font-weight: 600; font-size: 14px;">Phone:</td>
                        <td style="color: #1e3a8a; font-size: 14px; text-align: right;">${phone}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="color: #1e40af; font-weight: 600; font-size: 14px;">Submitted:</td>
                        <td style="color: #1e3a8a; font-size: 14px; text-align: right;">${formattedDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${message ? `
              <!-- User Message -->
              <div style="background-color: #f9fafb; border-left: 4px solid #6b7280; padding: 20px; border-radius: 6px; margin: 0 0 25px;">
                <h3 style="color: #374151; margin: 0 0 10px; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                  Your Message
                </h3>
                <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0; font-style: italic;">
                  "${message}"
                </p>
              </div>
              ` : ''}

              <!-- What's Next Section -->
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 6px; margin: 0 0 25px;">
                <h3 style="color: #047857; margin: 0 0 10px; font-size: 16px; font-weight: 600;">
                  🚀 What Happens Next?
                </h3>
                <p style="color: #065f46; font-size: 15px; line-height: 1.6; margin: 0;">
                  Our team will review your request and get in touch with you within <strong>24-48 hours</strong>
                  to schedule a personalized demo. We'll show you how FlatFund Pro can streamline your apartment's
                  payment collection with AI-powered features.
                </p>
              </div>

              <!-- Features Highlight -->
              <div style="margin: 0 0 30px;">
                <h3 style="color: #374151; margin: 0 0 15px; font-size: 16px; font-weight: 600;">What You'll See in the Demo:</h3>
                <ul style="color: #6b7280; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li><strong>QR Code Payments:</strong> One-click payment submission for residents</li>
                  <li><strong>AI-Powered OCR:</strong> Automatic extraction of payment details from screenshots</li>
                  <li><strong>Fraud Detection:</strong> Advanced algorithms to flag suspicious payments</li>
                  <li><strong>Real-time Notifications:</strong> Instant alerts for new submissions and issues</li>
                  <li><strong>Analytics Dashboard:</strong> Track collection rates and payment patterns</li>
                  <li><strong>Multi-flat Support:</strong> Perfect for property owners with multiple units</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 25px;">
                <tr>
                  <td align="center">
                    <a href="https://flatfundpro.com" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                      Explore FlatFund Pro
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Contact Section -->
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border: 1px solid #fbbf24;">
                <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong style="color: #78350f;">📞 Need immediate assistance?</strong><br>
                  If you have any urgent questions or would like to speak with our team sooner,
                  feel free to reply to this email or call us. We're here to help!
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 10px;">
                FlatFund Pro
              </p>
              <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 0 0 10px;">
                Smart Apartment Payment Management<br>
                Powered by AI | Trusted by Communities
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
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

    const emailText = `
Dear ${name},

WELCOME TO FLATFUND PRO!

Thank you for reaching out to us! We've received your request for a demo of FlatFund Pro for ${apartment_name} in ${city}.

YOUR SUBMISSION DETAILS:
- Apartment: ${apartment_name}
- City: ${city}
${phone ? `- Phone: ${phone}\n` : ''}- Submitted: ${formattedDate}

${message ? `YOUR MESSAGE:\n"${message}"\n\n` : ''}WHAT HAPPENS NEXT?
Our team will review your request and get in touch with you within 24-48 hours to schedule a personalized demo. We'll show you how FlatFund Pro can streamline your apartment's payment collection with AI-powered features.

WHAT YOU'LL SEE IN THE DEMO:
- QR Code Payments: One-click payment submission for residents
- AI-Powered OCR: Automatic extraction of payment details from screenshots
- Fraud Detection: Advanced algorithms to flag suspicious payments
- Real-time Notifications: Instant alerts for new submissions and issues
- Analytics Dashboard: Track collection rates and payment patterns
- Multi-flat Support: Perfect for property owners with multiple units

Need immediate assistance? If you have any urgent questions or would like to speak with our team sooner, feel free to reply to this email. We're here to help!

Best regards,
FlatFund Pro Team

---
FlatFund Pro - Smart Apartment Payment Management
Powered by AI | Trusted by Communities
© ${new Date().getFullYear()} FlatFund Pro. All rights reserved.
    `;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'FlatFund Pro <onboarding@resend.dev>',
        to: [email],
        subject: `Thank You for Your Interest in FlatFund Pro | ${apartment_name}`,
        html: emailHtml,
        text: emailText,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Failed to send email:', emailResult);

      // Log failed email to communication audit trail
      await supabase.rpc('log_communication_event', {
        p_apartment_id: null,
        p_flat_number: null,
        p_recipient_name: name,
        p_recipient_email: email,
        p_recipient_mobile: phone || null,
        p_channel: 'EMAIL',
        p_type: 'lead_acknowledgment',
        p_payment_id: null,
        p_subject: `Thank You for Your Interest in FlatFund Pro | ${apartment_name}`,
        p_preview: `Thank you for reaching out! We'll contact you within 24-48 hours.`,
        p_full_data: {
          error: JSON.stringify(emailResult),
          apartment_name: apartment_name,
          city: city,
          message: message
        },
        p_status: 'FAILED',
        p_triggered_by_user_id: null,
        p_triggered_by_event: 'lead_submission',
        p_template_name: 'lead_acknowledgment_v1'
      });

      throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
    }

    console.log('Lead acknowledgment email sent successfully:', emailResult.id);

    // Log successful email to unified communication audit trail
    await supabase.rpc('log_communication_event', {
      p_apartment_id: null,
      p_flat_number: null,
      p_recipient_name: name,
      p_recipient_email: email,
      p_recipient_mobile: phone || null,
      p_channel: 'EMAIL',
      p_type: 'lead_acknowledgment',
      p_payment_id: null,
      p_subject: `Thank You for Your Interest in FlatFund Pro | ${apartment_name}`,
      p_preview: `Thank you for reaching out! We'll contact you within 24-48 hours.`,
      p_full_data: {
        apartment_name: apartment_name,
        city: city,
        phone: phone,
        message: message,
        submission_date: submission_date,
        email_id: emailResult.id,
        html_length: emailHtml.length
      },
      p_status: 'DELIVERED',
      p_triggered_by_user_id: null,
      p_triggered_by_event: 'lead_submission',
      p_template_name: 'lead_acknowledgment_v1'
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lead acknowledgment email sent successfully',
        emailId: emailResult.id,
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
    console.error('Error in send-lead-acknowledgment:', error);
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
