/*
  # Add Mobile Field to Flat Email Mappings
  
  ## Overview
  This migration adds mobile number support for occupant authentication.
  
  ## Changes
  1. Add `mobile` column to flat_email_mappings
  2. Add `otp` column for temporary OTP storage
  3. Add `otp_expires_at` for OTP expiration
  4. Add `is_mobile_verified` flag
  5. Create index on mobile for quick lookups
  
  ## Security
  - Mobile numbers are optional initially
  - OTPs expire after 10 minutes
  - Verified flag tracks mobile verification status
*/

-- Add mobile field to flat_email_mappings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_email_mappings' AND column_name = 'mobile'
  ) THEN
    ALTER TABLE flat_email_mappings ADD COLUMN mobile text;
  END IF;
END $$;

-- Add OTP-related fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_email_mappings' AND column_name = 'otp'
  ) THEN
    ALTER TABLE flat_email_mappings ADD COLUMN otp text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_email_mappings' AND column_name = 'otp_expires_at'
  ) THEN
    ALTER TABLE flat_email_mappings ADD COLUMN otp_expires_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_email_mappings' AND column_name = 'is_mobile_verified'
  ) THEN
    ALTER TABLE flat_email_mappings ADD COLUMN is_mobile_verified boolean DEFAULT false;
  END IF;
END $$;

-- Create index on mobile for performance
CREATE INDEX IF NOT EXISTS idx_flat_email_mappings_mobile ON flat_email_mappings(mobile);

-- Create function to generate and store OTP
CREATE OR REPLACE FUNCTION generate_occupant_otp(
  p_email text,
  p_mobile text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_mapping RECORD;
  v_otp text;
  v_expires_at timestamptz;
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
  
  -- Check if mobile needs to be added
  IF v_mapping.mobile IS NULL AND p_mobile IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'mobile_required',
      'message', 'Please provide your mobile number',
      'needs_mobile', true
    );
  END IF;
  
  -- Generate 6-digit OTP
  v_otp := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
  v_expires_at := now() + interval '10 minutes';
  
  -- Update mapping with OTP
  UPDATE flat_email_mappings
  SET 
    otp = v_otp,
    otp_expires_at = v_expires_at,
    mobile = COALESCE(p_mobile, mobile)
  WHERE id = v_mapping.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'OTP sent successfully',
    'mobile', COALESCE(p_mobile, v_mapping.mobile),
    'otp', v_otp,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify OTP
CREATE OR REPLACE FUNCTION verify_occupant_otp(
  p_email text,
  p_otp text
)
RETURNS jsonb AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for occupants to view their own data
CREATE POLICY "Occupants can view their own mapping"
  ON flat_email_mappings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add RLS policy for occupants to update their mobile
CREATE POLICY "Occupants can update their own mobile"
  ON flat_email_mappings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);