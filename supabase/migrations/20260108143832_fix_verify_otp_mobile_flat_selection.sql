/*
  # Fix verify_occupant_otp for Mobile-Only Multi-Flat Selection

  ## Problem
  When a user logs in with mobile-only and has multiple flats:
  1. OTP is generated and stored with mobile number
  2. User selects the second flat
  3. verify_occupant_otp is called with p_email = NULL and p_flat_id = second flat's ID
  4. Function fails to find the mapping because it only queries by email

  ## Solution
  1. Add p_mobile parameter to verify_occupant_otp function
  2. Query OTP by email OR mobile (whichever is provided)
  3. Query flat_email_mappings by mobile when email is NULL
  4. Ensure proper lookup for multi-flat scenarios

  ## Changes
  - Drop old verify_occupant_otp function
  - Create new verify_occupant_otp with p_mobile parameter
  - Fix OTP lookup to support mobile-only login
  - Fix flat_email_mappings lookup to use mobile when email is NULL
*/

-- Drop old function
DROP FUNCTION IF EXISTS verify_occupant_otp(text, text, uuid);

-- Create new function with mobile parameter
CREATE OR REPLACE FUNCTION verify_occupant_otp(
  p_email text DEFAULT NULL,
  p_otp text DEFAULT NULL,
  p_flat_id uuid DEFAULT NULL,
  p_mobile text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mapping RECORD;
  v_otp_record RECORD;
  v_session_id uuid;
  v_flats jsonb;
  v_flat_count int;
BEGIN
  -- Validate inputs
  IF p_email IS NULL AND p_mobile IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Please provide either email or mobile number'
    );
  END IF;

  IF p_otp IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'OTP is required'
    );
  END IF;

  -- Verify OTP by email OR mobile
  IF p_email IS NOT NULL THEN
    SELECT * INTO v_otp_record
    FROM occupant_otp_codes
    WHERE LOWER(email) = LOWER(p_email)
      AND otp_code = p_otp
      AND created_at > NOW() - INTERVAL '15 minutes'
      AND used = false
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    -- Mobile-only login
    SELECT * INTO v_otp_record
    FROM occupant_otp_codes
    WHERE mobile = p_mobile
      AND otp_code = p_otp
      AND created_at > NOW() - INTERVAL '15 minutes'
      AND used = false
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_otp_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid or expired OTP'
    );
  END IF;

  -- Mark OTP as used
  UPDATE occupant_otp_codes
  SET used = true
  WHERE id = v_otp_record.id;

  -- Get flat_email_mapping based on what we have
  IF p_flat_id IS NOT NULL THEN
    -- Specific flat selected, find it by flat_id and mobile
    SELECT * INTO v_mapping
    FROM flat_email_mappings
    WHERE flat_id = p_flat_id
      AND mobile = v_otp_record.mobile
    LIMIT 1;
  ELSIF p_email IS NOT NULL THEN
    -- Email login, find by email
    SELECT * INTO v_mapping
    FROM flat_email_mappings
    WHERE LOWER(email) = LOWER(p_email)
      AND mobile = v_otp_record.mobile
    LIMIT 1;
  ELSE
    -- Mobile-only login, find by mobile
    SELECT * INTO v_mapping
    FROM flat_email_mappings
    WHERE mobile = v_otp_record.mobile
    LIMIT 1;
  END IF;

  IF v_mapping.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No flat mapping found'
    );
  END IF;

  -- Check if occupant has multiple flats
  SELECT COUNT(*) INTO v_flat_count
  FROM flat_email_mappings
  WHERE mobile = v_mapping.mobile;

  -- If multiple flats and no flat_id specified, return flats list with name
  IF v_flat_count > 1 AND p_flat_id IS NULL THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'flat_id', fem.flat_id,
        'apartment_name', a.apartment_name,
        'block_name', bbp.block_name,
        'flat_number', fn.flat_number,
        'name', fem.name,
        'occupant_type', fem.occupant_type
      )
    ) INTO v_flats
    FROM flat_email_mappings fem
    INNER JOIN flat_numbers fn ON fn.id = fem.flat_id
    INNER JOIN buildings_blocks_phases bbp ON bbp.id = fem.block_id
    INNER JOIN apartments a ON a.id = fem.apartment_id
    WHERE fem.mobile = v_mapping.mobile;

    RETURN json_build_object(
      'success', false,
      'needs_flat_selection', true,
      'message', 'Please select which flat you want to view',
      'flats', v_flats,
      'email', v_mapping.email,
      'mobile', v_mapping.mobile
    );
  END IF;

  -- Get all flats for this occupant with name field
  SELECT jsonb_agg(
    jsonb_build_object(
      'flat_id', fem.flat_id,
      'apartment_name', a.apartment_name,
      'block_name', bbp.block_name,
      'flat_number', fn.flat_number,
      'name', fem.name,
      'occupant_type', fem.occupant_type
    )
  ) INTO v_flats
  FROM flat_email_mappings fem
  INNER JOIN flat_numbers fn ON fn.id = fem.flat_id
  INNER JOIN buildings_blocks_phases bbp ON bbp.id = fem.block_id
  INNER JOIN apartments a ON a.id = fem.apartment_id
  WHERE fem.mobile = v_mapping.mobile;

  -- Create a new session for the selected flat WITH MOBILE
  INSERT INTO occupant_sessions (flat_id, apartment_id, block_id, email, mobile)
  VALUES (v_mapping.flat_id, v_mapping.apartment_id, v_mapping.block_id, v_mapping.email, v_mapping.mobile)
  RETURNING id INTO v_session_id;

  -- Return success with occupant details and session token
  RETURN json_build_object(
    'success', true,
    'message', 'Login successful',
    'session_token', v_session_id,
    'occupant', json_build_object(
      'flat_id', v_mapping.flat_id,
      'apartment_id', v_mapping.apartment_id,
      'block_id', v_mapping.block_id,
      'email', v_mapping.email,
      'mobile', v_mapping.mobile,
      'name', v_mapping.name,
      'occupant_type', v_mapping.occupant_type,
      'flat_number', (SELECT flat_number FROM flat_numbers WHERE id = v_mapping.flat_id),
      'apartment_name', (SELECT apartment_name FROM apartments WHERE id = v_mapping.apartment_id),
      'block_name', (SELECT block_name FROM buildings_blocks_phases WHERE id = v_mapping.block_id),
      'all_flats', v_flats
    )
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION verify_occupant_otp(text, text, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_occupant_otp(text, text, uuid, text) TO authenticated;

COMMENT ON FUNCTION verify_occupant_otp IS 'Verifies OTP via email or mobile, handles multi-flat selection, creates session with mobile, returns occupant data';
