/*
  # Enhanced Fraud Detection with Comments Analysis
  
  1. Purpose
    - Add explicit analysis of the `comments` field (previously not checked)
    - Add manual fraud recheck capability for admins
    - Add bulk fraud check for multiple payments
    - Improve cross-field validation
  
  2. Changes
    - Drop and recreate `validate_payment_text_fields_from_values` with comments parameter
    - Create `manual_fraud_recheck` function for single payment
    - Create `bulk_fraud_check` function for multiple payments
    - Update trigger to include comments in automatic checks
  
  3. New Fraud Rules for Comments Field
    - Suspicious keywords detection
    - Template text detection
    - Typo detection
    - OCR confidence validation
*/

-- Drop existing function with old signature
DROP FUNCTION IF EXISTS validate_payment_text_fields_from_values(date, text, text, text, text, text, text, text);

-- Enhanced fraud validation function with comments analysis
CREATE OR REPLACE FUNCTION validate_payment_text_fields_from_values(
  p_payment_date date,
  p_transaction_reference text,
  p_sender_upi_id text,
  p_other_text text,
  p_bank_name text,
  p_payer_name text,
  p_narration text,
  p_screenshot_source text,
  p_comments text DEFAULT NULL,
  p_ocr_confidence_score integer DEFAULT NULL
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
  -- Rule 1: Check for future dates (CRITICAL - 40 points)
  IF p_payment_date IS NOT NULL AND p_payment_date > (v_current_date + v_max_future_days) THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'FUTURE_DATE',
      'severity', 'CRITICAL',
      'message', 'Payment date is in the future: ' || p_payment_date::text,
      'points', 40
    );
    v_fraud_score := v_fraud_score + 40;
  END IF;

  -- Rule 2: Check for very old dates (10 points)
  IF p_payment_date IS NOT NULL AND p_payment_date < (v_current_date - (v_max_past_years * 365)) THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'OLD_DATE',
      'severity', 'MEDIUM',
      'message', 'Payment date is unusually old: ' || p_payment_date::text,
      'points', 10
    );
    v_fraud_score := v_fraud_score + 10;
  END IF;

  -- Rule 3: Check transaction_reference for suspicious keywords (30 points)
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
        'type', 'SUSPICIOUS_TYPO_OTHER',
        'severity', 'HIGH',
        'message', 'Suspicious typo detected in other_text: ' || substring(p_other_text, 1, 100),
        'points', 15
      );
      v_fraud_score := v_fraud_score + 15;
    END IF;

    IF p_other_text ~* '(template|mockup|placeholder|lorem ipsum|sample text)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'TEMPLATE_TEXT_OTHER',
        'severity', 'CRITICAL',
        'message', 'Template or mockup text detected in other_text',
        'points', 25
      );
      v_fraud_score := v_fraud_score + 25;
    END IF;
  END IF;

  -- Rule 6: NEW - Check comments field for suspicious content
  IF p_comments IS NOT NULL THEN
    -- Check for suspicious keywords
    IF p_comments ~* '(fake|test|dummy|sample|example)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_KEYWORDS_COMMENTS',
        'severity', 'CRITICAL',
        'message', 'Comments contain suspicious keywords: ' || substring(p_comments, 1, 100),
        'points', 30
      );
      v_fraud_score := v_fraud_score + 30;
    END IF;

    -- Check for typos
    IF p_comments ~* '(completeds|successfuls|faileds|pendings)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_TYPO_COMMENTS',
        'severity', 'HIGH',
        'message', 'Suspicious typo detected in comments: ' || substring(p_comments, 1, 100),
        'points', 15
      );
      v_fraud_score := v_fraud_score + 15;
    END IF;

    -- Check for template text
    IF p_comments ~* '(template|mockup|placeholder|lorem ipsum|sample text)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'TEMPLATE_TEXT_COMMENTS',
        'severity', 'CRITICAL',
        'message', 'Template or mockup text detected in comments',
        'points', 25
      );
      v_fraud_score := v_fraud_score + 25;
    END IF;
  END IF;

  -- Rule 7: Check narration
  IF p_narration IS NOT NULL AND p_narration ~* '(fake|test|dummy|sample)' THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'SUSPICIOUS_NARRATION',
      'severity', 'MEDIUM',
      'message', 'Narration contains suspicious keywords: ' || p_narration,
      'points', 10
    );
    v_fraud_score := v_fraud_score + 10;
  END IF;

  -- Rule 8: Check bank_name
  IF p_bank_name IS NOT NULL AND p_bank_name ~* '(fake|test|dummy|sample|xyz bank|abc bank)' THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'SUSPICIOUS_BANK_NAME',
      'severity', 'MEDIUM',
      'message', 'Bank name appears suspicious: ' || p_bank_name,
      'points', 10
    );
    v_fraud_score := v_fraud_score + 10;
  END IF;

  -- Rule 9: Check screenshot_source
  IF p_screenshot_source IS NOT NULL AND p_screenshot_source ~* '(photoshop|gimp|canva|figma|sketch|edited)' THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'EDITING_SOFTWARE_DETECTED',
      'severity', 'MEDIUM',
      'message', 'Screenshot may have been created/edited with design software',
      'points', 10
    );
    v_fraud_score := v_fraud_score + 10;
  END IF;

  -- Rule 10: NEW - Check OCR confidence score
  IF p_ocr_confidence_score IS NOT NULL AND p_ocr_confidence_score < 40 THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'LOW_OCR_CONFIDENCE',
      'severity', 'MEDIUM',
      'message', 'OCR confidence score is very low: ' || p_ocr_confidence_score::text || '%',
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

