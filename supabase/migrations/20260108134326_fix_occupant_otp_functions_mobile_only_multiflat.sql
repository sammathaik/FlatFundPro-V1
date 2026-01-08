/*
  # Fix Occupant OTP Functions for Mobile-Only Login and Multi-Flat

  ## Problems
  1. generate_occupant_otp uses p_email in queries even when it's NULL (mobile-only login)
  2. verify_occupant_otp needs to include mobile in session creation
  3. Multi-flat detection broken for mobile-only login

  ## Solutions
  1. Use v_mapping.email instead of p_email after finding the mapping
  2. Add mobile field to occupant_sessions table if missing
  3. Include mobile in session INSERT
  4. Fix multi-flat count query to use v_mapping.email

  ## Changes
  - Update generate_occupant_otp to handle mobile-only login properly
  - Update verify_occupant_otp to include mobile in session
  - Add mobile column to occupant_sessions if missing
*/

-- Add mobile column to occupant_sessions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'occupant_sessions' AND column_name = 'mobile'
  ) THEN
    ALTER TABLE occupant_sessions ADD COLUMN mobile text;
  END IF;
END $$;

-- Create index on mobile for faster lookups
CREATE INDEX IF NOT EXISTS idx_occupant_sessions_mobile ON occupant_sessions(mobile);

-- Fix generate_occupant_otp function
CREATE OR REPLACE FUNCTION generate_occupant_otp(
  p_email text DEFAULT NULL,
  p_mobile text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_otp text;
  v_mapping RECORD;
  v_mappings_count int;
  v_flats jsonb;
BEGIN
  -- Validate inputs
  IF p_email IS NULL AND p_mobile IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Please provide either email or mobile number'
    );
  END IF;

  -- Find flat_email_mappings record
  IF p_email IS NOT NULL AND p_mobile IS NOT NULL THEN
    SELECT * INTO v_mapping
    FROM flat_email_mappings
    WHERE LOWER(email) = LOWER(p_email)
      AND mobile = p_mobile
    LIMIT 1;
  ELSIF p_email IS NOT NULL THEN
    SELECT * INTO v_mapping
    FROM flat_email_mappings
    WHERE LOWER(email) = LOWER(p_email)
    LIMIT 1;
  ELSE
    SELECT * INTO v_mapping
    FROM flat_email_mappings
    WHERE mobile = p_mobile
    LIMIT 1;
  END IF;

  IF v_mapping.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', CASE 
        WHEN p_email IS NOT NULL AND p_mobile IS NOT NULL 
        THEN 'No account found with this email and mobile number combination'
        WHEN p_email IS NOT NULL 
        THEN 'No account found with this email. Please check or provide your mobile number.'
        ELSE 'No account found with this mobile number'
      END,
      'needs_mobile', (p_email IS NOT NULL AND p_mobile IS NULL)
    );
  END IF;

  -- Generate OTP
  v_otp := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');

  -- Store OTP
  INSERT INTO occupant_otp_codes (email, mobile, otp_code, flat_id)
  VALUES (v_mapping.email, v_mapping.mobile, v_otp, v_mapping.flat_id);

  -- Check if occupant has multiple flats (use v_mapping.email, not p_email)
  SELECT COUNT(*) INTO v_mappings_count
  FROM flat_email_mappings
  WHERE LOWER(email) = LOWER(v_mapping.email)
    AND mobile = v_mapping.mobile;

  -- Build flats array with name field (use v_mapping.email, not p_email)
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
  WHERE LOWER(fem.email) = LOWER(v_mapping.email)
    AND fem.mobile = v_mapping.mobile;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'OTP sent successfully',
    'mobile', v_mapping.mobile,
    'otp', v_otp,
    'email', v_mapping.email,
    'flats', v_flats,
    'has_multiple_flats', v_mappings_count > 1
  );
END;
$$;

-- Fix verify_occupant_otp function
CREATE OR REPLACE FUNCTION verify_occupant_otp(
  p_email text,
  p_otp text,
  p_flat_id uuid DEFAULT NULL
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
  -- Verify OTP
  SELECT * INTO v_otp_record
  FROM occupant_otp_codes
  WHERE LOWER(email) = LOWER(p_email)
    AND otp_code = p_otp
    AND created_at > NOW() - INTERVAL '15 minutes'
    AND used = false
  ORDER BY created_at DESC
  LIMIT 1;

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

  -- Get flat_email_mapping
  IF p_flat_id IS NOT NULL THEN
    SELECT * INTO v_mapping
    FROM flat_email_mappings
    WHERE LOWER(email) = LOWER(p_email)
      AND flat_id = p_flat_id
    LIMIT 1;
  ELSE
    SELECT * INTO v_mapping
    FROM flat_email_mappings
    WHERE LOWER(email) = LOWER(p_email)
      AND mobile = v_otp_record.mobile
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
  WHERE LOWER(email) = LOWER(p_email)
    AND mobile = v_mapping.mobile;

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
    WHERE LOWER(fem.email) = LOWER(p_email)
      AND fem.mobile = v_mapping.mobile;

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
  WHERE LOWER(fem.email) = LOWER(p_email)
    AND fem.mobile = v_mapping.mobile;

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
GRANT EXECUTE ON FUNCTION generate_occupant_otp(text, text) TO anon;
GRANT EXECUTE ON FUNCTION generate_occupant_otp(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_occupant_otp(text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION verify_occupant_otp(text, text, uuid) TO authenticated;

COMMENT ON FUNCTION generate_occupant_otp IS 'Generates OTP for occupant login via email or mobile, includes multi-flat and name support';
COMMENT ON FUNCTION verify_occupant_otp IS 'Verifies OTP, handles multi-flat selection, creates session with mobile, returns occupant data with name';
