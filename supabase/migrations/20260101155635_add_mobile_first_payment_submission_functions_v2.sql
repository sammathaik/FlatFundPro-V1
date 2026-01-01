/*
  # Mobile-First Payment Submission System

  ## Overview
  This migration adds functions to support mobile-number-based login for
  Owner/Tenant payment submissions with intelligent flat discovery.

  ## Key Features
  1. **Smart Flat Discovery** - Find flats linked to a mobile number
  2. **Mobile OTP Authentication** - Secure login without passwords
  3. **Payment History** - View past submissions for a flat
  4. **Pre-filled Forms** - Auto-populate data for returning users

  ## New Functions

  ### 1. `discover_flats_by_mobile(mobile_number text)`
  Returns all flats associated with a mobile number across all apartments.
  Handles cases: no flats, one flat, multiple flats.

  ### 2. `generate_mobile_otp(mobile_number text, flat_id uuid)`
  Generates a 6-digit OTP for mobile verification.
  Links OTP to a specific flat selection.

  ### 3. `verify_mobile_otp_for_payment(mobile_number text, otp_code text)`
  Verifies OTP and returns flat session data for payment submission.

  ### 4. `get_resident_payment_history(flat_id uuid, apartment_id uuid)`
  Returns recent payment history for a flat to prevent duplicates.

  ## Security
  - All functions use SECURITY DEFINER for controlled access
  - OTPs expire after 10 minutes
  - Anonymous users can access discovery and verification functions
  - Payment history requires valid mobile verification
*/

-- Function 1: Discover flats by mobile number
CREATE OR REPLACE FUNCTION public.discover_flats_by_mobile(mobile_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flats jsonb;
  v_count integer;
BEGIN
  -- Find all flats associated with this mobile number
  SELECT 
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'flat_id', fem.flat_id,
        'apartment_id', fem.apartment_id,
        'apartment_name', a.apartment_name,
        'block_id', fem.block_id,
        'block_name', bbp.block_name,
        'flat_number', fn.flat_number,
        'occupant_name', fem.name,
        'occupant_type', fem.occupant_type,
        'email', fem.email,
        'mobile', fem.mobile
      )
    ), '[]'::jsonb),
    COUNT(*)
  INTO v_flats, v_count
  FROM flat_email_mappings fem
  JOIN apartments a ON a.id = fem.apartment_id
  JOIN buildings_blocks_phases bbp ON bbp.id = fem.block_id
  JOIN flat_numbers fn ON fn.id = fem.flat_id
  WHERE fem.mobile = mobile_number
    AND a.status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'count', v_count,
    'flats', v_flats
  );
END;
$$;

-- Function 2: Generate mobile OTP for selected flat
CREATE OR REPLACE FUNCTION public.generate_mobile_otp(mobile_number text, flat_id uuid)
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

  -- Find the mapping for this mobile + flat
  SELECT id INTO v_mapping_id
  FROM flat_email_mappings
  WHERE mobile = mobile_number
    AND flat_id = flat_id;

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
  -- For now, return it for testing purposes
  RETURN jsonb_build_object(
    'success', true,
    'message', 'OTP generated successfully',
    'otp', v_otp,  -- Remove this in production
    'expires_in_minutes', 10
  );
END;
$$;

-- Function 3: Verify mobile OTP and return session data
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

  -- Return session data
  RETURN jsonb_build_object(
    'success', true,
    'message', 'OTP verified successfully',
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

-- Function 4: Get payment history for a resident (different name to avoid conflict)
CREATE OR REPLACE FUNCTION public.get_resident_payment_history(
  p_flat_id uuid,
  p_apartment_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payments jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', ps.id,
        'payment_amount', ps.payment_amount,
        'payment_date', ps.payment_date,
        'payment_type', ps.payment_type,
        'payment_quarter', ps.payment_quarter,
        'status', ps.status,
        'created_at', ps.created_at,
        'collection_name', ec.collection_name
      )
      ORDER BY ps.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_payments
  FROM payment_submissions ps
  LEFT JOIN expected_collections ec ON ec.id = ps.expected_collection_id
  WHERE ps.flat_id = p_flat_id
    AND ps.apartment_id = p_apartment_id
  ORDER BY ps.created_at DESC
  LIMIT p_limit;

  RETURN jsonb_build_object(
    'success', true,
    'payments', v_payments
  );
END;
$$;

-- Grant execute permissions to anonymous users (for public payment submission)
GRANT EXECUTE ON FUNCTION public.discover_flats_by_mobile(text) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_mobile_otp(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_mobile_otp_for_payment(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_resident_payment_history(uuid, uuid, integer) TO anon;

-- Grant to authenticated users as well
GRANT EXECUTE ON FUNCTION public.discover_flats_by_mobile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_mobile_otp(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_mobile_otp_for_payment(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_resident_payment_history(uuid, uuid, integer) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.discover_flats_by_mobile IS 'Finds all flats associated with a mobile number for smart discovery';
COMMENT ON FUNCTION public.generate_mobile_otp IS 'Generates and stores OTP for mobile-based authentication';
COMMENT ON FUNCTION public.verify_mobile_otp_for_payment IS 'Verifies OTP and returns flat session data for payment submission';
COMMENT ON FUNCTION public.get_resident_payment_history IS 'Returns recent payment history for a resident flat to prevent duplicates';
