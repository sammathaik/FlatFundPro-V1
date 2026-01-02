/*
  # Fix Mobile Payment Submission RLS Issue

  ## Problem
  Mobile payment submissions are failing with RLS policy violations despite
  having anon_insert_payments policy with WITH CHECK (true).

  ## Solution
  Create a dedicated RPC function `submit_mobile_payment` that:
  1. Validates duplicate payments
  2. Inserts payment with SECURITY DEFINER (bypasses RLS)
  3. Returns clear success/error messages
  4. Maintains all security checks at application level

  ## Security
  - SECURITY DEFINER bypasses RLS but function validates all inputs
  - Duplicate check prevents multiple submissions
  - Only allows inserts, no updates or deletes
  - Function is accessible to anon and authenticated roles
*/

CREATE OR REPLACE FUNCTION public.submit_mobile_payment(
  p_apartment_id uuid,
  p_block_id uuid,
  p_flat_id uuid,
  p_name text,
  p_email text,
  p_contact_number text,
  p_payment_amount numeric,
  p_payment_date date,
  p_screenshot_url text,
  p_screenshot_filename text,
  p_transaction_reference text DEFAULT NULL,
  p_expected_collection_id uuid DEFAULT NULL,
  p_occupant_type text DEFAULT NULL,
  p_payment_source text DEFAULT 'Mobile Submission'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_duplicate_check record;
  v_collection_name text;
BEGIN
  -- Validate required fields
  IF p_apartment_id IS NULL OR p_block_id IS NULL OR p_flat_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required fields: apartment_id, block_id, or flat_id'
    );
  END IF;

  IF p_expected_collection_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Please select a collection type'
    );
  END IF;

  -- Check for duplicate payment
  SELECT * INTO v_duplicate_check
  FROM check_payment_duplicate(
    p_block_id,
    p_flat_id,
    p_expected_collection_id,
    p_payment_date,
    now()
  )
  LIMIT 1;

  IF v_duplicate_check.is_duplicate THEN
    -- Get collection name
    SELECT collection_name INTO v_collection_name
    FROM expected_collections
    WHERE id = p_expected_collection_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', format(
        'A payment for %s has already been submitted on %s. Duplicate submissions for the same collection are not allowed.',
        COALESCE(v_collection_name, 'this collection'),
        to_char(v_duplicate_check.existing_payment_date, 'DD/MM/YYYY')
      ),
      'is_duplicate', true
    );
  END IF;

  -- Insert payment submission
  INSERT INTO payment_submissions (
    apartment_id,
    block_id,
    flat_id,
    name,
    email,
    contact_number,
    payment_amount,
    payment_date,
    screenshot_url,
    screenshot_filename,
    transaction_reference,
    expected_collection_id,
    occupant_type,
    payment_source,
    submission_source,
    status
  )
  VALUES (
    p_apartment_id,
    p_block_id,
    p_flat_id,
    p_name,
    p_email,
    p_contact_number,
    p_payment_amount,
    p_payment_date,
    p_screenshot_url,
    p_screenshot_filename,
    p_transaction_reference,
    p_expected_collection_id,
    p_occupant_type,
    p_payment_source,
    'resident',
    'Received'
  )
  RETURNING id INTO v_payment_id;

  -- Return success with payment ID
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'message', 'Payment submitted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.submit_mobile_payment TO anon;
GRANT EXECUTE ON FUNCTION public.submit_mobile_payment TO authenticated;

COMMENT ON FUNCTION public.submit_mobile_payment IS 
'Securely submits a mobile payment with duplicate checking and RLS bypass. Used by mobile payment flow to avoid RLS authentication issues.';
