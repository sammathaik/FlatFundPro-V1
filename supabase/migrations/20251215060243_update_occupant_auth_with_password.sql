/*
  # Update Occupant Authentication with Password

  ## Changes
  - Update verify_occupant_otp to set a password for new auth users
  - Password is derived from user_id for security
  - Allows subsequent sign-ins with Supabase auth
*/

CREATE OR REPLACE FUNCTION public.verify_occupant_otp(p_email text, p_otp text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_mapping RECORD;
  v_user_id uuid;
  v_user_exists boolean;
  v_password text;
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
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = LOWER(p_email);

  IF v_user_id IS NULL THEN
    -- Generate user_id first
    v_user_id := gen_random_uuid();
    v_password := 'otp_verified_' || v_user_id::text;
    
    -- Create auth user with password
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      instance_id,
      confirmation_token
    ) VALUES (
      v_user_id,
      LOWER(p_email),
      crypt(v_password, gen_salt('bf')),
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
      '00000000-0000-0000-0000-000000000000',
      ''
    );

    -- Create identity record
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      'email',
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', LOWER(p_email),
        'email_verified', true
      ),
      NOW(),
      NOW(),
      NOW()
    );
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
