/*
  # Add Multi-Flat Payment Fetching Support

  ## Overview
  Creates an RPC function to fetch payments for any flat owned by the occupant,
  validated through their session token.

  ## Changes Made

  1. **New Function: get_payments_for_flat_with_session**
     - Takes session_token and flat_id as parameters
     - Validates the session token
     - Verifies the flat_id belongs to the same email+mobile
     - Returns payments for the requested flat
  
  ## Security Notes
  - Session validation happens first
  - Flat ownership is verified before returning payments
  - Returns empty result if validation fails
  - Maintains data segregation between different occupants
*/

-- Function to get payments for a specific flat owned by the occupant
CREATE OR REPLACE FUNCTION get_payments_for_flat_with_session(
  session_token uuid,
  flat_id uuid
)
RETURNS SETOF payment_submissions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_mobile text;
  v_flat_valid boolean;
BEGIN
  -- Get and validate session
  SELECT * INTO v_session
  FROM occupant_sessions
  WHERE id = session_token
    AND expires_at > now();
  
  -- If no valid session found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get mobile for this occupant
  SELECT fem.mobile INTO v_mobile
  FROM flat_email_mappings fem
  WHERE fem.flat_id = v_session.flat_id
  LIMIT 1;
  
  -- Check if the requested flat_id belongs to the same email+mobile
  SELECT EXISTS(
    SELECT 1
    FROM flat_email_mappings fem
    WHERE fem.flat_id = get_payments_for_flat_with_session.flat_id
      AND LOWER(fem.email) = LOWER(v_session.email)
      AND fem.mobile = v_mobile
  ) INTO v_flat_valid;
  
  -- If flat doesn't belong to this occupant, return empty
  IF NOT v_flat_valid THEN
    RETURN;
  END IF;
  
  -- Return payments for the requested flat
  RETURN QUERY
  SELECT ps.*
  FROM payment_submissions ps
  WHERE ps.flat_id = get_payments_for_flat_with_session.flat_id
  ORDER BY ps.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_payments_for_flat_with_session IS 'Returns payments for a specific flat after validating session token and flat ownership. Used for multi-flat occupants.';
