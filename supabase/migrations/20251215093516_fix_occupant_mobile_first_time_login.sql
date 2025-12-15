/*
  # Fix Occupant Mobile Number First-Time Login

  ## Overview
  Fixes the issue where occupants with NULL mobile cannot log in when entering
  their mobile number for the first time.

  ## Problem
  - Some occupants have mobile: NULL in flat_email_mappings
  - When they enter mobile during login, validation fails because NULL != entered_mobile
  - This blocks single-flat occupants from logging in

  ## Solution
  - Update generate_occupant_otp to accept and save mobile on first login
  - If DB has NULL mobile and user provides one, save it instead of rejecting it
  - Only validate mobile match if mobile already exists in DB

  ## Changes Made
  1. Modified generate_occupant_otp to handle NULL mobile gracefully
  2. Allows setting mobile on first login attempt
  3. Validates mobile only if it already exists in DB
*/

CREATE OR REPLACE FUNCTION generate_occupant_otp(
  p_email text,
  p_mobile text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_mappings_count integer;
  v_mapping RECORD;
  v_existing_mobile text;
  v_otp text;
  v_expires_at timestamptz;
  v_flats jsonb;
BEGIN
  -- Find mappings by email
  SELECT COUNT(*) INTO v_mappings_count
  FROM flat_email_mappings
  WHERE LOWER(email) = LOWER(p_email);
  
  IF v_mappings_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_not_found',
      'message', 'No occupant found with this email address'
    );
  END IF;
  
  -- Get existing mobile for this email (if any)
  SELECT mobile INTO v_existing_mobile
  FROM flat_email_mappings
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;
  
  -- If no mobile provided
  IF p_mobile IS NULL THEN
    -- If DB has no mobile, ask for it
    IF v_existing_mobile IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'mobile_required',
        'message', 'Please provide your mobile number',
        'needs_mobile', true
      );
    END IF;
    
    -- Use existing mobile from DB
    p_mobile := v_existing_mobile;
  ELSE
    -- Mobile was provided by user
    -- If DB already has a mobile, validate it matches
    IF v_existing_mobile IS NOT NULL AND v_existing_mobile != p_mobile THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'mobile_mismatch',
        'message', 'Mobile number does not match our records for this email'
      );
    END IF;
    
    -- If DB has NULL mobile, this is first-time login - will update below
  END IF;
  
  -- Generate 6-digit OTP
  v_otp := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
  v_expires_at := now() + interval '10 minutes';
  
  -- Update ALL mappings with same email with the OTP and mobile
  UPDATE flat_email_mappings
  SET 
    otp = v_otp,
    otp_expires_at = v_expires_at,
    mobile = p_mobile,  -- Set mobile if it was NULL
    updated_at = now()
  WHERE LOWER(email) = LOWER(p_email);
  
  -- Count how many flats this email+mobile has
  SELECT COUNT(*) INTO v_mappings_count
  FROM flat_email_mappings
  WHERE LOWER(email) = LOWER(p_email)
    AND mobile = p_mobile;
  
  -- Get all flats for this email+mobile combination
  SELECT jsonb_agg(
    jsonb_build_object(
      'flat_id', fem.flat_id,
      'apartment_name', a.apartment_name,
      'block_name', bbp.block_name,
      'flat_number', fn.flat_number,
      'occupant_type', fem.occupant_type
    )
  ) INTO v_flats
  FROM flat_email_mappings fem
  INNER JOIN flat_numbers fn ON fn.id = fem.flat_id
  INNER JOIN buildings_blocks_phases bbp ON bbp.id = fem.block_id
  INNER JOIN apartments a ON a.id = fem.apartment_id
  WHERE LOWER(fem.email) = LOWER(p_email)
    AND fem.mobile = p_mobile;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'OTP sent successfully',
    'mobile', p_mobile,
    'otp', v_otp,
    'expires_at', v_expires_at,
    'flats', v_flats,
    'has_multiple_flats', v_mappings_count > 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_occupant_otp IS 'Generates OTP for occupant login. Accepts mobile on first login if NULL in DB. Validates mobile if already exists.';
