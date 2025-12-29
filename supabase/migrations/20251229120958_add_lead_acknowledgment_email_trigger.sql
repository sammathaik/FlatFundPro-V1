/*
  # Add Lead Acknowledgment Email Trigger

  1. New Functions
    - `send_lead_acknowledgment_email()` - Trigger function that calls edge function
      - Automatically sends acknowledgment email when new lead is created
      - Runs asynchronously to not block lead submission
      - Uses Supabase HTTP extension to call edge function

  2. Triggers
    - `trigger_send_lead_acknowledgment_email` - Fires after INSERT on marketing_leads
      - Calls send_lead_acknowledgment_email() function
      - Only for new lead creation
      - Non-blocking execution

  3. Purpose
    - Provide immediate acknowledgment to prospective customers
    - Improve customer experience with instant confirmation
    - Set expectations about follow-up timeline
    - Showcase FlatFund Pro features
    - Professional first impression

  4. Email Content
    - Welcome message and thank you
    - Submission details confirmation
    - What happens next (24-48h follow-up)
    - Demo features preview
    - Contact information
    - Professional branding

  5. Error Handling
    - Non-blocking: Email failure doesn't affect lead creation
    - Errors logged for admin review
    - Graceful degradation
*/

-- Function to send lead acknowledgment email via edge function
CREATE OR REPLACE FUNCTION send_lead_acknowledgment_email()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
  v_function_url text;
  v_request_id bigint;
BEGIN
  -- Get Supabase URL from environment
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- If not set in settings, construct from request
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://' || current_setting('request.headers', true)::json->>'host';
  END IF;

  -- Get service role key (only for server-side use)
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Construct edge function URL
  v_function_url := v_supabase_url || '/functions/v1/send-lead-acknowledgment';

  -- Make async HTTP request to edge function
  -- Using pg_net extension for non-blocking HTTP requests
  BEGIN
    -- Insert into http queue (requires pg_net extension)
    -- This is non-blocking and won't fail if extension not available
    SELECT net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_service_role_key, '')
      ),
      body := jsonb_build_object(
        'email', NEW.email,
        'name', NEW.name,
        'apartment_name', NEW.apartment_name,
        'city', NEW.city,
        'phone', NEW.phone,
        'message', NEW.message,
        'submission_date', NEW.created_at
      )
    ) INTO v_request_id;

    -- Log success
    RAISE LOG 'Lead acknowledgment email queued for: % (request_id: %)', NEW.email, v_request_id;

  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Failed to queue lead acknowledgment email for %: %', NEW.email, SQLERRM;
  END;

  -- Always return NEW to continue with insert
  RETURN NEW;
END;
$$;

-- Create trigger to send email on new lead
DROP TRIGGER IF EXISTS trigger_send_lead_acknowledgment_email ON marketing_leads;
CREATE TRIGGER trigger_send_lead_acknowledgment_email
  AFTER INSERT ON marketing_leads
  FOR EACH ROW
  EXECUTE FUNCTION send_lead_acknowledgment_email();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_lead_acknowledgment_email() TO service_role;

-- Add comment
COMMENT ON FUNCTION send_lead_acknowledgment_email() IS 
'Automatically sends acknowledgment email to new leads via Resend. Non-blocking execution.';

COMMENT ON TRIGGER trigger_send_lead_acknowledgment_email ON marketing_leads IS
'Sends acknowledgment email when new lead is created. Provides instant confirmation and sets expectations.';
