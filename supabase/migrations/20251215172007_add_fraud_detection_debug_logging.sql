/*
  # Add Debug Logging to Fraud Detection

  1. Purpose
    - Creates a debug version of the fraud validation function
    - Shows detailed step-by-step evaluation of each rule
    - Logs all data being checked

  2. Changes
    - New function with detailed logging output
    - Shows field values before checking
    - Shows why rules triggered or didn't trigger
*/

-- Create debug version with detailed logging
CREATE OR REPLACE FUNCTION validate_payment_text_fields_debug(p_payment_id uuid)
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
  v_debug_log jsonb := '[]'::jsonb;
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

  -- Log initial data
  v_debug_log := v_debug_log || jsonb_build_object(
    'step', 'INITIAL_DATA',
    'payment_id', p_payment_id,
    'payment_date', v_payment.payment_date,
    'payment_amount', v_payment.payment_amount,
    'transaction_reference', v_payment.transaction_reference,
    'sender_upi_id', v_payment.sender_upi_id,
    'payer_name', v_payment.payer_name,
    'bank_name', v_payment.bank_name,
    'narration', v_payment.narration,
    'other_text', substring(v_payment.other_text, 1, 200),
    'screenshot_source', v_payment.screenshot_source,
    'current_date', v_current_date
  );

  -- Rule 1: Check for future dates
  v_debug_log := v_debug_log || jsonb_build_object(
    'step', 'RULE_1_FUTURE_DATE',
    'checking', 'payment_date > current_date + ' || v_max_future_days || ' days',
    'payment_date', v_payment.payment_date,
    'current_date', v_current_date,
    'max_allowed_date', v_current_date + v_max_future_days,
    'is_future', v_payment.payment_date > (v_current_date + v_max_future_days)
  );

  IF v_payment.payment_date IS NOT NULL AND v_payment.payment_date > (v_current_date + v_max_future_days) THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'FUTURE_DATE',
      'severity', 'CRITICAL',
      'message', 'Payment date is in the future: ' || v_payment.payment_date::text,
      'points', 40
    );
    v_fraud_score := v_fraud_score + 40;
    v_debug_log := v_debug_log || jsonb_build_object(
      'step', 'RULE_1_TRIGGERED',
      'points_added', 40,
      'new_score', v_fraud_score
    );
  ELSE
    v_debug_log := v_debug_log || jsonb_build_object(
      'step', 'RULE_1_PASSED',
      'reason', 'Date is not in future or is null'
    );
  END IF;

  -- Rule 2: Check for very old dates
  v_debug_log := v_debug_log || jsonb_build_object(
    'step', 'RULE_2_OLD_DATE',
    'checking', 'payment_date < current_date - ' || v_max_past_years || ' years',
    'min_allowed_date', v_current_date - (v_max_past_years * 365),
    'is_old', v_payment.payment_date < (v_current_date - (v_max_past_years * 365))
  );

  IF v_payment.payment_date IS NOT NULL AND v_payment.payment_date < (v_current_date - (v_max_past_years * 365)) THEN
    v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
      'type', 'OLD_DATE',
      'severity', 'MEDIUM',
      'message', 'Payment date is unusually old: ' || v_payment.payment_date::text,
      'points', 10
    );
    v_fraud_score := v_fraud_score + 10;
    v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_2_TRIGGERED', 'points_added', 10, 'new_score', v_fraud_score);
  ELSE
    v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_2_PASSED');
  END IF;

  -- Rule 3: Check transaction_reference for suspicious keywords
  v_debug_log := v_debug_log || jsonb_build_object(
    'step', 'RULE_3_SUSPICIOUS_TRANSACTION_ID',
    'checking', 'transaction_reference for pattern: (fake|test|dummy|sample|example|xxx|zzz|aaa|000|111|123456)',
    'value', v_payment.transaction_reference,
    'matches', v_payment.transaction_reference ~* '(fake|test|dummy|sample|example|xxx|zzz|aaa|000|111|123456)'
  );

  IF v_payment.transaction_reference IS NOT NULL THEN
    IF v_payment.transaction_reference ~* '(fake|test|dummy|sample|example|xxx|zzz|aaa|000|111|123456)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_TRANSACTION_ID',
        'severity', 'CRITICAL',
        'message', 'Transaction reference contains suspicious keywords: ' || v_payment.transaction_reference,
        'points', 30
      );
      v_fraud_score := v_fraud_score + 30;
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_3_TRIGGERED', 'points_added', 30, 'new_score', v_fraud_score);
    ELSE
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_3_PASSED');
    END IF;
  ELSE
    v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_3_SKIPPED', 'reason', 'transaction_reference is null');
  END IF;

  -- Rule 4: Check sender_upi_id for suspicious keywords
  v_debug_log := v_debug_log || jsonb_build_object(
    'step', 'RULE_4_SUSPICIOUS_UPI_ID',
    'checking', 'sender_upi_id for pattern: (fake|test|dummy|sample|example)',
    'value', v_payment.sender_upi_id,
    'matches', v_payment.sender_upi_id ~* '(fake|test|dummy|sample|example)'
  );

  IF v_payment.sender_upi_id IS NOT NULL THEN
    IF v_payment.sender_upi_id ~* '(fake|test|dummy|sample|example)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_UPI_ID',
        'severity', 'CRITICAL',
        'message', 'UPI ID contains suspicious keywords: ' || v_payment.sender_upi_id,
        'points', 30
      );
      v_fraud_score := v_fraud_score + 30;
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_4A_TRIGGERED', 'points_added', 30, 'new_score', v_fraud_score);
    ELSE
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_4A_PASSED');
    END IF;

    -- Check for invalid UPI format
    v_debug_log := v_debug_log || jsonb_build_object(
      'step', 'RULE_4B_UPI_FORMAT',
      'checking', 'UPI format: ^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$',
      'value', v_payment.sender_upi_id,
      'matches', v_payment.sender_upi_id ~* '^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$'
    );

    IF NOT (v_payment.sender_upi_id ~* '^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$') THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'INVALID_UPI_FORMAT',
        'severity', 'HIGH',
        'message', 'UPI ID has invalid format: ' || v_payment.sender_upi_id,
        'points', 15
      );
      v_fraud_score := v_fraud_score + 15;
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_4B_TRIGGERED', 'points_added', 15, 'new_score', v_fraud_score);
    ELSE
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_4B_PASSED');
    END IF;
  ELSE
    v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_4_SKIPPED', 'reason', 'sender_upi_id is null');
  END IF;

  -- Rule 5: Check other_text for typos
  IF v_payment.other_text IS NOT NULL THEN
    v_debug_log := v_debug_log || jsonb_build_object(
      'step', 'RULE_5_TYPOS',
      'checking', 'other_text for pattern: (completeds|successfuls|faileds|pendings)',
      'value', substring(v_payment.other_text, 1, 200),
      'matches', v_payment.other_text ~* '(completeds|successfuls|faileds|pendings)'
    );

    IF v_payment.other_text ~* '(completeds|successfuls|faileds|pendings)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_TYPO',
        'severity', 'HIGH',
        'message', 'Suspicious typo detected in text: ' || substring(v_payment.other_text, 1, 100),
        'points', 15
      );
      v_fraud_score := v_fraud_score + 15;
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_5A_TRIGGERED', 'points_added', 15, 'new_score', v_fraud_score);
    ELSE
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_5A_PASSED');
    END IF;

    -- Check for template text
    v_debug_log := v_debug_log || jsonb_build_object(
      'step', 'RULE_5B_TEMPLATE',
      'checking', 'other_text for pattern: (template|mockup|placeholder|lorem ipsum|sample text)',
      'matches', v_payment.other_text ~* '(template|mockup|placeholder|lorem ipsum|sample text)'
    );

    IF v_payment.other_text ~* '(template|mockup|placeholder|lorem ipsum|sample text)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'TEMPLATE_TEXT',
        'severity', 'CRITICAL',
        'message', 'Template or mockup text detected',
        'points', 25
      );
      v_fraud_score := v_fraud_score + 25;
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_5B_TRIGGERED', 'points_added', 25, 'new_score', v_fraud_score);
    ELSE
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_5B_PASSED');
    END IF;
  ELSE
    v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_5_SKIPPED', 'reason', 'other_text is null');
  END IF;

  -- Rule 6: Check narration
  IF v_payment.narration IS NOT NULL THEN
    v_debug_log := v_debug_log || jsonb_build_object(
      'step', 'RULE_6_NARRATION',
      'value', v_payment.narration,
      'matches', v_payment.narration ~* '(fake|test|dummy|sample)'
    );

    IF v_payment.narration ~* '(fake|test|dummy|sample)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_NARRATION',
        'severity', 'MEDIUM',
        'message', 'Narration contains suspicious keywords: ' || v_payment.narration,
        'points', 10
      );
      v_fraud_score := v_fraud_score + 10;
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_6_TRIGGERED', 'points_added', 10, 'new_score', v_fraud_score);
    ELSE
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_6_PASSED');
    END IF;
  ELSE
    v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_6_SKIPPED', 'reason', 'narration is null');
  END IF;

  -- Rule 7: Check bank_name
  IF v_payment.bank_name IS NOT NULL THEN
    v_debug_log := v_debug_log || jsonb_build_object(
      'step', 'RULE_7_BANK_NAME',
      'value', v_payment.bank_name,
      'matches', v_payment.bank_name ~* '(fake|test|dummy|sample|xyz bank|abc bank)'
    );

    IF v_payment.bank_name ~* '(fake|test|dummy|sample|xyz bank|abc bank)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'SUSPICIOUS_BANK_NAME',
        'severity', 'MEDIUM',
        'message', 'Bank name appears suspicious: ' || v_payment.bank_name,
        'points', 10
      );
      v_fraud_score := v_fraud_score + 10;
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_7_TRIGGERED', 'points_added', 10, 'new_score', v_fraud_score);
    ELSE
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_7_PASSED');
    END IF;
  ELSE
    v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_7_SKIPPED', 'reason', 'bank_name is null');
  END IF;

  -- Rule 8: Check screenshot_source
  IF v_payment.screenshot_source IS NOT NULL THEN
    v_debug_log := v_debug_log || jsonb_build_object(
      'step', 'RULE_8_SCREENSHOT_SOURCE',
      'value', v_payment.screenshot_source,
      'matches', v_payment.screenshot_source ~* '(photoshop|gimp|canva|figma|sketch|edited)'
    );

    IF v_payment.screenshot_source ~* '(photoshop|gimp|canva|figma|sketch|edited)' THEN
      v_fraud_indicators := v_fraud_indicators || jsonb_build_object(
        'type', 'EDITING_SOFTWARE_DETECTED',
        'severity', 'MEDIUM',
        'message', 'Screenshot may have been created/edited with design software',
        'points', 10
      );
      v_fraud_score := v_fraud_score + 10;
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_8_TRIGGERED', 'points_added', 10, 'new_score', v_fraud_score);
    ELSE
      v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_8_PASSED');
    END IF;
  ELSE
    v_debug_log := v_debug_log || jsonb_build_object('step', 'RULE_8_SKIPPED', 'reason', 'screenshot_source is null');
  END IF;

  -- Cap fraud score at 100
  v_fraud_score := LEAST(v_fraud_score, 100);
  v_is_flagged := v_fraud_score >= 70;

  v_debug_log := v_debug_log || jsonb_build_object(
    'step', 'FINAL_RESULT',
    'fraud_score', v_fraud_score,
    'is_flagged', v_is_flagged,
    'threshold', 70,
    'total_indicators', jsonb_array_length(v_fraud_indicators)
  );

  -- Return results with debug log
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'fraud_score', v_fraud_score,
    'is_flagged', v_is_flagged,
    'indicators', v_fraud_indicators,
    'indicator_count', jsonb_array_length(v_fraud_indicators),
    'debug_log', v_debug_log
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'debug_log', v_debug_log
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_payment_text_fields_debug(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_payment_text_fields_debug(uuid) TO service_role;

COMMENT ON FUNCTION validate_payment_text_fields_debug IS 'Debug version of fraud validation with detailed step-by-step logging';