/*
  # Add Occupant Profile Update Functions

  ## Problem
  
  Occupants need to be able to update their own profile data (WhatsApp opt-in, 
  email, name, mobile) but the security fixes removed direct UPDATE access to 
  flat_email_mappings for anonymous users.
  
  ## Solution
  
  Create secure RPC functions that:
  1. Validate the occupant session token
  2. Allow updates only to their own flat_email_mappings record
  3. Use SECURITY DEFINER to bypass RLS while maintaining security
  
  ## Security
  
  - Functions validate session before allowing any updates
  - Only allows updates to the occupant's own records
  - Cannot modify other occupants' data
  - Session-based access control maintained
*/

-- ============================================================================
-- Function: Update WhatsApp opt-in preference
-- ============================================================================

CREATE OR REPLACE FUNCTION update_occupant_whatsapp_preference(
  p_session_token TEXT,
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
  v_session_apartment_id UUID;
  v_flat_apartment_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Validate session and get mobile number
  SELECT mobile, apartment_id
  INTO v_session_mobile, v_session_apartment_id
  FROM occupant_sessions
  WHERE session_token = p_session_token
    AND expires_at > NOW()
    AND is_active = true;
  
  IF v_session_mobile IS NULL THEN
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
    AND mobile = v_session_mobile
    AND apartment_id = v_session_apartment_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count > 0;
END;
$$;

-- ============================================================================
-- Function: Update occupant profile (email, name, mobile)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_occupant_profile(
  p_session_token TEXT,
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
  v_session_apartment_id UUID;
  v_flat_apartment_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Validate session and get mobile number
  SELECT mobile, apartment_id
  INTO v_session_mobile, v_session_apartment_id
  FROM occupant_sessions
  WHERE session_token = p_session_token
    AND expires_at > NOW()
    AND is_active = true;
  
  IF v_session_mobile IS NULL THEN
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
    AND mobile = v_session_mobile
    AND apartment_id = v_session_apartment_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count > 0;
END;
$$;

-- ============================================================================
-- Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION update_occupant_whatsapp_preference(TEXT, UUID, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION update_occupant_whatsapp_preference(TEXT, UUID, BOOLEAN) TO authenticated;

GRANT EXECUTE ON FUNCTION update_occupant_profile(TEXT, UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_occupant_profile(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION update_occupant_whatsapp_preference IS 
  'Securely updates WhatsApp opt-in preference for an occupant using session validation.';

COMMENT ON FUNCTION update_occupant_profile IS 
  'Securely updates occupant profile data (email, name, mobile) using session validation.';
