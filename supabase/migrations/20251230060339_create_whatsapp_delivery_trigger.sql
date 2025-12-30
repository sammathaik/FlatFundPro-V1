/*
  # Create WhatsApp Delivery Trigger

  1. New Functions
    - `attempt_whatsapp_delivery()` - Trigger function to send WhatsApp messages
    - Uses pg_net extension for non-blocking HTTP calls

  2. New Triggers
    - `trigger_whatsapp_delivery` - Fires after notification_outbox insert

  3. Purpose
    - Automatically attempt WhatsApp delivery via Gupshup Sandbox
    - Non-blocking design - never affects payment submission
    - Updates notification status based on delivery result

  4. Security
    - Uses service role key for edge function calls
    - Handles failures gracefully
    - Logs all attempts
*/

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to attempt WhatsApp delivery
CREATE OR REPLACE FUNCTION attempt_whatsapp_delivery()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  function_url text;
  request_id bigint;
BEGIN
  -- Only attempt delivery for WhatsApp notifications in SIMULATED status
  IF NEW.channel = 'WHATSAPP' AND NEW.status = 'SIMULATED' THEN
    
    -- Get the Supabase URL from environment (will be available in production)
    -- For now, we'll construct it - in production, this should use the actual URL
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-whatsapp-notification';
    
    -- If we can't get the URL, log and skip (don't block the insert)
    IF function_url IS NULL OR function_url = '' THEN
      RAISE NOTICE 'Supabase URL not configured, skipping WhatsApp delivery for notification %', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Make async HTTP request using pg_net
    -- This is non-blocking and won't affect the transaction
    BEGIN
      SELECT INTO request_id
        net.http_post(
          url := function_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true)
          ),
          body := jsonb_build_object(
            'id', NEW.id,
            'recipient_phone', NEW.recipient_phone,
            'message_preview', NEW.message_preview,
            'recipient_name', NEW.recipient_name
          )
        );
      
      -- Update delivery attempts counter
      UPDATE notification_outbox
      SET delivery_attempts = COALESCE(delivery_attempts, 0) + 1
      WHERE id = NEW.id;
      
      RAISE NOTICE 'Initiated WhatsApp delivery for notification % (request_id: %)', NEW.id, request_id;
      
    EXCEPTION WHEN OTHERS THEN
      -- If pg_net call fails, log but don't block the transaction
      RAISE NOTICE 'Failed to initiate WhatsApp delivery for notification %: %', NEW.id, SQLERRM;
      
      -- Mark as failed but don't block
      UPDATE notification_outbox
      SET 
        status = 'SANDBOX_FAILED',
        failure_reason = 'Failed to initiate delivery: ' || SQLERRM
      WHERE id = NEW.id;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically attempt delivery
DROP TRIGGER IF EXISTS trigger_whatsapp_delivery ON notification_outbox;

CREATE TRIGGER trigger_whatsapp_delivery
  AFTER INSERT ON notification_outbox
  FOR EACH ROW
  EXECUTE FUNCTION attempt_whatsapp_delivery();

-- Add comment
COMMENT ON FUNCTION attempt_whatsapp_delivery() IS 'Non-blocking trigger to attempt WhatsApp message delivery via Gupshup Sandbox';
