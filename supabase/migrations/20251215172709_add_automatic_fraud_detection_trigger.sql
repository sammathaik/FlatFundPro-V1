/*
  # Add Automatic Fraud Detection Trigger

  1. Purpose
    - Automatically run fraud detection when text fields are updated
    - Triggered by external application updating extracted text fields
    - Updates fraud_score, is_fraud_flagged, fraud_indicators automatically

  2. Changes
    - Create trigger function that runs fraud validation
    - Create AFTER UPDATE trigger on payment_submissions
    - Only triggers when relevant text fields change
    - Does not trigger on fraud field updates (prevents infinite loop)

  3. Workflow
    - Form submission creates record with basic fields
    - External app extracts text and updates: transaction_reference, sender_upi_id, other_text, etc.
    - Trigger detects field changes and runs fraud detection
    - Fraud fields get populated automatically
*/

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_fraud_detection_on_text_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fraud_result jsonb;
BEGIN
  -- Only run if text fields were actually updated (not just fraud fields)
  IF (
    NEW.transaction_reference IS DISTINCT FROM OLD.transaction_reference OR
    NEW.sender_upi_id IS DISTINCT FROM OLD.sender_upi_id OR
    NEW.other_text IS DISTINCT FROM OLD.other_text OR
    NEW.bank_name IS DISTINCT FROM OLD.bank_name OR
    NEW.payer_name IS DISTINCT FROM OLD.payer_name OR
    NEW.narration IS DISTINCT FROM OLD.narration OR
    NEW.screenshot_source IS DISTINCT FROM OLD.screenshot_source OR
    NEW.payment_date IS DISTINCT FROM OLD.payment_date
  ) THEN
    -- Run fraud detection
    v_fraud_result := validate_payment_text_fields(NEW.id);

    -- Update fraud fields if validation was successful
    IF (v_fraud_result->>'success')::boolean = true THEN
      NEW.fraud_score := (v_fraud_result->>'fraud_score')::int;
      NEW.is_fraud_flagged := (v_fraud_result->>'is_flagged')::boolean;
      NEW.fraud_indicators := v_fraud_result->'indicators';
      NEW.fraud_checked_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger that fires BEFORE UPDATE
-- Using BEFORE so we can modify NEW before it's saved
DROP TRIGGER IF EXISTS auto_fraud_detection_trigger ON payment_submissions;

CREATE TRIGGER auto_fraud_detection_trigger
  BEFORE UPDATE ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_fraud_detection_on_text_update();

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_fraud_detection_on_text_update() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_fraud_detection_on_text_update() TO service_role;

COMMENT ON FUNCTION trigger_fraud_detection_on_text_update IS 
'Automatically runs fraud detection when text fields are updated by external application';

COMMENT ON TRIGGER auto_fraud_detection_trigger ON payment_submissions IS 
'Triggers fraud detection when extracted text fields are updated';