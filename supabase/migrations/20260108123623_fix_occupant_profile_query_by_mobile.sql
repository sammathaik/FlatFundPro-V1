/*
  # Fix Occupant Profile to Query by Mobile Instead of Email

  ## Problem
  
  When a user logs in with mobile, they have access to multiple flats with DIFFERENT emails:
  - S-100: email = trisha.sam@flame.edu.in
  - G-100: email = sammathaik1@gmail.com
  
  But the session is created with ONE email address.
  
  The RPC function `get_occupant_profile_for_flat` queries:
  ```sql
  WHERE fem.flat_id = p_flat_id
    AND fem.email = v_session_email
  ```
  
  This fails when switching flats because:
  - Session has email "trisha.sam@flame.edu.in"
  - G-100 has email "sammathaik1@gmail.com" 
  - Query returns NO RESULTS
  
  ## Solution
  
  Change the query to use MOBILE instead of EMAIL because:
  1. Users log in with MOBILE
  2. Mobile is shared across all their flats
  3. Each flat has a different email but same mobile
  
  ## Changes
  
  1. Add mobile column to occupant_sessions table
  2. Update get_occupant_profile_for_flat to query by mobile
  3. Update other RPC functions to use mobile
*/

-- ============================================================================
-- Add mobile column to occupant_sessions if not exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'occupant_sessions' AND column_name = 'mobile'
  ) THEN
    ALTER TABLE occupant_sessions ADD COLUMN mobile TEXT;
    
    -- Create index for faster mobile lookups
    CREATE INDEX IF NOT EXISTS idx_occupant_sessions_mobile 
    ON occupant_sessions(mobile);
  END IF;
END $$;

-- ============================================================================
-- Update existing sessions to include mobile from flat_email_mappings
-- ============================================================================

UPDATE occupant_sessions os
SET mobile = (
  SELECT DISTINCT fem.mobile
  FROM flat_email_mappings fem
  WHERE fem.email = os.email
  LIMIT 1
)
WHERE mobile IS NULL;

-- ============================================================================
-- Drop and recreate: Get occupant profile data for a specific flat (query by MOBILE)
-- ============================================================================

DROP FUNCTION IF EXISTS get_occupant_profile_for_flat(UUID, UUID);

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
  v_session_apartment_id UUID;
  v_flat_apartment_id UUID;
BEGIN
  -- Validate session and get MOBILE (not email)
  SELECT os.mobile, os.apartment_id
  INTO v_session_mobile, v_session_apartment_id
  FROM occupant_sessions os
  WHERE os.id = p_session_token
    AND os.expires_at > NOW();
  
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
  
  -- Return the profile data for this flat + mobile combination
  -- Query by MOBILE instead of email (mobile is shared across flats)
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
-- Drop and recreate: Update WhatsApp opt-in preference (query by MOBILE)
-- ============================================================================

DROP FUNCTION IF EXISTS update_occupant_whatsapp_preference(UUID, UUID, BOOLEAN);

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
  v_session_apartment_id UUID;
  v_flat_apartment_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Validate session and get MOBILE
  SELECT os.mobile, os.apartment_id
  INTO v_session_mobile, v_session_apartment_id
  FROM occupant_sessions os
  WHERE os.id = p_session_token
    AND os.expires_at > NOW();
  
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
  
  -- Update WhatsApp preference for this flat + mobile combination
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
-- Drop and recreate: Update occupant profile (query by MOBILE)
-- ============================================================================

DROP FUNCTION IF EXISTS update_occupant_profile(UUID, UUID, TEXT, TEXT, TEXT);

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
  v_session_apartment_id UUID;
  v_flat_apartment_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Validate session and get MOBILE
  SELECT os.mobile, os.apartment_id
  INTO v_session_mobile, v_session_apartment_id
  FROM occupant_sessions os
  WHERE os.id = p_session_token
    AND os.expires_at > NOW();
  
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
  
  -- Update profile for this flat + mobile combination
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

GRANT EXECUTE ON FUNCTION get_occupant_profile_for_flat(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_occupant_profile_for_flat(UUID, UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION update_occupant_whatsapp_preference(UUID, UUID, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION update_occupant_whatsapp_preference(UUID, UUID, BOOLEAN) TO authenticated;

GRANT EXECUTE ON FUNCTION update_occupant_profile(UUID, UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION update_occupant_profile(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
