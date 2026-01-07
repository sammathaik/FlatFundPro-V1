/*
  # Fix Duplicate Emails and WhatsApp Communication Logging

  ## Issues Fixed

  ### Issue 1: Duplicate Email Notifications
  - Currently, pg_net may call the edge function multiple times (retries, race conditions)
  - This causes duplicate entries in communication_logs
  - FIX: Add idempotency check before logging to communication_logs

  ### Issue 2: WhatsApp Not Logged in Communication Audit
  - Mobile payment submissions include contact_number field
  - But trigger only uses mobile from flat_email_mappings
  - If mobile doesn't match or whatsapp_opt_in is not set, WhatsApp won't be sent
  - FIX: Prioritize contact_number from payment submission, assume WhatsApp opt-in for mobile payments

  ## Changes

  1. Update send_payment_acknowledgment_email() to:
     - Prioritize contact_number from payment submission over flat_email_mappings
     - For mobile payments (when contact_number is provided), assume WhatsApp opt-in
     - Pass source flag to edge function to indicate mobile vs regular submission

  2. Add function to check for duplicate communication logs before insert

  ## Impact
  - Eliminates duplicate email entries in communication_audit
  - Ensures WhatsApp notifications are sent and logged for mobile payment submissions
  - Better tracking of communication channels
*/

