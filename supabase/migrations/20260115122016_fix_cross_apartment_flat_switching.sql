/*
  # Fix Cross-Apartment Flat Switching for Multi-Flat Users

  ## Problem

  When a user has flats in MULTIPLE apartments (e.g., mobile +919111111111):
  - Flat A-101 in Esteem Enclave
  - Flat T-10 in OutSkill Housing Society

  The session is created with ONE apartment_id (from the initially selected flat).
  
  When switching to a flat in a DIFFERENT apartment, the RPC function fails:
  ```
  IF v_flat_apartment_id != v_session_apartment_id THEN
    RAISE EXCEPTION 'Access denied: flat does not belong to your apartment';
  END IF;
  ```

  This prevents cross-apartment flat switching and shows incorrect profile data.

  ## Solution

  1. Remove apartment_id restriction from profile RPC functions
  2. Validate only that:
     - Mobile number from session matches the flat
     - The flat exists and is active
  3. Allow users to access ANY flat where their mobile is registered

  ## Changes

  - Update get_occupant_profile_for_flat to remove apartment check
  - Update update_occupant_whatsapp_preference to remove apartment check
  - Update update_occupant_profile to remove apartment check
  - Keep mobile validation as the primary security check

  ## Security

  - Still validates session is not expired
  - Still validates mobile matches the flat
  - Only returns data for flats where mobile is registered
  - No data leakage across different mobile numbers
*/

-- ============================================================================
-- Fix: Get occupant profile data for any flat with matching mobile
-- ============================================================================

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
  v_session_mobile TEXT;
BEGIN
  -- Validate session and get MOBILE
  SELECT os.mobile
  INTO v_session_mobile
  FROM occupant_sessions os
  WHERE os.id = p_session_token
    AND os.expires_at > NOW();
  
  IF v_session_mobile IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired session';
  END IF;
  
  -- Verify the flat exists
  IF NOT EXISTS (SELECT 1 FROM flat_numbers WHERE id = p_flat_id) THEN
    RAISE EXCEPTION 'Invalid flat ID';
  END IF;
  
  -- Return the profile data for this flat + mobile combination
  -- No apartment restriction - user can access ANY flat where their mobile is registered
  RETURN QUERY
  SELECT 
    fem.name,
    fem.email,
    fem.mobile,
    fem.occupant_type,
    COALESCE(fem.whatsapp_opt_in, false) as whatsapp_opt_in,
    fem.apartment_id
  FROM flat_email_mappings fem
  JOIN flat_numbers fn ON fn.id = fem.flat_id
  JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
  JOIN apartments a ON a.id = bbp.apartment_id
  WHERE fem.flat_id = p_flat_id
    AND fem.mobile = v_session_mobile
    AND a.status = 'active'
  LIMIT 1;
END;
$$;

-- ============================================================================
-- Fix: Update WhatsApp opt-in for any flat with matching mobile
-- ============================================================================

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
  v_session_mobile TEXT;
  v_updated_count INTEGER;
BEGIN
  -- Validate session and get MOBILE
  SELECT os.mobile
  INTO v_session_mobile
  FROM occupant_sessions os
  WHERE os.id = p_session_token
    AND os.expires_at > NOW();
  
  IF v_session_mobile IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired session';
  END IF;
  
  -- Verify the flat exists
  IF NOT EXISTS (SELECT 1 FROM flat_numbers WHERE id = p_flat_id) THEN
    RAISE EXCEPTION 'Invalid flat ID';
  END IF;
  
  -- Update WhatsApp preference for this flat + mobile combination
  -- No apartment restriction - user can update ANY flat where their mobile is registered
  UPDATE flat_email_mappings fem
  SET 
    whatsapp_opt_in = p_whatsapp_opt_in,
    updated_at = NOW()
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
  JOIN apartments a ON a.id = bbp.apartment_id
  WHERE fem.flat_id = p_flat_id
    AND fem.mobile = v_session_mobile
    AND a.status = 'active'
    AND fem.flat_id = fn.id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count > 0;
END;
$$;

-- ============================================================================
-- Fix: Update occupant profile for any flat with matching mobile
-- ============================================================================

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
  v_session_mobile TEXT;
  v_updated_count INTEGER;
BEGIN
  -- Validate session and get MOBILE
  SELECT os.mobile
  INTO v_session_mobile
  FROM occupant_sessions os
  WHERE os.id = p_session_token
    AND os.expires_at > NOW();
  
  IF v_session_mobile IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired session';
  END IF;
  
  -- Verify the flat exists
  IF NOT EXISTS (SELECT 1 FROM flat_numbers WHERE id = p_flat_id) THEN
    RAISE EXCEPTION 'Invalid flat ID';
  END IF;
  
  -- Update profile for this flat + mobile combination
  -- No apartment restriction - user can update ANY flat where their mobile is registered
  -- Only update fields that are provided (not null)
  UPDATE flat_email_mappings fem
  SET 
    email = COALESCE(p_email, fem.email),
    name = COALESCE(p_name, fem.name),
    mobile = COALESCE(p_mobile, fem.mobile),
    updated_at = NOW()
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
  JOIN apartments a ON a.id = bbp.apartment_id
  WHERE fem.flat_id = p_flat_id
    AND fem.mobile = v_session_mobile
    AND a.status = 'active'
    AND fem.flat_id = fn.id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count > 0;
END;
$$;

-- ============================================================================
-- Grant execute permissions (refresh grants)
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_occupant_profile_for_flat(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_occupant_profile_for_flat(UUID, UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION update_occupant_whatsapp_preference(UUID, UUID, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION update_occupant_whatsapp_preference(UUID, UUID, BOOLEAN) TO authenticated;

GRANT EXECUTE ON FUNCTION update_occupant_profile(UUID, UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_occupant_profile(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION get_occupant_profile_for_flat IS 
'Returns profile data for a flat based on session mobile. Supports cross-apartment access for multi-flat users.';

COMMENT ON FUNCTION update_occupant_whatsapp_preference IS 
'Updates WhatsApp preference for a flat based on session mobile. Supports cross-apartment access for multi-flat users.';

COMMENT ON FUNCTION update_occupant_profile IS 
'Updates profile data for a flat based on session mobile. Supports cross-apartment access for multi-flat users.';
