/*
  # Fix Fraud Detection Trigger to Use NEW Values

  1. Problem
    - BEFORE UPDATE trigger was passing NEW.id to function
    - Function queried database which still had OLD values
    - Fraud detection ran on old data, not new data

  2. Solution
    - Create version of fraud function that accepts values directly
    - Pass NEW values from trigger instead of querying database
    - This way fraud detection sees the updated values

  3. Changes
    - New function: validate_payment_text_fields_from_values
    - Updated trigger to use new function with NEW values
*/

-- Create version that accepts values directly (not ID)
CREATE OR REPLACE FUNCTION validate_payment_text_fields_from_values(
  p_payment_date date,
  p_transaction_reference text,
  p_sender_upi_id text,
  p_other_text text,
  p_bank_name text,
  p_payer_name text,
  p_narration text,
  p_screenshot_source text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fraud_indicators jsonb := '[]'::jsonb;
  v_fraud_score int := 0;
  v_is_flagged boolean := false;
  v_current_date date := CURRENT_DATE;
  v_max_future_days int := 1;
  v_max_past_years int := 2;
BEGIN
  -- Rule 1: Check for future dates
  IF p_payment_date IS NOT NULL AND p_payment_date > (v_current_date + v_max_future_days) THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'FUTURE_DATE',
      'severity', 'CRITICAL',
      'message', 'Payment date is in the future: ' || p_payment_date::text,
      'points', 40
    );
    v_fraud_score := v_fraud_score + 40;
  END IF;

  -- Rule 2: Check for very old dates
  IF p_payment_date IS NOT NULL AND p_payment_date < (v_current_date - (v_max_past_years * 365)) THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'OLD_DATE',
      'severity', 'MEDIUM',
      'message', 'Payment date is unusually old: ' || p_payment_date::text,
      'points', 10
    );
    v_fraud_score := v_fraud_score + 10;
  END IF;

  -- Rule 3: Check transaction_reference for suspicious keywords
  IF p_transaction_reference IS NOT NULL THEN
    IF p_transaction_reference ~* '(fake|test|dummy|sample|example|xxx|zzz|aaa|000|111|123456)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_TRANSACTION_ID',
        'severity', 'CRITICAL',
        'message', 'Transaction reference contains suspicious keywords: ' || p_transaction_reference,
        'points', 30
      );
      v_fraud_score := v_fraud_score + 30;
    END IF;
  END IF;

  -- Rule 4: Check sender_upi_id for suspicious keywords and format
  IF p_sender_upi_id IS NOT NULL THEN
    IF p_sender_upi_id ~* '(fake|test|dummy|sample|example)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_UPI_ID',
        'severity', 'CRITICAL',
        'message', 'UPI ID contains suspicious keywords: ' || p_sender_upi_id,
        'points', 30
      );
      v_fraud_score := v_fraud_score + 30;
    END IF;

    IF NOT (p_sender_upi_id ~* '^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$') THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'INVALID_UPI_FORMAT',
        'severity', 'HIGH',
        'message', 'UPI ID has invalid format: ' || p_sender_upi_id,
        'points', 15
      );
      v_fraud_score := v_fraud_score + 15;
    END IF;
  END IF;

  -- Rule 5: Check other_text for typos and template text
  IF p_other_text IS NOT NULL THEN
    IF p_other_text ~* '(completeds|successfuls|faileds|pendings)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_TYPO',
        'severity', 'HIGH',
        'message', 'Suspicious typo detected in text: ' || substring(p_other_text, 1, 100),
        'points', 15
      );
      v_fraud_score := v_fraud_score + 15;
    END IF;

    IF p_other_text ~* '(template|mockup|placeholder|lorem ipsum|sample text)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'TEMPLATE_TEXT',
        'severity', 'CRITICAL',
        'message', 'Template or mockup text detected',
        'points', 25
      );
      v_fraud_score := v_fraud_score + 25;
    END IF;
  END IF;

  -- Rule 6: Check narration
  IF p_narration IS NOT NULL AND p_narration ~* '(fake|test|dummy|sample)' THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'SUSPICIOUS_NARRATION',
      'severity', 'MEDIUM',
      'message', 'Narration contains suspicious keywords: ' || p_narration,
      'points', 10
    );
    v_fraud_score := v_fraud_score + 10;
  END IF;

  -- Rule 7: Check bank_name
  IF p_bank_name IS NOT NULL AND p_bank_name ~* '(fake|test|dummy|sample|xyz bank|abc bank)' THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'SUSPICIOUS_BANK_NAME',
      'severity', 'MEDIUM',
      'message', 'Bank name appears suspicious: ' || p_bank_name,
      'points', 10
    );
    v_fraud_score := v_fraud_score + 10;
  END IF;

  -- Rule 8: Check screenshot_source
  IF p_screenshot_source IS NOT NULL AND p_screenshot_source ~* '(photoshop|gimp|canva|figma|sketch|edited)' THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'EDITING_SOFTWARE_DETECTED',
      'severity', 'MEDIUM',
      'message', 'Screenshot may have been created/edited with design software',
      'points', 10
    );
    v_fraud_score := v_fraud_score + 10;
  END IF;

  -- Cap fraud score at 100
  v_fraud_score := LEAST(v_fraud_score, 100);
  v_is_flagged := v_fraud_score >= 70;

  -- Return results
  RETURN jsonb_build_object(
    'success', true,
    'fraud_score', v_fraud_score,
    'is_flagged', v_is_flagged,
    'indicators', v_fraud_indicators,
    'indicator_count', jsonb_array_length(v_fraud_indicators)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Update trigger function to use NEW values directly
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
    -- Run fraud detection with NEW values (not from database)
    v_fraud_result := validate_payment_text_fields_from_values(
      NEW.payment_date,
      NEW.transaction_reference,
      NEW.sender_upi_id,
      NEW.other_text,
      NEW.bank_name,
      NEW.payer_name,
      NEW.narration,
      NEW.screenshot_source
    );

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_payment_text_fields_from_values TO authenticated;
GRANT EXECUTE ON FUNCTION validate_payment_text_fields_from_values TO service_role;

COMMENT ON FUNCTION validate_payment_text_fields_from_values IS 
'Validates payment fields for fraud. Accepts values directly instead of querying database. Used by trigger.';