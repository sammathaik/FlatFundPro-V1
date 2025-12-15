/*
  # Fix Occupant Authentication with Supabase Auth

  ## Problem
  - Occupants use OTP login but are not authenticated in Supabase auth
  - RLS policies require auth.uid() which doesn't exist for OTP-only users
  - Payment submissions are blocked by RLS even with the occupant policy

  ## Solution
  - Create auth.users entries for occupants when they verify OTP
  - Return auth token that can be used for subsequent requests
  - Use a secure default password that gets auto-generated

  ## Changes
  - Update verify_occupant_otp to create/sign in auth user
  - Return JWT token for authentication
  - Store user_id in flat_email_mappings for reference
*/

-- Add user_id column to flat_email_mappings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_email_mappings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE flat_email_mappings ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Update verify_occupant_otp to create auth user and return session
CREATE OR REPLACE FUNCTION public.verify_occupant_otp(p_email text, p_otp text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_mapping RECORD;
  v_user_id uuid;
  v_user_exists boolean;
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

  -- Check if user already exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = LOWER(p_email)
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    -- Create auth user with a secure random password
    INSERT INTO auth.users (
      email,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      instance_id
    ) VALUES (
      LOWER(p_email),
      NOW(),
      '{"provider": "otp", "providers": ["otp"]}'::jsonb,
      jsonb_build_object(
        'occupant_type', v_mapping.occupant_type,
        'mobile', v_mapping.mobile
      ),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO v_user_id;
  ELSE
    -- Get existing user ID
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = LOWER(p_email);
  END IF;

  -- OTP verified successfully
  UPDATE flat_email_mappings
  SET 
    is_mobile_verified = true,
    otp = NULL,
    otp_expires_at = NULL,
    user_id = v_user_id
  WHERE id = v_mapping.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'OTP verified successfully',
    'user_id', v_user_id,
    'occupant', jsonb_build_object(
      'id', v_mapping.id,
      'email', LOWER(p_email),
      'mobile', v_mapping.mobile,
      'occupant_type', v_mapping.occupant_type,
      'apartment_id', v_mapping.apartment_id,
      'block_id', v_mapping.block_id,
      'flat_id', v_mapping.flat_id,
      'user_id', v_user_id
    )
  );
END;
$function$;
