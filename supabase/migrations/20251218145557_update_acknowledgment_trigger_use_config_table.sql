/*
  # Update Payment Acknowledgment Trigger to Use Config Table
  
  1. Overview
    - Updates the send_payment_acknowledgment_email function
    - Reads Supabase URL and anon key from system_config table
    - Ensures email sending never blocks payment submission
  
  2. Changes
    - Modifies function to query system_config table
    - Maintains non-blocking error handling
*/

-- Recreate function to use system_config table
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
    -- Get Supabase configuration from system_config table
    SELECT value INTO v_supabase_url FROM system_config WHERE key = 'supabase_url';
    SELECT value INTO v_supabase_anon_key FROM system_config WHERE key = 'supabase_anon_key';
    
    -- If not configured, skip email (don't fail)
    IF v_supabase_url IS NULL THEN
      RAISE NOTICE 'Supabase URL not configured, skipping email for payment_id: %', NEW.id;
      RETURN NEW;
    END IF;
    
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

COMMENT ON FUNCTION send_payment_acknowledgment_email() IS 
'Sends payment acknowledgment email when new payment is submitted. Reads config from system_config table. Non-blocking - never fails payment submission.';