-- Update trigger function to pass comments field
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
    NEW.comments IS DISTINCT FROM OLD.comments OR
    NEW.bank_name IS DISTINCT FROM OLD.bank_name OR
    NEW.payer_name IS DISTINCT FROM OLD.payer_name OR
    NEW.narration IS DISTINCT FROM OLD.narration OR
    NEW.screenshot_source IS DISTINCT FROM OLD.screenshot_source OR
    NEW.payment_date IS DISTINCT FROM OLD.payment_date OR
    NEW.ocr_confidence_score IS DISTINCT FROM OLD.ocr_confidence_score
  ) THEN
    -- Run fraud detection with NEW values including comments
    v_fraud_result := validate_payment_text_fields_from_values(
      NEW.payment_date,
      NEW.transaction_reference,
      NEW.sender_upi_id,
      NEW.other_text,
      NEW.bank_name,
      NEW.payer_name,
      NEW.narration,
      NEW.screenshot_source,
      NEW.comments,
      NEW.ocr_confidence_score
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

-- Function for manual fraud recheck (single payment)
CREATE OR REPLACE FUNCTION manual_fraud_recheck(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment record;
  v_fraud_result jsonb;
BEGIN
  -- Check if user is admin or super_admin
  IF NOT (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can recheck fraud'
    );
  END IF;

  -- Fetch payment details
  SELECT * INTO v_payment
  FROM payment_submissions
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment not found'
    );
  END IF;

  -- Run fraud detection
  v_fraud_result := validate_payment_text_fields_from_values(
    v_payment.payment_date,
    v_payment.transaction_reference,
    v_payment.sender_upi_id,
    v_payment.other_text,
    v_payment.bank_name,
    v_payment.payer_name,
    v_payment.narration,
    v_payment.screenshot_source,
    v_payment.comments,
    v_payment.ocr_confidence_score
  );

  -- Update the payment record
  IF (v_fraud_result->>'success')::boolean = true THEN
    UPDATE payment_submissions
    SET 
      fraud_score = (v_fraud_result->>'fraud_score')::int,
      is_fraud_flagged = (v_fraud_result->>'is_flagged')::boolean,
      fraud_indicators = v_fraud_result->'indicators',
      fraud_checked_at = now()
    WHERE id = p_payment_id;
  END IF;

  RETURN v_fraud_result;
END;
$$;

-- Function for bulk fraud check (multiple payments)
CREATE OR REPLACE FUNCTION bulk_fraud_check(p_payment_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment record;
  v_fraud_result jsonb;
  v_processed_count int := 0;
  v_flagged_count int := 0;
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- Check if user is admin or super_admin
  IF NOT (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can perform bulk fraud checks'
    );
  END IF;

  -- Process each payment
  FOR v_payment IN 
    SELECT * FROM payment_submissions
    WHERE id = ANY(p_payment_ids)
  LOOP
    -- Run fraud detection
    v_fraud_result := validate_payment_text_fields_from_values(
      v_payment.payment_date,
      v_payment.transaction_reference,
      v_payment.sender_upi_id,
      v_payment.other_text,
      v_payment.bank_name,
      v_payment.payer_name,
      v_payment.narration,
      v_payment.screenshot_source,
      v_payment.comments,
      v_payment.ocr_confidence_score
    );

    -- Update the payment record
    IF (v_fraud_result->>'success')::boolean = true THEN
      UPDATE payment_submissions
      SET 
        fraud_score = (v_fraud_result->>'fraud_score')::int,
        is_fraud_flagged = (v_fraud_result->>'is_flagged')::boolean,
        fraud_indicators = v_fraud_result->'indicators',
        fraud_checked_at = now()
      WHERE id = v_payment.id;

      v_processed_count := v_processed_count + 1;
      IF (v_fraud_result->>'is_flagged')::boolean THEN
        v_flagged_count := v_flagged_count + 1;
      END IF;

      v_results := v_results || jsonb_build_object(
        'payment_id', v_payment.id,
        'fraud_score', (v_fraud_result->>'fraud_score')::int,
        'is_flagged', (v_fraud_result->>'is_flagged')::boolean
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'flagged_count', v_flagged_count,
    'results', v_results
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_payment_text_fields_from_values TO authenticated;
GRANT EXECUTE ON FUNCTION validate_payment_text_fields_from_values TO service_role;
GRANT EXECUTE ON FUNCTION manual_fraud_recheck TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_fraud_check TO authenticated;

-- Comments
COMMENT ON FUNCTION validate_payment_text_fields_from_values IS 
'Enhanced fraud detection that validates all text fields including comments and OCR confidence';

COMMENT ON FUNCTION manual_fraud_recheck IS 
'Allows admins to manually recheck fraud status for a single payment';

COMMENT ON FUNCTION bulk_fraud_check IS 
'Allows admins to perform fraud checks on multiple payments at once';
