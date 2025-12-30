import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log("Checking for payment reminders to queue...");

    const { data, error } = await supabase.rpc("check_and_queue_payment_reminders");

    if (error) {
      console.error("Error checking payment reminders:", error);
      throw new Error(`Failed to check reminders: ${error.message}`);
    }

    const remindersQueued = data?.[0]?.reminders_queued || 0;
    const reminderDetails = data?.[0]?.reminder_details || [];

    console.log(`Successfully queued ${remindersQueued} payment reminders`);

    if (remindersQueued > 0) {
      console.log("Reminder details:", JSON.stringify(reminderDetails, null, 2));

      const { data: pendingNotifications, error: notifError } = await supabase
        .from("notification_outbox")
        .select("id, recipient_phone, recipient_name, message_preview")
        .eq("status", "PENDING")
        .eq("message_type", "payment_reminder")
        .order("created_at", { ascending: false })
        .limit(10);

      if (notifError) {
        console.error("Error fetching pending notifications:", notifError);
      } else {
        console.log(`Found ${pendingNotifications?.length || 0} pending notifications in outbox`);
        
        for (const notification of pendingNotifications || []) {
          console.log(`Calling send-whatsapp-notification for ${notification.recipient_name}...`);
          
          try {
            const whatsappResponse = await fetch(
              `${supabaseUrl}/functions/v1/send-whatsapp-notification`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceRoleKey}`,
                },
                body: JSON.stringify({
                  id: notification.id,
                  recipient_phone: notification.recipient_phone,
                  recipient_name: notification.recipient_name,
                  message_preview: notification.message_preview,
                }),
              }
            );

            const whatsappResult = await whatsappResponse.json();
            console.log(`WhatsApp send result for ${notification.recipient_name}:`, whatsappResult);
          } catch (sendError) {
            console.error(`Failed to send WhatsApp to ${notification.recipient_name}:`, sendError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked and queued ${remindersQueued} payment reminders`,
        reminders_queued: remindersQueued,
        reminder_details: reminderDetails,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in check-payment-reminders:", error);

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
