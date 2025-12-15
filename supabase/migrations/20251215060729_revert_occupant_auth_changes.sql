/*
  # Revert Occupant Authentication Changes

  ## Changes Reverted
  - Remove user_id column from flat_email_mappings
  - Restore original verify_occupant_otp function without auth.users integration
  - Remove auth user creation logic

  ## Reason
  - Changes broke admin page functionality
*/

-- Drop user_id column from flat_email_mappings
ALTER TABLE flat_email_mappings DROP COLUMN IF EXISTS user_id;

-- Restore original verify_occupant_otp function
CREATE OR REPLACE FUNCTION public.verify_occupant_otp(p_email text, p_otp text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_mapping RECORD;
BEGIN
  -- Find the mapping by email
  SELECT * INTO v_mapping
  FROM flat_email_mappings
  WHERE LOWER(email) = LOWER(p_email);

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_not_found',
      'message', 'No occupant found with this email address'
    );
  END IF;

  -- Check if OTP exists
  IF v_mapping.otp IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_otp',
      'message', 'No OTP found. Please request a new one.'
    );
  END IF;

  -- Check if OTP has expired
  IF v_mapping.otp_expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'otp_expired',
      'message', 'OTP has expired. Please request a new one.'
    );
  END IF;

  -- Verify OTP
  IF v_mapping.otp != p_otp THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_otp',
      'message', 'Invalid OTP. Please try again.'
    );
  END IF;

  -- OTP verified successfully
  UPDATE flat_email_mappings
  SET 
    is_mobile_verified = true,
    otp = NULL,
    otp_expires_at = NULL
  WHERE id = v_mapping.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'OTP verified successfully',
    'occupant', jsonb_build_object(
      'id', v_mapping.id,
      'email', v_mapping.email,
      'mobile', v_mapping.mobile,
      'occupant_type', v_mapping.occupant_type,
      'apartment_id', v_mapping.apartment_id,
      'block_id', v_mapping.block_id,
      'flat_id', v_mapping.flat_id
    )
  );
END;
$function$;
