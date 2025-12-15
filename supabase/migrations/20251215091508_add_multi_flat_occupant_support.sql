/*
  # Add Multi-Flat Occupant Support

  ## Overview
  Enables occupants who own multiple flats to view all their flats and segregate payment history by flat.

  ## Changes Made

  1. **Updated Function: generate_occupant_otp**
     - Now validates using BOTH email AND mobile (when mobile is provided)
     - Finds ALL flats matching the email+mobile combination
     - Returns list of flats if multiple exist
  
  2. **Updated Function: verify_occupant_otp**
     - Now accepts optional flat_id parameter for multi-flat owners
     - Creates session for the selected flat
     - Returns list of all flats owned by the occupant
  
  3. **Updated Function: get_occupant_from_session**
     - Returns all flats associated with the occupant's email+mobile
     - Allows dashboard to show flat selector
  
  4. **New Function: get_occupant_flats**
     - Returns all flats for a given email+mobile combination
     - Used during login to show flat selection
  
  ## Security Notes
  - Email + Mobile combination is the key validation
  - Session token remains valid for 24 hours
  - Each flat's payments remain segregated
  - RLS policies ensure data isolation
*/

-- Function to get all flats for an occupant (email + mobile combination)
CREATE OR REPLACE FUNCTION get_occupant_flats(p_email text, p_mobile text)
RETURNS TABLE(
  flat_id uuid,
  apartment_id uuid,
  block_id uuid,
  flat_number text,
  block_name text,
  apartment_name text,
  occupant_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fem.flat_id,
    fem.apartment_id,
    fem.block_id,
    fn.flat_number,
    bbp.block_name,
    a.apartment_name,
    fem.occupant_type
  FROM flat_email_mappings fem
  INNER JOIN flat_numbers fn ON fn.id = fem.flat_id
  INNER JOIN buildings_blocks_phases bbp ON bbp.id = fem.block_id
  INNER JOIN apartments a ON a.id = fem.apartment_id
  WHERE LOWER(fem.email) = LOWER(p_email)
    AND fem.mobile = p_mobile;
END;
$$;

-- Update generate_occupant_otp to support multi-flat validation
CREATE OR REPLACE FUNCTION generate_occupant_otp(
  p_email text,
  p_mobile text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_mappings_count integer;
  v_mapping RECORD;
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
  
  -- If mobile is provided, validate it matches
  IF p_mobile IS NOT NULL THEN
    SELECT COUNT(*) INTO v_mappings_count
    FROM flat_email_mappings
    WHERE LOWER(email) = LOWER(p_email)
      AND mobile = p_mobile;
    
    IF v_mappings_count = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'mobile_mismatch',
        'message', 'Mobile number does not match our records for this email'
      );
    END IF;
  ELSE
    -- Check if mobile is required (any mapping has mobile)
    SELECT mobile INTO v_mapping
    FROM flat_email_mappings
    WHERE LOWER(email) = LOWER(p_email)
    LIMIT 1;
    
    IF v_mapping.mobile IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'mobile_required',
        'message', 'Please provide your mobile number',
        'needs_mobile', true
      );
    END IF;
    
    -- Get mobile from the first mapping for OTP generation
    p_mobile := v_mapping.mobile;
  END IF;
  
  -- Generate 6-digit OTP
  v_otp := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
  v_expires_at := now() + interval '10 minutes';
  
  -- Update ALL mappings with same email+mobile with the OTP
  UPDATE flat_email_mappings
  SET 
    otp = v_otp,
    otp_expires_at = v_expires_at,
    updated_at = now()
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

-- Update verify_occupant_otp to handle multi-flat occupants
DROP FUNCTION IF EXISTS verify_occupant_otp(text, text);

