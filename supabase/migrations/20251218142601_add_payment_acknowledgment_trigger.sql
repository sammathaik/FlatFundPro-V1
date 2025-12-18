/*
  # Add Payment Acknowledgment Email System
  
  1. Overview
    - Automatically sends acknowledgment email when payment is submitted
    - Uses Supabase Edge Function for email delivery
    - Non-blocking operation (doesn't fail payment if email fails)
  
  2. New Functions
    - `send_payment_acknowledgment_email()` - Trigger function that calls edge function
  
  3. New Triggers
    - `trigger_payment_acknowledgment` - Fires after INSERT on payment_submissions
  
  4. Important Notes
    - Email is sent asynchronously using pg_net extension
    - Payment submission succeeds even if email fails
    - Only sends email for new submissions (not updates)
    - Retrieves all necessary data from related tables
*/

-- Enable pg_net extension if not already enabled (for async HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to send payment acknowledgment email
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
    f.flat_number,
    a.apartment_name
  INTO v_flat_number, v_apartment_name
  FROM flats f
  JOIN blocks b ON f.block_id = b.block_id
  JOIN apartments a ON b.apartment_id = a.apartment_id
  WHERE f.flat_id = NEW.flat_id;
  
  -- Set payment details
  v_payment_type := NEW.payment_type;
  v_payment_amount := NEW.payment_amount;
  v_payment_quarter := NEW.payment_quarter;
  v_submission_date := NEW.submitted_at;
  
  -- Get Supabase configuration from environment
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- If settings not found, use default (will be set by Supabase)
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://' || current_setting('request.headers', true)::json->>'host';
  END IF;
  
  -- Make async HTTP request to edge function
  BEGIN
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
    -- Log error but don't fail the payment submission
    RAISE WARNING 'Failed to send acknowledgment email for payment_id: %. Error: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_payment_acknowledgment ON payment_submissions;

-- Create trigger for new payment submissions
CREATE TRIGGER trigger_payment_acknowledgment
  AFTER INSERT ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION send_payment_acknowledgment_email();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO postgres, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA net TO postgres, authenticated, service_role;

-- Add helpful comment
COMMENT ON FUNCTION send_payment_acknowledgment_email() IS 
'Automatically sends payment acknowledgment email when new payment is submitted. Uses pg_net for async HTTP requests to edge function.';

COMMENT ON TRIGGER trigger_payment_acknowledgment ON payment_submissions IS 
'Sends acknowledgment email to occupant after payment submission. Non-blocking operation.';