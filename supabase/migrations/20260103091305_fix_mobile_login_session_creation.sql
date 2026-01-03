/*
  # Fix Mobile Login Session Creation
  
  ## Problem
  The UniversalLoginModal uses verify_mobile_otp_for_payment which doesn't create a
  session in occupant_sessions table. This causes get_payments_for_flat_with_session
  to fail with "invalid UUID" error.
  
  ## Solution
  Update verify_mobile_otp_for_payment to create an occupant session and return the 
  session token UUID for use with occupant portal login.
  
  ## Changes
  - Modify verify_mobile_otp_for_payment to create session in occupant_sessions
  - Return session_token UUID in the response
*/

-- Drop and recreate verify_mobile_otp_for_payment with session creation
DROP FUNCTION IF EXISTS public.verify_mobile_otp_for_payment(text, text);

CREATE OR REPLACE FUNCTION public.verify_mobile_otp_for_payment(
  mobile_number text, 
  otp_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mapping RECORD;
  v_session_id uuid;
BEGIN
  -- Find mapping with matching mobile and OTP
  SELECT 
    fem.*,
    a.apartment_name,
    a.country as apartment_country,
    bbp.block_name,
    fn.flat_number,
    fn.flat_type,
    fn.built_up_area
  INTO v_mapping
  FROM flat_email_mappings fem
  JOIN apartments a ON a.id = fem.apartment_id
  JOIN buildings_blocks_phases bbp ON bbp.id = fem.block_id
  JOIN flat_numbers fn ON fn.id = fem.flat_id
  WHERE fem.mobile = mobile_number
    AND fem.otp = otp_code
    AND a.status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_otp',
      'message', 'Invalid OTP or mobile number'
    );
  END IF;

  -- Check if OTP has expired
  IF v_mapping.otp_expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'otp_expired',
      'message', 'OTP has expired. Please request a new one.'
    );
  END IF;

  -- Mark mobile as verified and clear OTP
  UPDATE flat_email_mappings
  SET 
    is_mobile_verified = true,
    otp = NULL,
    otp_expires_at = NULL,
    updated_at = NOW()
  WHERE id = v_mapping.id;

  -- Create a new occupant session
  INSERT INTO occupant_sessions (flat_id, apartment_id, block_id, email)
  VALUES (v_mapping.flat_id, v_mapping.apartment_id, v_mapping.block_id, v_mapping.email)
  RETURNING id INTO v_session_id;

  -- Return session data with session token
  RETURN jsonb_build_object(
    'success', true,
    'message', 'OTP verified successfully',
    'session_token', v_session_id,
    'session', jsonb_build_object(
      'mapping_id', v_mapping.id,
      'apartment_id', v_mapping.apartment_id,
      'apartment_name', v_mapping.apartment_name,
      'apartment_country', v_mapping.apartment_country,
      'block_id', v_mapping.block_id,
      'block_name', v_mapping.block_name,
      'flat_id', v_mapping.flat_id,
      'flat_number', v_mapping.flat_number,
      'flat_type', v_mapping.flat_type,
      'built_up_area', v_mapping.built_up_area,
      'name', v_mapping.name,
      'email', v_mapping.email,
      'mobile', v_mapping.mobile,
      'occupant_type', v_mapping.occupant_type
    )
  );
END;
$$;

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION public.verify_mobile_otp_for_payment(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_mobile_otp_for_payment(text, text) TO authenticated;

COMMENT ON FUNCTION public.verify_mobile_otp_for_payment IS 'Verifies OTP, creates occupant session, and returns session token along with flat data for payment/portal access';
