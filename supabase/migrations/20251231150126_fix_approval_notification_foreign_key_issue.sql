/*
  # Fix Payment Approval Notification - Foreign Key Constraint Issue
  
  1. Problem
    - Edge function fails to log approval notifications to communication_logs
    - Foreign key constraint violation: approved_by (from admins table) doesn't exist in auth.users
    - communication_logs.triggered_by_user_id references auth.users(id)
    - payment_submissions.approved_by references admins(id), not auth.users(id)
  
  2. Root Cause
    - Trigger passes NEW.approved_by as approved_by_user_id to edge function
    - Edge function tries to insert this into communication_logs.triggered_by_user_id
    - But approved_by is an admin ID, not a user ID
    - Foreign key constraint fails
    - Edge function error is not visible (silent failure)
  
  3. Solution
    - Don't pass approved_by to edge function (pass NULL)
    - Communication audit doesn't need to track which admin approved
    - This allows the log to be inserted successfully
  
  4. Impact
    - Approval notifications will now appear in Communication Audit
    - Both EMAIL and WhatsApp notifications will be logged
    - No more foreign key violations
*/

CREATE OR REPLACE FUNCTION send_payment_approval_notification()
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
  v_approved_date TIMESTAMPTZ;
  v_supabase_url TEXT;
  v_supabase_anon_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Only trigger when status changes to 'Approved' (case-insensitive check)
  IF LOWER(COALESCE(OLD.status, '')) != 'approved' AND LOWER(NEW.status) = 'approved' THEN
    BEGIN
      -- Get email, mobile, name, and WhatsApp opt-in from flat_email_mappings
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
      
      -- If no email found, exit gracefully
      IF v_email IS NULL THEN
        RAISE NOTICE 'No email found for flat_id: %, skipping approval notification', NEW.flat_id;
        RETURN NEW;
      END IF;
      
      -- Prioritize name from payment submission, then flat_email_mappings, then occupant_type
      IF NEW.name IS NOT NULL AND NEW.name != '' THEN
        v_name := NEW.name;
      ELSIF v_name IS NULL OR v_name = '' THEN
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
      v_approved_date := COALESCE(NEW.approved_at, NOW());
      
      -- Get Supabase configuration
      SELECT value INTO v_supabase_url FROM system_config WHERE key = 'supabase_url';
      SELECT value INTO v_supabase_anon_key FROM system_config WHERE key = 'supabase_anon_key';
      
      -- If not configured, skip notification (don't fail)
      IF v_supabase_url IS NULL THEN
        RAISE NOTICE 'Supabase URL not configured, skipping approval notification for payment_id: %', NEW.id;
        RETURN NEW;
      END IF;
      
      -- Make async HTTP request to edge function
      -- NOTE: Do NOT pass approved_by as approved_by_user_id to avoid foreign key constraint violation
      -- approved_by is from admins table, but communication_logs.triggered_by_user_id references auth.users
      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/send-payment-approval-notification',
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
          'approved_date', v_approved_date,
          'whatsapp_optin', COALESCE(v_whatsapp_optin, false)
        )
      ) INTO v_request_id;
      
      RAISE NOTICE 'Payment approval notification queued for payment_id: %, request_id: %', NEW.id, v_request_id;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but NEVER fail the payment approval
      RAISE WARNING 'Failed to send approval notification for payment_id: %. Error: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  -- Always return NEW to allow payment approval to succeed
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION send_payment_approval_notification() IS 
'Sends email and WhatsApp notifications when payment is approved. Uses case-insensitive status check. Uses correct column name whatsapp_opt_in. Does NOT pass approved_by_user_id to avoid foreign key constraint violations. Logs all communications to unified audit trail. Non-blocking - never fails payment approval.';
