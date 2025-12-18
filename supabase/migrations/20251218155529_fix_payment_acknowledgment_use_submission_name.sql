/*
  # Fix Payment Acknowledgment Name Priority
  
  1. Overview
    - Updates the acknowledgment trigger to prioritize name from payment submission
    - Falls back to flat_email_mappings if submission name is null
    - Falls back to occupant_type if both are null
  
  2. Changes
    - Modifies send_payment_acknowledgment_email() to use NEW.name first
    - Adds fallback logic for name resolution
*/

CREATE OR REPLACE FUNCTION send_payment_acknowledgment_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_name TEXT;
  v_occupant_type TEXT;
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
    -- Get email, name, and occupant_type from flat_email_mappings
    SELECT email, name, occupant_type INTO v_email, v_name, v_occupant_type
    FROM flat_email_mappings
    WHERE flat_id = NEW.flat_id
    LIMIT 1;
    
    -- If no email found, exit gracefully
    IF v_email IS NULL THEN
      RAISE NOTICE 'No email found for flat_id: %', NEW.flat_id;
      RETURN NEW;
    END IF;
    
    -- Prioritize name from payment submission, then flat_email_mappings, then occupant_type
    IF NEW.name IS NOT NULL AND NEW.name != '' THEN
      v_name := NEW.name;
    ELSIF v_name IS NULL OR v_name = '' THEN
      -- Fall back to occupant_type if no name available
      IF v_occupant_type IS NOT NULL THEN
        v_name := v_occupant_type;
      ELSE
        v_name := 'Resident';
      END IF;
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
    
    -- Get Supabase configuration from system_config table
    SELECT value INTO v_supabase_url FROM system_config WHERE key = 'supabase_url';
    SELECT value INTO v_supabase_anon_key FROM system_config WHERE key = 'supabase_anon_key';
    
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

COMMENT ON FUNCTION send_payment_acknowledgment_email() IS 
'Sends payment acknowledgment email when new payment is submitted. Uses name from payment submission first, falls back to flat_email_mappings, then occupant_type. Non-blocking - never fails payment submission.';
