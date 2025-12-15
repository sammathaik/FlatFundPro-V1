/*
  # Text-Based Fraud Detection System

  1. Purpose
    - Validates extracted payment text fields for fraud indicators
    - Checks dates, keywords, formats, and patterns
    - Provides detailed fraud scoring based on text analysis

  2. Fraud Detection Rules
    - Future date detection
    - Suspicious keywords (fake, test, dummy, etc.)
    - Invalid UPI/transaction ID formats
    - Typos and inconsistencies
    - Suspicious patterns

  3. New Function
    - `validate_payment_text_fields` - Analyzes text data and returns fraud indicators
    - Returns JSON with fraud score and specific violations
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS validate_payment_text_fields(uuid);

-- Create text-based fraud validation function
CREATE OR REPLACE FUNCTION validate_payment_text_fields(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment record;
  v_fraud_indicators jsonb := '[]'::jsonb;
  v_fraud_score int := 0;
  v_is_flagged boolean := false;
  v_current_date date := CURRENT_DATE;
  v_max_future_days int := 1;
  v_max_past_years int := 2;
BEGIN
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

  -- Rule 1: Check for future dates (CRITICAL - 40 points)
  IF v_payment.payment_date IS NOT NULL AND v_payment.payment_date > (v_current_date + v_max_future_days) THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'FUTURE_DATE',
      'severity', 'CRITICAL',
      'message', 'Payment date is in the future: ' || v_payment.payment_date::text,
      'points', 40
    );
    v_fraud_score := v_fraud_score + 40;
  END IF;

  -- Rule 2: Check for very old dates (10 points)
  IF v_payment.payment_date IS NOT NULL AND v_payment.payment_date < (v_current_date - (v_max_past_years * 365)) THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'OLD_DATE',
      'severity', 'MEDIUM',
      'message', 'Payment date is unusually old: ' || v_payment.payment_date::text,
      'points', 10
    );
    v_fraud_score := v_fraud_score + 10;
  END IF;

  -- Rule 3: Check for suspicious keywords in transaction_reference (30 points)
  IF v_payment.transaction_reference IS NOT NULL THEN
    IF v_payment.transaction_reference ~* '(fake|test|dummy|sample|example|xxx|zzz|aaa|000|111|123456)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_TRANSACTION_ID',
        'severity', 'CRITICAL',
        'message', 'Transaction reference contains suspicious keywords: ' || v_payment.transaction_reference,
        'points', 30
      );
      v_fraud_score := v_fraud_score + 30;
    END IF;
  END IF;

  -- Rule 4: Check for suspicious keywords in sender_upi_id (30 points)
  IF v_payment.sender_upi_id IS NOT NULL THEN
    IF v_payment.sender_upi_id ~* '(fake|test|dummy|sample|example)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_UPI_ID',
        'severity', 'CRITICAL',
        'message', 'UPI ID contains suspicious keywords: ' || v_payment.sender_upi_id,
        'points', 30
      );
      v_fraud_score := v_fraud_score + 30;
    END IF;

    -- Check for invalid UPI format
    IF NOT (v_payment.sender_upi_id ~* '^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$') THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'INVALID_UPI_FORMAT',
        'severity', 'HIGH',
        'message', 'UPI ID has invalid format: ' || v_payment.sender_upi_id,
        'points', 15
      );
      v_fraud_score := v_fraud_score + 15;
    END IF;
  END IF;

  -- Rule 5: Check for typos or suspicious text in other fields (15 points each)
  IF v_payment.other_text IS NOT NULL THEN
    -- Check for common typos like "Completeds" instead of "Completed"
    IF v_payment.other_text ~* '(completeds|successfuls|faileds|pendings)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_TYPO',
        'severity', 'HIGH',
        'message', 'Suspicious typo detected in text: ' || substring(v_payment.other_text, 1, 100),
        'points', 15
      );
      v_fraud_score := v_fraud_score + 15;
    END IF;

    -- Check for template/mockup indicators
    IF v_payment.other_text ~* '(template|mockup|placeholder|lorem ipsum|sample text)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'TEMPLATE_TEXT',
        'severity', 'CRITICAL',
        'message', 'Template or mockup text detected',
        'points', 25
      );
      v_fraud_score := v_fraud_score + 25;
    END IF;
  END IF;

  -- Rule 6: Check narration field for suspicious content (10 points)
  IF v_payment.narration IS NOT NULL THEN
    IF v_payment.narration ~* '(fake|test|dummy|sample)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_NARRATION',
        'severity', 'MEDIUM',
        'message', 'Narration contains suspicious keywords: ' || v_payment.narration,
        'points', 10
      );
      v_fraud_score := v_fraud_score + 10;
    END IF;
  END IF;

  -- Rule 7: Check for suspicious bank names (10 points)
  IF v_payment.bank_name IS NOT NULL THEN
    IF v_payment.bank_name ~* '(fake|test|dummy|sample|xyz bank|abc bank)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_BANK_NAME',
        'severity', 'MEDIUM',
        'message', 'Bank name appears suspicious: ' || v_payment.bank_name,
        'points', 10
      );
      v_fraud_score := v_fraud_score + 10;
    END IF;
  END IF;

  -- Rule 8: Check for screenshot source indicators (10 points)
  IF v_payment.screenshot_source IS NOT NULL THEN
    IF v_payment.screenshot_source ~* '(photoshop|gimp|canva|figma|sketch|edited)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'EDITING_SOFTWARE_DETECTED',
        'severity', 'MEDIUM',
        'message', 'Screenshot may have been created/edited with design software',
        'points', 10
      );
      v_fraud_score := v_fraud_score + 10;
    END IF;
  END IF;

  -- Rule 9: Check payer name vs submitter name mismatch (5 points)
  IF v_payment.payer_name IS NOT NULL AND v_payment.name IS NOT NULL THEN
    -- Calculate similarity (simple check - names should have some overlap)
    IF NOT (
      v_payment.payer_name ILIKE '%' || split_part(v_payment.name, ' ', 1) || '%' OR
      v_payment.payer_name ILIKE '%' || split_part(v_payment.name, ' ', 2) || '%' OR
      v_payment.name ILIKE '%' || split_part(v_payment.payer_name, ' ', 1) || '%'
    ) THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'NAME_MISMATCH',
        'severity', 'LOW',
        'message', 'Payer name does not match submitter name',
        'points', 5
      );
      v_fraud_score := v_fraud_score + 5;
    END IF;
  END IF;

  -- Rule 10: Check for suspiciously round amounts (2 points)
  IF v_payment.payment_amount IS NOT NULL THEN
    -- Amounts like 10000, 20000, 50000, 100000 are more suspicious than 16543
    IF v_payment.payment_amount IN (10000, 20000, 30000, 40000, 50000, 75000, 100000, 150000, 200000) THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'ROUND_AMOUNT',
        'severity', 'LOW',
        'message', 'Payment amount is a suspiciously round number',
        'points', 2
      );
      v_fraud_score := v_fraud_score + 2;
    END IF;
  END IF;

  -- Cap fraud score at 100
  v_fraud_score := LEAST(v_fraud_score, 100);

  -- Flag if score >= 70
  v_is_flagged := v_fraud_score >= 70;

  -- Return results
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_payment_text_fields(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_payment_text_fields(uuid) TO service_role;

-- Add comment
COMMENT ON FUNCTION validate_payment_text_fields IS 'Validates payment text fields for fraud indicators and returns detailed analysis';