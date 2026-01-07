/*
  # Add Mobile Payment WhatsApp Update Function

  ## Problem
  
  The MobilePaymentFlow component tries to directly UPDATE flat_email_mappings
  to set the WhatsApp opt-in preference after payment submission. This fails
  because anonymous users have no UPDATE access to flat_email_mappings.
  
  ## Solution
  
  Create a secure RPC function that:
  1. Accepts apartment_id, flat_number, and whatsapp_opt_in value
  2. Uses SECURITY DEFINER to bypass RLS
  3. Only updates the specific flat's WhatsApp preference
  4. Returns success/failure status
  
  ## Security
  
  - Function is scoped to a single flat (apartment_id + flat_number combination)
  - No session validation needed (this is called after payment submission)
  - No bulk updates possible
  - Only updates the whatsapp_opt_in field, nothing else
*/

-- ============================================================================
-- Function: Update WhatsApp preference for mobile payment flow
-- ============================================================================

CREATE OR REPLACE FUNCTION update_mobile_payment_whatsapp_preference(
  p_apartment_id UUID,
  p_flat_number TEXT,
  p_whatsapp_opt_in BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Validate inputs
  IF p_apartment_id IS NULL OR p_flat_number IS NULL THEN
    RAISE EXCEPTION 'apartment_id and flat_number are required';
  END IF;
  
  -- Update WhatsApp preference for this specific flat
  -- Using apartment_id + flat_number as the unique identifier
  UPDATE flat_email_mappings fem
  SET 
    whatsapp_opt_in = p_whatsapp_opt_in,
    updated_at = NOW()
  FROM flat_numbers fn
  WHERE fem.flat_id = fn.id
    AND fem.apartment_id = p_apartment_id
    AND fn.flat_number = p_flat_number;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Return true if at least one row was updated
  RETURN v_updated_count > 0;
END;
$$;

-- ============================================================================
-- Grant execute permissions to anonymous and authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION update_mobile_payment_whatsapp_preference(UUID, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION update_mobile_payment_whatsapp_preference(UUID, TEXT, BOOLEAN) TO authenticated;

-- ============================================================================
-- Add helpful comment
-- ============================================================================

COMMENT ON FUNCTION update_mobile_payment_whatsapp_preference IS 
  'Securely updates WhatsApp opt-in preference for mobile payment flow. 
   Called after payment submission to update notification preferences.
   Scoped to single flat identified by apartment_id + flat_number.';
