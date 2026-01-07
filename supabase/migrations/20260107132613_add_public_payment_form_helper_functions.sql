/*
  # Add Public Payment Form Helper Functions

  ## Problem
  
  Public payment forms (DynamicPaymentForm, EnhancedPaymentForm) need to:
  1. Check existing mobile numbers in flat_email_mappings (SELECT)
  2. Update mobile numbers and WhatsApp preferences (UPDATE)
  
  These operations are blocked for anonymous users after security fix.
  
  ## Solution
  
  Create two secure RPC functions:
  1. get_flat_contact_info - Returns mobile, email, name for a flat
  2. update_flat_contact_info - Updates mobile, name, whatsapp_opt_in for a flat
  
  ## Security
  
  - Functions are scoped to single flat (apartment_id + flat_id)
  - No session validation (public payment forms)
  - No bulk data exposure
  - Only essential fields returned/updated
  - Uses SECURITY DEFINER to bypass RLS
*/

-- ============================================================================
-- Function: Get flat contact information for public payment forms
-- ============================================================================

CREATE OR REPLACE FUNCTION get_flat_contact_info(
  p_apartment_id UUID,
  p_flat_id UUID
)
RETURNS TABLE (
  email TEXT,
  mobile TEXT,
  name TEXT,
  occupant_type TEXT,
  whatsapp_opt_in BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs
  IF p_apartment_id IS NULL OR p_flat_id IS NULL THEN
    RAISE EXCEPTION 'apartment_id and flat_id are required';
  END IF;
  
  -- Return contact info for this specific flat
  RETURN QUERY
  SELECT 
    fem.email,
    fem.mobile,
    fem.name,
    fem.occupant_type,
    COALESCE(fem.whatsapp_opt_in, false) as whatsapp_opt_in
  FROM flat_email_mappings fem
  WHERE fem.apartment_id = p_apartment_id
    AND fem.flat_id = p_flat_id
  LIMIT 1;
  
  -- If no mapping found, return NULL row
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$;

-- ============================================================================
-- Function: Update flat contact information from public payment forms
-- ============================================================================

CREATE OR REPLACE FUNCTION update_flat_contact_info(
  p_apartment_id UUID,
  p_flat_id UUID,
  p_mobile TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_whatsapp_opt_in BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Validate required inputs
  IF p_apartment_id IS NULL OR p_flat_id IS NULL THEN
    RAISE EXCEPTION 'apartment_id and flat_id are required';
  END IF;
  
  -- Update contact info for this specific flat
  -- Only update fields that are provided (not null)
  UPDATE flat_email_mappings
  SET 
    mobile = CASE WHEN p_mobile IS NOT NULL THEN p_mobile ELSE mobile END,
    name = CASE WHEN p_name IS NOT NULL THEN p_name ELSE name END,
    whatsapp_opt_in = CASE WHEN p_whatsapp_opt_in IS NOT NULL THEN p_whatsapp_opt_in ELSE whatsapp_opt_in END,
    updated_at = NOW()
  WHERE apartment_id = p_apartment_id
    AND flat_id = p_flat_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Return true if at least one row was updated
  RETURN v_updated_count > 0;
END;
$$;

-- ============================================================================
-- Grant execute permissions to anonymous and authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_flat_contact_info(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_flat_contact_info(UUID, UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION update_flat_contact_info(UUID, UUID, TEXT, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION update_flat_contact_info(UUID, UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

-- ============================================================================
-- Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION get_flat_contact_info IS 
  'Securely retrieves contact information for a specific flat.
   Used by public payment forms to check existing mobile numbers and names.
   Scoped to single flat identified by apartment_id + flat_id.';

COMMENT ON FUNCTION update_flat_contact_info IS 
  'Securely updates contact information for a specific flat.
   Used by public payment forms to update mobile, name, and WhatsApp preferences.
   Scoped to single flat identified by apartment_id + flat_id.
   Only updates fields that are provided (non-null).';
