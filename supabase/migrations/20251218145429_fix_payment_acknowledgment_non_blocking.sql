/*
  # Fix Payment Acknowledgment to be Non-Blocking
  
  1. Overview
    - Recreates the payment acknowledgment trigger with proper error handling
    - Ensures email sending never blocks payment submission
    - Uses environment variables properly
  
  2. Changes
    - Wraps entire function in exception handler
    - Simplifies Supabase URL retrieval
    - Makes trigger truly non-blocking
*/

-- Drop existing function and recreate with better error handling
CREATE OR REPLACE FUNCTION send_payment_acknowledgment_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_name TEXT;
  v_flat_number TEXT;
  v_apartment_name TEXT;
  v_payment_type TEXT;
  v_payment_amount NUMERIC;
  v_payment_quarter TEXT;
  v_submission_date TIMESTAMPTZ;
  v_supabase_url TEXT;
  v_supabase_anon_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Wrap entire logic in exception handler to never block payment submission
  BEGIN
    -- Get email from flat_email_mappings
    SELECT email, name INTO v_email, v_name
    FROM flat_email_mappings
    WHERE flat_id = NEW.flat_id
    LIMIT 1;
    
    -- If no email found, exit gracefully
    IF v_email IS NULL THEN
      RAISE NOTICE 'No email found for flat_id: %', NEW.flat_id;
      RETURN NEW;
    END IF;
    
    -- Get flat number and apartment details
    SELECT 
      fn.flat_number,
      a.apartment_name
    INTO v_flat_number, v_apartment_name
    FROM flat_numbers fn
    JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
    JOIN apartments a ON bbp.apartment_id = a.id
    WHERE fn.id = NEW.flat_id;
    
    -- Set payment details
    v_payment_type := NEW.payment_type;
    v_payment_amount := NEW.payment_amount;
    v_payment_quarter := NEW.payment_quarter;
    v_submission_date := NEW.created_at;
    
    -- Get Supabase URL - use simpler approach
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
    
    -- If not configured, skip email (don't fail)
    IF v_supabase_url IS NULL THEN
      RAISE NOTICE 'Supabase URL not configured, skipping email for payment_id: %', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Make async HTTP request to edge function
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/send-payment-acknowledgment',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_supabase_anon_key, '')
      ),
      body := jsonb_build_object(
        'email', v_email,
        'name', v_name,
        'flat_number', v_flat_number,
        'apartment_name', v_apartment_name,
        'payment_type', v_payment_type,
        'payment_amount', v_payment_amount,
        'payment_quarter', v_payment_quarter,
        'submission_date', v_submission_date
      )
    ) INTO v_request_id;
    
    RAISE NOTICE 'Payment acknowledgment email queued for payment_id: %, request_id: %', NEW.id, v_request_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but NEVER fail the payment submission
    RAISE WARNING 'Failed to send acknowledgment email for payment_id: %. Error: %', NEW.id, SQLERRM;
  END;
  
  -- Always return NEW to allow payment submission to succeed
  RETURN NEW;
END;
$$;

-- Re-enable the trigger
DROP TRIGGER IF EXISTS trigger_payment_acknowledgment ON payment_submissions;

CREATE TRIGGER trigger_payment_acknowledgment
  AFTER INSERT ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION send_payment_acknowledgment_email();

COMMENT ON FUNCTION send_payment_acknowledgment_email() IS 
'Sends payment acknowledgment email when new payment is submitted. Non-blocking - never fails payment submission.';
