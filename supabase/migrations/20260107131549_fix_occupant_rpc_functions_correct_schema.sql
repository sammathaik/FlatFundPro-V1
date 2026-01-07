/*
  # Fix Occupant RPC Functions to Use Correct Schema

  ## Problem
  
  The previously created RPC functions referenced columns that don't exist
  in occupant_sessions table:
  - mobile (doesn't exist)
  - is_active (doesn't exist)
  - session_token (the ID itself IS the session token)
  
  ## Solution
  
  Fix the functions to:
  1. Use the session ID directly (no session_token column)
  2. Get mobile from flat_email_mappings using the session's email + flat_id
  3. Remove reference to non-existent is_active column
*/

-- ============================================================================
-- Drop and recreate: Get occupant profile data for a specific flat
-- ============================================================================

DROP FUNCTION IF EXISTS get_occupant_profile_for_flat(TEXT, UUID);

CREATE OR REPLACE FUNCTION get_occupant_profile_for_flat(
  p_session_token UUID,
  p_flat_id UUID
)
RETURNS TABLE (
  name TEXT,
  email TEXT,
  mobile TEXT,
  occupant_type TEXT,
  whatsapp_opt_in BOOLEAN,
  apartment_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_email TEXT;
  v_session_apartment_id UUID;
  v_flat_apartment_id UUID;
BEGIN
  -- Validate session and get email
  SELECT os.email, os.apartment_id
  INTO v_session_email, v_session_apartment_id
  FROM occupant_sessions os
  WHERE os.id = p_session_token
    AND os.expires_at > NOW();
  
  IF v_session_email IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired session';
  END IF;
  
  -- Verify the flat belongs to the session's apartment
  SELECT bbp.apartment_id
  INTO v_flat_apartment_id
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
  WHERE fn.id = p_flat_id;
  
  IF v_flat_apartment_id IS NULL THEN
    RAISE EXCEPTION 'Invalid flat ID';
  END IF;
  
  IF v_flat_apartment_id != v_session_apartment_id THEN
    RAISE EXCEPTION 'Access denied: flat does not belong to your apartment';
  END IF;
  
  -- Return the profile data for this occupant + flat combination
  -- Get mobile from flat_email_mappings (not from occupant_sessions)
  RETURN QUERY
  SELECT 
    fem.name,
    fem.email,
    fem.mobile,
    fem.occupant_type,
    COALESCE(fem.whatsapp_opt_in, false) as whatsapp_opt_in,
    fem.apartment_id
  FROM flat_email_mappings fem
  WHERE fem.flat_id = p_flat_id
    AND fem.email = v_session_email
    AND fem.apartment_id = v_session_apartment_id
  LIMIT 1;
  
  -- If no record found, return NULL row
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$;

-- ============================================================================
-- Drop and recreate: Update WhatsApp opt-in preference
-- ============================================================================

DROP FUNCTION IF EXISTS update_occupant_whatsapp_preference(TEXT, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION update_occupant_whatsapp_preference(
  p_session_token UUID,
  p_flat_id UUID,
  p_whatsapp_opt_in BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_email TEXT;
  v_session_apartment_id UUID;
  v_flat_apartment_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Validate session and get email
  SELECT os.email, os.apartment_id
  INTO v_session_email, v_session_apartment_id
  FROM occupant_sessions os
  WHERE os.id = p_session_token
    AND os.expires_at > NOW();
  
  IF v_session_email IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired session';
  END IF;
  
  -- Verify the flat belongs to the session's apartment
  SELECT bbp.apartment_id
  INTO v_flat_apartment_id
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
  WHERE fn.id = p_flat_id;
  
  IF v_flat_apartment_id IS NULL THEN
    RAISE EXCEPTION 'Invalid flat ID';
  END IF;
  
  IF v_flat_apartment_id != v_session_apartment_id THEN
    RAISE EXCEPTION 'Access denied: flat does not belong to your apartment';
  END IF;
  
  -- Update WhatsApp preference for this occupant + flat combination
  UPDATE flat_email_mappings
  SET 
    whatsapp_opt_in = p_whatsapp_opt_in,
    updated_at = NOW()
  WHERE flat_id = p_flat_id
    AND email = v_session_email
    AND apartment_id = v_session_apartment_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count > 0;
END;
$$;

-- ============================================================================
-- Drop and recreate: Update occupant profile (email, name, mobile)
-- ============================================================================

DROP FUNCTION IF EXISTS update_occupant_profile(TEXT, UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION update_occupant_profile(
  p_session_token UUID,
  p_flat_id UUID,
  p_email TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_mobile TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_email TEXT;
  v_session_apartment_id UUID;
  v_flat_apartment_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Validate session and get email
  SELECT os.email, os.apartment_id
  INTO v_session_email, v_session_apartment_id
  FROM occupant_sessions os
  WHERE os.id = p_session_token
    AND os.expires_at > NOW();
  
  IF v_session_email IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired session';
  END IF;
  
  -- Verify the flat belongs to the session's apartment
  SELECT bbp.apartment_id
  INTO v_flat_apartment_id
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
  WHERE fn.id = p_flat_id;
  
  IF v_flat_apartment_id IS NULL THEN
    RAISE EXCEPTION 'Invalid flat ID';
  END IF;
  
  IF v_flat_apartment_id != v_session_apartment_id THEN
    RAISE EXCEPTION 'Access denied: flat does not belong to your apartment';
  END IF;
  
  -- Update profile for this occupant + flat combination
  -- Only update fields that are provided (not null)
  UPDATE flat_email_mappings
  SET 
    email = COALESCE(p_email, email),
    name = COALESCE(p_name, name),
    mobile = COALESCE(p_mobile, mobile),
    updated_at = NOW()
  WHERE flat_id = p_flat_id
    AND email = v_session_email
    AND apartment_id = v_session_apartment_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count > 0;
END;
$$;

-- ============================================================================
-- Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_occupant_profile_for_flat(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_occupant_profile_for_flat(UUID, UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION update_occupant_whatsapp_preference(UUID, UUID, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION update_occupant_whatsapp_preference(UUID, UUID, BOOLEAN) TO authenticated;

GRANT EXECUTE ON FUNCTION update_occupant_profile(UUID, UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_occupant_profile(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