-- Function to check if communication already logged (idempotency)
CREATE OR REPLACE FUNCTION communication_already_logged(
  p_payment_id uuid,
  p_channel communication_channel,
  p_type text,
  p_time_window_minutes integer DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM communication_logs
    WHERE related_payment_id = p_payment_id
      AND communication_channel = p_channel
      AND communication_type = p_type
      AND created_at > NOW() - (p_time_window_minutes || ' minutes')::INTERVAL
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Update log_communication_event to check for duplicates
CREATE OR REPLACE FUNCTION log_communication_event(
  p_apartment_id uuid,
  p_flat_number text,
  p_recipient_name text,
  p_recipient_email text,
  p_recipient_mobile text,
  p_channel communication_channel,
  p_type text,
  p_payment_id uuid,
  p_subject text,
  p_preview text,
  p_full_data jsonb,
  p_status communication_status,
  p_triggered_by_user_id uuid,
  p_triggered_by_event text,
  p_template_name text DEFAULT NULL,
  p_whatsapp_opt_in boolean DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_already_logged boolean;
BEGIN
  -- Check if this communication was already logged (idempotency check)
  IF p_payment_id IS NOT NULL THEN
    SELECT communication_already_logged(p_payment_id, p_channel, p_type) INTO v_already_logged;

    IF v_already_logged THEN
      RAISE NOTICE 'Communication already logged for payment_id: %, channel: %, type: %', p_payment_id, p_channel, p_type;
      -- Return NULL to indicate duplicate (edge function can handle this)
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO communication_logs (
    apartment_id,
    flat_number,
    recipient_name,
    recipient_email,
    recipient_mobile,
    communication_channel,
    communication_type,
    related_payment_id,
    related_entity_type,
    related_entity_id,
    message_subject,
    message_preview,
    full_message_data,
    status,
    triggered_by_user_id,
    triggered_by_event,
    template_name,
    whatsapp_opt_in_status,
    sent_at
  ) VALUES (
    p_apartment_id,
    p_flat_number,
    p_recipient_name,
    p_recipient_email,
    p_recipient_mobile,
    p_channel,
    p_type,
    p_payment_id,
    CASE WHEN p_payment_id IS NOT NULL THEN 'payment' ELSE 'other' END,
    p_payment_id,
    p_subject,
    left(p_preview, 200),
    p_full_data,
    p_status,
    p_triggered_by_user_id,
    p_triggered_by_event,
    p_template_name,
    p_whatsapp_opt_in,
    CASE WHEN p_status IN ('SENT', 'DELIVERED') THEN now() ELSE NULL END
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Update send_payment_acknowledgment_email to prioritize contact_number from payment submission
CREATE OR REPLACE FUNCTION send_payment_acknowledgment_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_mobile TEXT;
  v_name TEXT;
  v_occupant_type TEXT;
  v_whatsapp_optin BOOLEAN;
  v_flat_number TEXT;
  v_apartment_id UUID;
  v_apartment_name TEXT;
  v_payment_type TEXT;
  v_payment_amount NUMERIC;
  v_payment_quarter TEXT;
  v_submission_date TIMESTAMPTZ;
  v_supabase_url TEXT;
  v_supabase_anon_key TEXT;
  v_request_id BIGINT;
  v_is_mobile_submission BOOLEAN := FALSE;
BEGIN
  -- Wrap entire logic in exception handler to never block payment submission
  BEGIN
    -- Get email, mobile, name, whatsapp_opt_in and occupant_type from flat_email_mappings
    SELECT
      email,
      mobile,
      name,
      occupant_type,
      whatsapp_opt_in
    INTO
      v_email,
      v_mobile,
      v_name,
      v_occupant_type,
      v_whatsapp_optin
    FROM flat_email_mappings
    WHERE flat_id = NEW.flat_id
    LIMIT 1;

    -- PRIORITIZE contact_number from payment submission (mobile payment flow)
    IF NEW.contact_number IS NOT NULL AND NEW.contact_number != '' THEN
      v_mobile := NEW.contact_number;
      v_is_mobile_submission := TRUE;
      -- For mobile submissions, assume WhatsApp opt-in (user provided mobile explicitly)
      v_whatsapp_optin := TRUE;
      RAISE NOTICE 'Mobile payment submission detected, using contact_number: %', v_mobile;
    END IF;

    -- If no email found, exit gracefully (but still log this)
    IF v_email IS NULL THEN
      RAISE NOTICE 'No email found for flat_id: %, will try WhatsApp only', NEW.flat_id;
      -- If mobile payment, continue without email
      IF NOT v_is_mobile_submission THEN
        RETURN NEW;
      END IF;
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

    -- Get flat number, apartment details, and apartment_id
    SELECT
      fn.flat_number,
      a.id,
      a.apartment_name
    INTO v_flat_number, v_apartment_id, v_apartment_name
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

    -- If not configured, skip notification (don't fail)
    IF v_supabase_url IS NULL THEN
      RAISE NOTICE 'Supabase URL not configured, skipping acknowledgment for payment_id: %', NEW.id;
      RETURN NEW;
    END IF;

    -- Make async HTTP request to edge function with mobile and WhatsApp opt-in
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/send-payment-acknowledgment',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_supabase_anon_key, '')
      ),
      body := jsonb_build_object(
        'email', v_email,
        'mobile', v_mobile,
        'name', v_name,
        'flat_number', v_flat_number,
        'apartment_id', v_apartment_id,
        'apartment_name', v_apartment_name,
        'payment_id', NEW.id,
        'payment_type', v_payment_type,
        'payment_amount', v_payment_amount,
        'payment_quarter', v_payment_quarter,
        'submission_date', v_submission_date,
        'whatsapp_optin', COALESCE(v_whatsapp_optin, false),
        'is_mobile_submission', v_is_mobile_submission
      )
    ) INTO v_request_id;

    RAISE NOTICE 'Payment acknowledgment queued for payment_id: %, request_id: %, mobile_submission: %', NEW.id, v_request_id, v_is_mobile_submission;

  EXCEPTION WHEN OTHERS THEN
    -- Log error but NEVER fail the payment submission
    RAISE WARNING 'Failed to send acknowledgment for payment_id: %. Error: %', NEW.id, SQLERRM;
  END;

  -- Always return NEW to allow payment submission to succeed
  RETURN NEW;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION communication_already_logged(uuid, communication_channel, text, integer) TO authenticated, service_role;

-- Add helpful comments
COMMENT ON FUNCTION communication_already_logged IS
'Checks if a communication has already been logged for a payment within the specified time window. Used for idempotency to prevent duplicate logs.';

COMMENT ON FUNCTION send_payment_acknowledgment_email() IS
'Sends payment acknowledgment via EMAIL and WhatsApp (if opted in) when new payment is submitted. Prioritizes contact_number from payment submission for mobile payments. Non-blocking - never fails payment submission.';
