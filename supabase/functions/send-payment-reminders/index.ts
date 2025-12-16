import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SendReminderRequest {
  apartment_id: string;
  expected_collection_id: string;
  reminder_type?: 'due_soon' | 'overdue' | 'final_notice' | 'manual';
}

interface FlatWithoutPayment {
  flat_id: string;
  flat_number: string;
  block_name: string;
  email: string;
  mobile: string | null;
  occupant_type: string;
  collection_name: string;
  payment_type: string;
  amount_due: number;
  due_date: string;
  daily_fine: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

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

    const body: SendReminderRequest = await req.json();

    if (!body.apartment_id || !body.expected_collection_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: apartment_id and expected_collection_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: isAdmin } = await supabaseClient
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .eq('apartment_id', body.apartment_id)
      .eq('status', 'active')
      .maybeSingle();

    const { data: isSuperAdmin } = await supabaseClient
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!isAdmin && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Only admins can send reminders.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: flatsData, error: flatsError } = await supabaseClient.rpc(
      'get_flats_without_payment',
      {
        p_apartment_id: body.apartment_id,
        p_expected_collection_id: body.expected_collection_id,
      }
    );

    if (flatsError) {
      console.error('Error fetching flats:', flatsError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch flats: ${flatsError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const flats: FlatWithoutPayment[] = flatsData || [];

    if (flats.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All flats have submitted payment confirmation. No reminders to send.',
          sent: 0,
          failed: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: apartment } = await supabaseClient
      .from('apartments')
      .select('apartment_name')
      .eq('id', body.apartment_id)
      .single();

    const apartmentName = apartment?.apartment_name || 'Your Apartment';
    const reminderType = body.reminder_type || 'manual';

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY environment variable is not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const flat of flats) {
      try {
        const dueDate = new Date(flat.due_date);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let urgencyClass = '';
        let urgencyMessage = '';
        
        if (daysUntilDue < 0) {
          urgencyClass = 'OVERDUE';
          urgencyMessage = `This payment is ${Math.abs(daysUntilDue)} days overdue. Late fees may apply.`;
        } else if (daysUntilDue <= 3) {
          urgencyClass = 'URGENT';
          urgencyMessage = `Only ${daysUntilDue} days remaining until the due date.`;
        } else if (daysUntilDue <= 7) {
          urgencyClass = 'REMINDER';
          urgencyMessage = `Payment is due in ${daysUntilDue} days.`;
        } else {
          urgencyClass = 'NOTICE';
          urgencyMessage = `Payment is due on ${dueDate.toLocaleDateString()}.`;
        }

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px;">
          <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">FlatFund Pro</h1>
              <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Payment Reminder</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: ${urgencyClass === 'OVERDUE' ? '#dc2626' : urgencyClass === 'URGENT' ? '#f59e0b' : '#3b82f6'}; color: #ffffff;">
              <p style="margin: 0; font-size: 16px; font-weight: 600; text-align: center;">
                ${urgencyClass}: ${urgencyMessage}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Dear <strong>${flat.occupant_type}</strong> of Flat <strong>${flat.flat_number}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                This is a reminder that we have not received your payment confirmation for the following collection:
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Apartment</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${apartmentName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Block</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${flat.block_name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Flat Number</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${flat.flat_number}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 12px 0; border-top: 1px solid #e5e7eb;"></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Collection</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${flat.collection_name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Payment Type</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${flat.payment_type.charAt(0).toUpperCase() + flat.payment_type.slice(1)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Amount Due</td>
                        <td style="padding: 8px 0; font-size: 18px; color: #059669; font-weight: 700; text-align: right;">₹${Number(flat.amount_due).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Due Date</td>
                        <td style="padding: 8px 0; font-size: 14px; color: ${daysUntilDue < 0 ? '#dc2626' : '#111827'}; font-weight: 600; text-align: right;">${new Date(flat.due_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                      </tr>
                      ${flat.daily_fine > 0 ? `
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Daily Late Fee</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #dc2626; font-weight: 600; text-align: right;">₹${Number(flat.daily_fine).toLocaleString()}/day</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Please submit your payment confirmation as soon as possible through the FlatFund Pro platform.
              </p>
              <p style="margin: 20px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                <strong>Note:</strong> If you have already submitted your payment, please disregard this reminder. Your submission may be pending verification.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; text-align: center;">
                This is an automated reminder from FlatFund Pro
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

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FlatFund Pro <noreply@flatfundpro.com>',
            to: [flat.email],
            subject: `[${urgencyClass}] Payment Reminder - ${flat.collection_name} - Flat ${flat.flat_number}`,
            html: emailHtml,
          }),
        });

        const resendData = await resendResponse.json();

        if (resendResponse.ok) {
          await supabaseClient
            .from('email_reminders')
            .insert({
              apartment_id: body.apartment_id,
              expected_collection_id: body.expected_collection_id,
              flat_id: flat.flat_id,
              recipient_email: flat.email,
              reminder_type: reminderType,
              status: 'sent',
              created_by: user.id,
            });
          
          sentCount++;
          results.push({ flat_number: flat.flat_number, email: flat.email, status: 'sent' });
        } else {
          await supabaseClient
            .from('email_reminders')
            .insert({
              apartment_id: body.apartment_id,
              expected_collection_id: body.expected_collection_id,
              flat_id: flat.flat_id,
              recipient_email: flat.email,
              reminder_type: reminderType,
              status: 'failed',
              error_message: JSON.stringify(resendData),
              created_by: user.id,
            });
          
          failedCount++;
          results.push({ flat_number: flat.flat_number, email: flat.email, status: 'failed', error: resendData });
        }
      } catch (emailError) {
        console.error(`Error sending email to ${flat.email}:`, emailError);
        failedCount++;
        results.push({ 
          flat_number: flat.flat_number, 
          email: flat.email, 
          status: 'failed', 
          error: emailError instanceof Error ? emailError.message : 'Unknown error' 
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reminders sent to ${sentCount} flats. ${failedCount} failed.`,
        sent: sentCount,
        failed: failedCount,
        details: results,
      }),
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