CREATE FUNCTION verify_occupant_otp(
  p_email text,
  p_otp text,
  p_flat_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mapping flat_email_mappings;
  v_session_id uuid;
  v_flats jsonb;
  v_mappings_count integer;
BEGIN
  -- Find valid OTP for this email
  SELECT * INTO v_mapping
  FROM flat_email_mappings
  WHERE LOWER(email) = LOWER(p_email)
    AND otp = p_otp
    AND otp_expires_at > now()
  LIMIT 1;

  -- Check if OTP is valid
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid or expired OTP'
    );
  END IF;
  
  -- Count how many flats this occupant has
  SELECT COUNT(*) INTO v_mappings_count
  FROM flat_email_mappings
  WHERE LOWER(email) = LOWER(p_email)
    AND mobile = v_mapping.mobile;
  
  -- If multiple flats and no flat_id provided, ask user to select
  IF v_mappings_count > 1 AND p_flat_id IS NULL THEN
    -- Get all flats
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
      AND fem.mobile = v_mapping.mobile;
    
    RETURN json_build_object(
      'success', false,
      'needs_flat_selection', true,
      'message', 'Please select which flat you want to view',
      'flats', v_flats,
      'email', p_email,
      'mobile', v_mapping.mobile
    );
  END IF;
  
  -- If flat_id provided, validate it belongs to this occupant
  IF p_flat_id IS NOT NULL THEN
    SELECT * INTO v_mapping
    FROM flat_email_mappings
    WHERE LOWER(email) = LOWER(p_email)
      AND mobile = v_mapping.mobile
      AND flat_id = p_flat_id;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Invalid flat selection'
      );
    END IF;
  END IF;

  -- Mark mobile as verified if not already
  UPDATE flat_email_mappings
  SET is_mobile_verified = true,
      updated_at = now()
  WHERE LOWER(email) = LOWER(p_email)
    AND mobile = v_mapping.mobile
    AND NOT is_mobile_verified;

  -- Clear the OTP for all flats with this email+mobile
  UPDATE flat_email_mappings
  SET otp = NULL,
      otp_expires_at = NULL
  WHERE LOWER(email) = LOWER(p_email)
    AND mobile = v_mapping.mobile;

  -- Get all flats for this occupant
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
    AND fem.mobile = v_mapping.mobile;

  -- Create a new session for the selected flat
  INSERT INTO occupant_sessions (flat_id, apartment_id, block_id, email)
  VALUES (v_mapping.flat_id, v_mapping.apartment_id, v_mapping.block_id, v_mapping.email)
  RETURNING id INTO v_session_id;

  -- Return success with session token and all flats
  RETURN json_build_object(
    'success', true,
    'session_token', v_session_id,
    'occupant', json_build_object(
      'flat_id', v_mapping.flat_id,
      'apartment_id', v_mapping.apartment_id,
      'block_id', v_mapping.block_id,
      'email', v_mapping.email,
      'mobile', v_mapping.mobile,
      'occupant_type', v_mapping.occupant_type,
      'all_flats', v_flats,
      'has_multiple_flats', v_mappings_count > 1
    )
  );
END;
$$;

-- Drop the RLS policy that depends on get_occupant_from_session
DROP POLICY IF EXISTS "Occupants can view their own payments" ON payment_submissions;

-- Drop and recreate get_occupant_from_session with new return type
DROP FUNCTION IF EXISTS get_occupant_from_session(uuid);

CREATE FUNCTION get_occupant_from_session(session_token uuid)
RETURNS TABLE(
  flat_id uuid,
  apartment_id uuid,
  block_id uuid,
  email text,
  mobile text,
  all_flats jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_mobile text;
  v_flats jsonb;
BEGIN
  -- Get session details
  SELECT * INTO v_session
  FROM occupant_sessions
  WHERE id = session_token
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get mobile from flat_email_mappings
  SELECT fem.mobile INTO v_mobile
  FROM flat_email_mappings fem
  WHERE fem.flat_id = v_session.flat_id
  LIMIT 1;
  
  -- Get all flats for this occupant's email + mobile
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
  WHERE LOWER(fem.email) = LOWER(v_session.email)
    AND fem.mobile = v_mobile;
  
  RETURN QUERY
  SELECT 
    v_session.flat_id,
    v_session.apartment_id,
    v_session.block_id,
    v_session.email,
    v_mobile,
    v_flats;
END;
$$;

-- Recreate the RLS policy with updated function signature
CREATE POLICY "Occupants can view their own payments"
  ON payment_submissions
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM get_occupant_from_session(
        NULLIF(current_setting('request.headers', true)::json->>'x-session-token', '')::uuid
      ) AS session
      WHERE session.flat_id = payment_submissions.flat_id
        AND session.apartment_id = payment_submissions.apartment_id
        AND session.block_id = payment_submissions.block_id
    )
  );

COMMENT ON FUNCTION get_occupant_flats IS 'Returns all flats owned by an occupant (identified by email + mobile)';
COMMENT ON FUNCTION generate_occupant_otp IS 'Generates OTP for occupant login. Validates email + mobile and handles multi-flat owners.';
COMMENT ON FUNCTION verify_occupant_otp IS 'Verifies OTP and creates session. Handles flat selection for multi-flat owners.';
COMMENT ON FUNCTION get_occupant_from_session IS 'Gets occupant details from session token, including all their flats.';
