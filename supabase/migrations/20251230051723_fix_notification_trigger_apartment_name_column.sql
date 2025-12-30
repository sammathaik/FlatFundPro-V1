/*
  # Fix Notification Trigger - Correct Apartment Column Name

  ## Overview
  The notification trigger was failing because it referenced a.name instead of a.apartment_name
  in the apartments table lookup.

  ## Changes
  - Update trigger function to use correct column name: apartment_name

  ## Fix
  - Change SELECT a.name to SELECT a.apartment_name
*/

-- Fix the notification trigger function with correct column name
CREATE OR REPLACE FUNCTION create_payment_submission_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipient_name text;
  v_recipient_phone text;
  v_society_name text;
  v_amount numeric;
  v_payer_name text;
  v_message_preview text;
  v_flat_number text;
BEGIN
  -- Only process if conditions are met
  IF NEW.status != 'Received' THEN
    RETURN NEW;
  END IF;

  IF NEW.occupant_type NOT IN ('Owner', 'Tenant') THEN
    RETURN NEW;
  END IF;

  -- Get payer name from submission
  v_payer_name := COALESCE(NEW.name, 'Resident');
  
  -- Get amount
  v_amount := COALESCE(NEW.payment_amount, 0);
  
  -- Get society name from apartment (FIXED: use apartment_name not name)
  SELECT a.apartment_name
  INTO v_society_name
  FROM apartments a
  WHERE a.id = NEW.apartment_id;
  
  v_society_name := COALESCE(v_society_name, 'your society');
  
  -- Get flat number from flat_numbers table
  SELECT fn.flat_number
  INTO v_flat_number
  FROM flat_numbers fn
  WHERE fn.id = NEW.flat_id;
  
  -- Get recipient phone - priority: 1) contact_number from submission, 2) mobile from flat_email_mappings
  v_recipient_phone := NEW.contact_number;
  
  IF v_recipient_phone IS NULL OR v_recipient_phone = '' THEN
    -- Try to get from flat_email_mappings
    SELECT mobile, name
    INTO v_recipient_phone, v_recipient_name
    FROM flat_email_mappings
    WHERE flat_id = NEW.flat_id
    AND occupant_type = NEW.occupant_type
    AND mobile IS NOT NULL
    AND mobile != ''
    LIMIT 1;
  END IF;
  
  -- If still no phone found, skip notification creation silently
  IF v_recipient_phone IS NULL OR v_recipient_phone = '' THEN
    RETURN NEW;
  END IF;
  
  -- Use recipient name from flat_email_mappings if available, otherwise from submission
  v_recipient_name := COALESCE(v_recipient_name, v_payer_name);
  
  -- Generate message preview using template
  v_message_preview := format(
    'Hello %s,

We have received your payment submission of ₹%s
for %s.

Our team will review it shortly.

– FlatFund Pro',
    v_recipient_name,
    v_amount::text,
    v_society_name
  );
  
  -- Insert notification record
  -- Wrapped in BEGIN/EXCEPTION to prevent blocking payment submission
  BEGIN
    INSERT INTO notification_outbox (
      payment_submission_id,
      recipient_name,
      recipient_phone,
      channel,
      delivery_mode,
      template_name,
      message_preview,
      trigger_reason,
      status
    ) VALUES (
      NEW.id::text,
      v_recipient_name,
      v_recipient_phone,
      'WHATSAPP',
      'GUPSHUP_SANDBOX',
      'payment_submission_received',
      v_message_preview,
      'Payment Submitted',
      'SIMULATED'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silently continue if notification creation fails
    -- This ensures payment submission is never blocked
    NULL;
  END;
  
  RETURN NEW;
END;
$$;
