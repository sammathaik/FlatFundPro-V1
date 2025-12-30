/*
  # Add WhatsApp Notification Preview Trigger for Payment Submissions

  ## Overview
  This migration creates a trigger that automatically generates WhatsApp notification
  preview records in the notification_outbox table when a payment is submitted by
  an owner or tenant.

  ## Purpose
  - Automatically create notification previews for payment acknowledgments
  - Provide admin visibility into what notifications WOULD be sent
  - Support future WhatsApp integration with Gupshup Sandbox
  - Maintain audit trail of notification attempts
  - MUST NOT block or interfere with payment submission flow

  ## Trigger Conditions
  - Fires on INSERT or UPDATE of payment_submissions table
  - Only when status = 'Received' (initial submission state)
  - Only when occupant_type IN ('Owner', 'Tenant')

  ## Notification Details
  - Channel: WhatsApp via Gupshup Sandbox
  - Template: payment_submission_received
  - Status: SIMULATED (not actually sent)
  - Message includes: payer name, amount, society name

  ## Design Decisions
  1. **Non-blocking:** Wrapped in exception handler to prevent trigger failures from blocking payments
  2. **Graceful degradation:** Uses placeholders if data is missing
  3. **Phone priority:** Uses contact_number from submission first, then flat_email_mappings
  4. **Society name:** Joins to apartments to get society name
  5. **AFTER trigger:** Ensures payment record is committed before notification creation

  ## Security
  - Function runs with SECURITY DEFINER to bypass RLS for notification insertion
  - Only creates notifications, doesn't modify payment data
  - Audit trail maintained in notification_outbox

  ## Error Handling
  - All errors are caught and logged
  - Failed notification creation never blocks payment submission
  - Errors logged to audit_logs for visibility
*/

-- Create function to generate payment submission notification preview
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
  v_error_message text;
  v_flat_number text;
BEGIN
  -- Only process if conditions are met
  IF NEW.status != 'Received' THEN
    RETURN NEW;
  END IF;

  IF NEW.occupant_type NOT IN ('Owner', 'Tenant') THEN
    RETURN NEW;
  END IF;

  BEGIN
    -- Get payer name from submission
    v_payer_name := COALESCE(NEW.name, 'Resident');
    
    -- Get amount
    v_amount := COALESCE(NEW.payment_amount, 0);
    
    -- Get society name from apartment
    SELECT a.name
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
    
    -- If still no phone found, skip notification creation
    IF v_recipient_phone IS NULL OR v_recipient_phone = '' THEN
      -- Log to audit_logs that phone was not found
      INSERT INTO audit_logs (
        action,
        table_name,
        record_id,
        details,
        performed_by
      ) VALUES (
        'notification_skipped',
        'payment_submissions',
        NEW.id::text,
        json_build_object(
          'reason', 'No phone number found',
          'flat_id', NEW.flat_id,
          'flat_number', v_flat_number,
          'apartment_id', NEW.apartment_id
        )::jsonb,
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      );
      
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
    
    -- Log successful notification creation
    INSERT INTO audit_logs (
      action,
      table_name,
      record_id,
      details,
      performed_by
    ) VALUES (
      'notification_created',
      'payment_submissions',
      NEW.id::text,
      json_build_object(
        'template', 'payment_submission_received',
        'recipient_phone', v_recipient_phone,
        'recipient_name', v_recipient_name,
        'flat_number', v_flat_number,
        'delivery_mode', 'GUPSHUP_SANDBOX'
      )::jsonb,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Catch all errors to prevent blocking payment submission
    v_error_message := SQLERRM;
    
    -- Log error to audit_logs
    BEGIN
      INSERT INTO audit_logs (
        action,
        table_name,
        record_id,
        details,
        performed_by
      ) VALUES (
        'notification_error',
        'payment_submissions',
        NEW.id::text,
        json_build_object(
          'error', v_error_message,
          'template', 'payment_submission_received'
        )::jsonb,
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      );
    EXCEPTION WHEN OTHERS THEN
      -- If even audit logging fails, silently continue
      -- This ensures payment submission is never blocked
      NULL;
    END;
  END;
  
  RETURN NEW;
END;
$$;

-- Create trigger on payment_submissions table
-- Fires AFTER INSERT or UPDATE
DROP TRIGGER IF EXISTS trigger_payment_submission_notification ON payment_submissions;

CREATE TRIGGER trigger_payment_submission_notification
  AFTER INSERT OR UPDATE OF status, occupant_type
  ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION create_payment_submission_notification();

-- Add comment explaining the trigger
COMMENT ON TRIGGER trigger_payment_submission_notification ON payment_submissions IS 
'Automatically creates WhatsApp notification preview records when payments are submitted by owners or tenants. Non-blocking design ensures payment submission is never affected by notification failures.';

COMMENT ON FUNCTION create_payment_submission_notification() IS 
'Generates WhatsApp notification preview for payment submissions. Handles missing data gracefully and logs errors without blocking payment flow. Uses Gupshup Sandbox delivery mode for preview/testing.';
