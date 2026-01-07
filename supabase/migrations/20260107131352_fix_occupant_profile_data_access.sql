/*
  # Fix Occupant Profile Data Access

  ## Problem
  
  After security fix that removed anonymous access to flat_email_mappings,
  occupants can no longer view their own profile data (name, email, mobile).
  
  This is because occupants use a custom session system (occupant_sessions) 
  instead of Supabase Auth, so they appear as anonymous users to RLS policies.
  
  ## Solution
  
  Create a secure RPC function that:
  1. Validates the occupant session token
  2. Returns profile data for the specific flat_id they have access to
  3. Uses SECURITY DEFINER to bypass RLS while maintaining security
  
  ## Security
  
  - Function validates session before returning any data
  - Only returns data for flats the occupant has access to via their session
  - No bulk data exposure - single flat at a time
  - Session-based access control maintained
*/

-- ============================================================================
-- Function: Get occupant profile data for a specific flat
-- ============================================================================

CREATE OR REPLACE FUNCTION get_occupant_profile_for_flat(
  p_session_token TEXT,
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
  v_session_apartment_id UUID;
  v_flat_apartment_id UUID;
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
  
  -- Return the profile data for this occupant + flat combination
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
    AND fem.mobile = v_session_mobile
    AND fem.apartment_id = v_session_apartment_id
  LIMIT 1;
  
  -- If no record found, return NULL row
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$;

-- ============================================================================
-- Grant execute permission to anonymous users (they have session tokens)
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_occupant_profile_for_flat(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_occupant_profile_for_flat(TEXT, UUID) TO authenticated;

-- ============================================================================
-- Add helpful comment
-- ============================================================================

COMMENT ON FUNCTION get_occupant_profile_for_flat IS 
  'Securely retrieves occupant profile data for a specific flat using session validation. 
   Used by occupant portal to display profile information without exposing bulk data.';
