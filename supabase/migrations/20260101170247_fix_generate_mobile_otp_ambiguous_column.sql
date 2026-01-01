/*
  # Fix Ambiguous Column Reference in generate_mobile_otp
  
  ## Issue
  The `generate_mobile_otp` function has an ambiguous column reference:
  - Parameter name `flat_id` conflicts with table column `flat_email_mappings.flat_id`
  - PostgreSQL error: "column reference 'flat_id' is ambiguous"
  
  ## Fix
  1. Drop the existing function
  2. Recreate with parameter renamed to `p_flat_id` to avoid ambiguity
  
  This is a best practice for PostgreSQL functions to prefix parameters with `p_`.
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS public.generate_mobile_otp(text, uuid);

-- Recreate the function with proper parameter naming
CREATE OR REPLACE FUNCTION public.generate_mobile_otp(
  mobile_number text, 
  p_flat_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_otp text;
  v_mapping_id uuid;
BEGIN
  -- Generate 6-digit OTP
  v_otp := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');

  -- Find the mapping for this mobile + flat (now unambiguous)
  SELECT id INTO v_mapping_id
  FROM flat_email_mappings
  WHERE mobile = mobile_number
    AND flat_id = p_flat_id;

  IF v_mapping_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'flat_not_found',
      'message', 'No mapping found for this mobile number and flat'
    );
  END IF;

  -- Update the mapping with OTP
  UPDATE flat_email_mappings
  SET 
    otp = v_otp,
    otp_expires_at = NOW() + INTERVAL '10 minutes',
    updated_at = NOW()
  WHERE id = v_mapping_id;

  -- In production, this OTP would be sent via SMS
  -- For development/testing, return it in the response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'OTP generated successfully',
    'otp', v_otp,  -- Remove this line in production
    'expires_in_minutes', 10
  );
END;
$$;

-- Re-grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_mobile_otp(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_mobile_otp(text, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.generate_mobile_otp IS 'Generates and stores OTP for mobile-based authentication';
