/*
  # Fix Admin Manual Payment Function - Update Column Names

  ## Overview
  Updates the `create_admin_manual_payment` RPC function to use correct column names
  from the expected_collections table.

  ## Changes
  - Replace `amount_per_flat` with `amount_due`
  - Replace `late_fine_per_day` with `daily_fine`

  ## Impact
  This fixes the error when admins try to create manual payment entries.
  The function was failing because it was referencing non-existent columns.

  ## Testing
  After this migration, admin manual payment entry should work correctly.
*/

-- Drop and recreate the function with correct column names
CREATE OR REPLACE FUNCTION create_admin_manual_payment(
  p_apartment_id uuid,
  p_admin_user_id uuid,
  p_block_id uuid,
  p_flat_id uuid,
  p_occupant_name text,
  p_occupant_type text,
  p_email text,
  p_mobile text,
  p_whatsapp_optin boolean,
  p_expected_collection_id uuid,
  p_payment_amount numeric,
  p_payment_date date,
  p_payment_mode text,
  p_transaction_reference text DEFAULT NULL,
  p_remarks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_record RECORD;
  v_flat_record RECORD;
  v_block_record RECORD;
  v_collection_record RECORD;
  v_payment_id uuid;
  v_reviewer_id uuid;
  v_flat_number text;
  v_block_name text;
  v_expected_amount numeric;
  v_late_fine numeric DEFAULT 0;
  v_total_amount numeric;
  v_collection_name text;
  v_result jsonb;
BEGIN
  -- 1. SECURITY: Validate admin has access to this apartment
  SELECT id, admin_name, admin_email
  INTO v_admin_record
  FROM admins
  WHERE user_id = p_admin_user_id
    AND apartment_id = p_apartment_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'You do not have permission to create payments for this apartment'
    );
  END IF;

  v_reviewer_id := v_admin_record.id;

  -- 2. VALIDATE: Flat and block exist
  SELECT flat_number INTO v_flat_number
  FROM flat_numbers
  WHERE id = p_flat_id AND block_id = p_block_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_flat',
      'message', 'Invalid flat selection'
    );
  END IF;

  SELECT block_name INTO v_block_name
  FROM buildings_blocks_phases
  WHERE id = p_block_id AND apartment_id = p_apartment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_block',
      'message', 'Invalid block/building selection'
    );
  END IF;

  -- 3. VALIDATE: Collection exists and calculate expected amount
  -- FIXED: Use correct column names: amount_due and daily_fine
  SELECT
    collection_name,
    COALESCE(amount_due, 0) as expected_amount,
    due_date,
    COALESCE(daily_fine, 0) as daily_fine
  INTO v_collection_record
  FROM expected_collections
  WHERE id = p_expected_collection_id
    AND apartment_id = p_apartment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_collection',
      'message', 'Invalid collection selection'
    );
  END IF;

  v_collection_name := v_collection_record.collection_name;
  v_expected_amount := v_collection_record.expected_amount;

  -- Calculate late fine if payment date is after due date
  IF p_payment_date > v_collection_record.due_date THEN
    v_late_fine := v_collection_record.daily_fine * (p_payment_date - v_collection_record.due_date);
  END IF;

  v_total_amount := v_expected_amount + v_late_fine;

  -- 4. VALIDATE: Input fields
  IF p_occupant_name IS NULL OR trim(p_occupant_name) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_name',
      'message', 'Occupant name is required'
    );
  END IF;

  IF p_occupant_type NOT IN ('Owner', 'Tenant') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_occupant_type',
      'message', 'Occupant type must be Owner or Tenant'
    );
  END IF;

  IF p_email IS NULL OR trim(p_email) = '' OR p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_email',
      'message', 'Valid email address is required'
    );
  END IF;

  IF p_payment_amount IS NULL OR p_payment_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_amount',
      'message', 'Payment amount must be greater than zero'
    );
  END IF;

  IF p_payment_date IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_date',
      'message', 'Payment date is required'
    );
  END IF;

  IF p_payment_mode IS NULL OR trim(p_payment_mode) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_payment_mode',
      'message', 'Payment mode is required'
    );
  END IF;

  -- 5. CREATE OR UPDATE flat-email mapping
  INSERT INTO flat_email_mappings (
    apartment_id,
    block_id,
    flat_id,
    email,
    occupant_type,
    name,
    mobile,
    whatsapp_opt_in
  ) VALUES (
    p_apartment_id,
    p_block_id,
    p_flat_id,
    lower(trim(p_email)),
    p_occupant_type,
    trim(p_occupant_name),
    p_mobile,
    COALESCE(p_whatsapp_optin, false)
  )
  ON CONFLICT (apartment_id, block_id, flat_id, occupant_type)
  DO UPDATE SET
    email = lower(trim(p_email)),
    name = trim(p_occupant_name),
    mobile = p_mobile,
    whatsapp_opt_in = COALESCE(p_whatsapp_optin, false),
    updated_at = now();

  -- 6. CREATE payment submission record as APPROVED
  INSERT INTO payment_submissions (
    apartment_id,
    name,
    block_id,
    flat_id,
    email,
    contact_number,
    payment_amount,
    payment_date,
    transaction_reference,
    comments,
    screenshot_url,
    screenshot_filename,
    status,
    reviewed_by,
    reviewed_at,
    expected_collection_id,
    payment_type,
    payment_source,
    occupant_type,
    platform,
    narration,
    other_text,
    fraud_score,
    is_fraud_flagged,
    fraud_checked_at,
    ocr_confidence_score,
    submission_source,
    admin_action_type
  ) VALUES (
    p_apartment_id,
    trim(p_occupant_name),
    p_block_id,
    p_flat_id,
    lower(trim(p_email)),
    p_mobile,
    p_payment_amount,
    p_payment_date,
    p_transaction_reference,
    COALESCE(p_remarks, ''),
    'admin-manual-entry',
    'Admin Manual Entry - No Screenshot Required',
    'Approved',
    v_reviewer_id,
    now(),
    p_expected_collection_id,
    v_collection_name,
    p_payment_mode,
    p_occupant_type,
    p_payment_mode,
    format('Admin manual entry by %s. Late fine: ₹%s', v_admin_record.admin_name, v_late_fine),
    format('Entered by: %s (%s) | Expected: ₹%s | Late Fine: ₹%s | Source: Manual Entry',
           v_admin_record.admin_name,
           v_admin_record.admin_email,
           v_expected_amount,
           v_late_fine),
    NULL,
    false,
    NULL,
    NULL,
    'admin_portal',
    'manual_entry'
  )
  RETURNING id INTO v_payment_id;

  -- 7. LOG to communication_logs for email notification
  IF p_email IS NOT NULL AND trim(p_email) != '' THEN
    INSERT INTO communication_logs (
      apartment_id,
      flat_number,
      recipient_name,
      recipient_email,
      recipient_mobile,
      communication_channel,
      communication_type,
      related_payment_id,
      message_subject,
      message_preview,
      status,
      whatsapp_opt_in_status,
      triggered_by_user_id,
      triggered_by_event,
      metadata
    ) VALUES (
      p_apartment_id,
      v_flat_number,
      trim(p_occupant_name),
      lower(trim(p_email)),
      p_mobile,
      'EMAIL',
      'ADMIN_PAYMENT_ENTRY',
      v_payment_id,
      format('Payment Recorded - %s - Flat %s', v_collection_name, v_flat_number),
      format('Your payment of ₹%s for %s has been recorded by the admin.', p_payment_amount, v_collection_name),
      'PENDING',
      false,
      p_admin_user_id,
      'ADMIN_MANUAL_PAYMENT_ENTRY',
      jsonb_build_object(
        'admin_name', v_admin_record.admin_name,
        'admin_email', v_admin_record.admin_email,
        'collection_name', v_collection_name,
        'payment_mode', p_payment_mode,
        'expected_amount', v_expected_amount,
        'late_fine', v_late_fine,
        'entry_type', 'manual'
      )
    );
  END IF;

  -- 8. LOG to communication_logs for WhatsApp notification
  IF p_whatsapp_optin AND p_mobile IS NOT NULL AND trim(p_mobile) != '' THEN
    INSERT INTO communication_logs (
      apartment_id,
      flat_number,
      recipient_name,
      recipient_email,
      recipient_mobile,
      communication_channel,
      communication_type,
      related_payment_id,
      message_subject,
      message_preview,
      status,
      whatsapp_opt_in_status,
      triggered_by_user_id,
      triggered_by_event,
      metadata
    ) VALUES (
      p_apartment_id,
      v_flat_number,
      trim(p_occupant_name),
      lower(trim(p_email)),
      p_mobile,
      'WHATSAPP',
      'ADMIN_PAYMENT_ENTRY',
      v_payment_id,
      NULL,
      format('Payment Recorded: ₹%s for %s - Flat %s', p_payment_amount, v_collection_name, v_flat_number),
      'PENDING',
      true,
      p_admin_user_id,
      'ADMIN_MANUAL_PAYMENT_ENTRY',
      jsonb_build_object(
        'admin_name', v_admin_record.admin_name,
        'collection_name', v_collection_name,
        'payment_mode', p_payment_mode,
        'expected_amount', v_expected_amount,
        'late_fine', v_late_fine,
        'entry_type', 'manual'
      )
    );
  END IF;

  -- 9. LOG to audit_logs
  INSERT INTO audit_logs (
    user_id,
    user_email,
    action,
    table_name,
    record_id,
    details
  ) VALUES (
    p_admin_user_id,
    v_admin_record.admin_email,
    'ADMIN_MANUAL_PAYMENT_CREATE',
    'payment_submissions',
    v_payment_id,
    jsonb_build_object(
      'admin_name', v_admin_record.admin_name,
      'flat_number', v_flat_number,
      'block_name', v_block_name,
      'occupant_name', p_occupant_name,
      'payment_amount', p_payment_amount,
      'payment_date', p_payment_date,
      'payment_mode', p_payment_mode,
      'collection_name', v_collection_name,
      'expected_amount', v_expected_amount,
      'late_fine', v_late_fine,
      'email_notification', (p_email IS NOT NULL),
      'whatsapp_notification', p_whatsapp_optin
    )
  );

  -- 10. RETURN success
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'flat_number', v_flat_number,
    'block_name', v_block_name,
    'collection_name', v_collection_name,
    'expected_amount', v_expected_amount,
    'late_fine', v_late_fine,
    'total_expected', v_total_amount,
    'payment_amount', p_payment_amount,
    'email_notification_queued', (p_email IS NOT NULL),
    'whatsapp_notification_queued', p_whatsapp_optin,
    'message', format('Payment successfully recorded for Flat %s - %s', v_flat_number, v_block_name)
  );

EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO audit_logs (
      user_id,
      user_email,
      action,
      table_name,
      details
    ) VALUES (
      p_admin_user_id,
      (SELECT admin_email FROM admins WHERE user_id = p_admin_user_id LIMIT 1),
      'ADMIN_MANUAL_PAYMENT_CREATE_ERROR',
      'payment_submissions',
      jsonb_build_object(
        'error_message', SQLERRM,
        'error_detail', SQLSTATE,
        'input_params', jsonb_build_object(
          'flat_id', p_flat_id,
          'amount', p_payment_amount,
          'date', p_payment_date
        )
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'system_error',
      'message', format('Error: %s', SQLERRM),
      'detail', SQLSTATE
    );
END;
$$;
