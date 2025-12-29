/*
  # Remove OCR Confidence Score Penalty

  1. Purpose
    - Remove unfair fraud penalty for missing ocr_confidence_score
    - We don't do OCR (users manually enter data)
    - 100% of payments have NULL ocr_confidence_score
    - Penalty was giving +10 points to every payment unfairly

  2. Changes
    - Remove Rule 15 (MISSING_OCR_CONFIDENCE check)
    - Keep Rule 10 (LOW_OCR_CONFIDENCE for when score < 40)
    - Recalculate fraud scores for all existing payments

  3. Impact
    - All fraud scores will decrease by 10 points
    - More accurate fraud detection
    - Logic now matches implementation
*/

-- Drop existing function
DROP FUNCTION IF EXISTS validate_payment_text_fields_from_values(date, text, text, text, text, text, text, text, text, integer, text);

-- Enhanced fraud validation function WITHOUT OCR confidence penalty
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
  p_ocr_confidence_score integer DEFAULT NULL,
  p_screenshot_url text DEFAULT NULL
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
  v_has_legitimate_error boolean := false;
BEGIN
  -- Check if other_text contains legitimate error messages
  IF p_other_text IS NOT NULL THEN
    v_has_legitimate_error := p_other_text ~* '(ERROR:|FAILED:|Invalid file format|File validation failed|Unable to process|Unsupported file type)';
  END IF;

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

  -- Rule 6: Check comments field for suspicious content
  IF p_comments IS NOT NULL THEN
    IF p_comments ~* '(fake|test|dummy|sample|example)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_KEYWORDS_COMMENTS',
        'severity', 'CRITICAL',
        'message', 'Comments contain suspicious keywords: ' || substring(p_comments, 1, 100),
        'points', 30
      );
      v_fraud_score := v_fraud_score + 30;
    END IF;

    IF p_comments ~* '(completeds|successfuls|faileds|pendings)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_TYPO_COMMENTS',
        'severity', 'HIGH',
        'message', 'Suspicious typo detected in comments: ' || substring(p_comments, 1, 100),
        'points', 15
      );
      v_fraud_score := v_fraud_score + 15;
    END IF;

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

  -- Rule 10: Check OCR confidence score IF IT EXISTS and is low
  -- This is different from Rule 15 - this checks quality when OCR was actually done
  IF p_ocr_confidence_score IS NOT NULL AND p_ocr_confidence_score < 40 THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'LOW_OCR_CONFIDENCE',
      'severity', 'MEDIUM',
      'message', 'OCR confidence score is very low: ' || p_ocr_confidence_score::text || '%',
      'points', 10
    );
    v_fraud_score := v_fraud_score + 10;
  END IF;

  -- Missing Critical Fields Rules (only if screenshot exists and no legitimate error)
  IF p_screenshot_url IS NOT NULL AND NOT v_has_legitimate_error THEN

    -- Rule 11: Missing transaction_reference (HIGH - 20 points)
    IF p_transaction_reference IS NULL OR trim(p_transaction_reference) = '' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'MISSING_TRANSACTION_REF',
        'severity', 'HIGH',
        'message', 'Transaction reference missing after OCR extraction - possible fake screenshot',
        'points', 20
      );
      v_fraud_score := v_fraud_score + 20;
    END IF;

    -- Rule 12: Missing sender_upi_id (HIGH - 20 points)
    IF p_sender_upi_id IS NULL OR trim(p_sender_upi_id) = '' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'MISSING_UPI_ID',
        'severity', 'HIGH',
        'message', 'UPI ID missing after OCR extraction - possible fake screenshot',
        'points', 20
      );
      v_fraud_score := v_fraud_score + 20;
    END IF;

    -- Rule 13: Missing bank_name (MEDIUM - 10 points)
    IF p_bank_name IS NULL OR trim(p_bank_name) = '' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'MISSING_BANK_NAME',
        'severity', 'MEDIUM',
        'message', 'Bank name missing after OCR extraction',
        'points', 10
      );
      v_fraud_score := v_fraud_score + 10;
    END IF;

    -- Rule 14: Missing payer_name (LOW - 5 points)
    IF p_payer_name IS NULL OR trim(p_payer_name) = '' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'MISSING_PAYER_NAME',
        'severity', 'LOW',
        'message', 'Payer name missing after OCR extraction',
        'points', 5
      );
      v_fraud_score := v_fraud_score + 5;
    END IF;

    -- RULE 15 REMOVED: No longer penalize for missing OCR confidence score
    -- We don't do OCR, so this field is always NULL and was unfairly penalizing all payments

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

-- Recalculate fraud scores for all existing payments
DO $$
DECLARE
  v_result jsonb;
BEGIN
  -- Run the bulk recalculation
  SELECT bulk_recalculate_fraud_scores() INTO v_result;

  -- Log the result
  RAISE NOTICE 'Removed OCR confidence penalty and recalculated fraud scores: %', v_result;
END $$;
