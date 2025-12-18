import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaymentAcknowledgmentRequest {
  email: string;
  name: string;
  flat_number: string;
  apartment_name: string;
  payment_type: string;
  payment_amount: number;
  payment_quarter?: string;
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
    const payload: PaymentAcknowledgmentRequest = await req.json();

    const {
      email,
      name,
      flat_number,
      apartment_name,
      payment_type,
      payment_amount,
      payment_quarter,
      submission_date
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

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <div style="background-color: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Payment Received!</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0; font-size: 16px;">Thank you for your submission</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Dear <strong>${name}</strong>,
              </p>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                We have successfully received your payment submission for <strong>Flat ${flat_number}</strong> at ${apartment_name}.
                Your payment details have been recorded in our system.
              </p>

              <!-- Payment Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; overflow: hidden; margin: 0 0 25px; border: 2px solid #fbbf24;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="color: #92400e; margin: 0 0 15px; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Payment Details
                    </h3>
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

              <!-- Status Information -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 6px; margin: 0 0 25px;">
                <h3 style="color: #1e40af; margin: 0 0 10px; font-size: 16px; font-weight: 600;">
                  📋 What Happens Next?
                </h3>
                <p style="color: #1e3a8a; font-size: 15px; line-height: 1.6; margin: 0;">
                  Your payment is now <strong>under review</strong>. Our admin team will verify and reconcile your submission
                  with our bank statements. Once confirmed, your payment status will be updated to <strong>"Approved"</strong>
                  and you'll receive a confirmation email.
                </p>
              </div>

              <!-- Timeline -->
              <div style="margin: 0 0 30px;">
                <h3 style="color: #374151; margin: 0 0 15px; font-size: 16px; font-weight: 600;">Expected Timeline:</h3>
                <ul style="color: #6b7280; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Payment verification typically takes <strong>1-3 business days</strong></li>
                  <li>You will receive an email once your payment is approved</li>
                  <li>No action is required from your end at this time</li>
                </ul>
              </div>

              <!-- Contact Section -->
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong style="color: #374151;">Questions or concerns?</strong><br>
                  If you have any questions about your payment or need assistance, please contact your apartment
                  administrator. You can also check your payment status anytime by logging into your dashboard.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 0 0 10px;">
                This is an automated acknowledgment from FlatFund Pro<br>
                ${apartment_name}
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

PAYMENT RECEIVED - UNDER REVIEW

We have successfully received your payment submission for Flat ${flat_number} at ${apartment_name}.

PAYMENT DETAILS:
- Payment Type: ${paymentTypeLabel}${quarterInfo}
- Amount: ${formattedAmount}
- Submitted On: ${formattedDate}

WHAT HAPPENS NEXT?
Your payment is now under review. Our admin team will verify and reconcile your submission with our bank statements. Once confirmed, your payment status will be updated to "Approved" and you'll receive a confirmation email.

EXPECTED TIMELINE:
- Payment verification typically takes 1-3 business days
- You will receive an email once your payment is approved
- No action is required from your end at this time

If you have any questions about your payment or need assistance, please contact your apartment administrator.

Best regards,
${apartment_name} Management
FlatFund Pro

---
This is an automated acknowledgment. Please do not reply to this email.
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
        from: 'FlatFund Pro <noreply@flatfundpro.com>',
        to: [email],
        subject: `Payment Received - Under Review | ${paymentTypeLabel} ${formattedAmount}`,
        html: emailHtml,
        text: emailText,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Failed to send email:', emailResult);
      throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment acknowledgment email sent successfully',
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