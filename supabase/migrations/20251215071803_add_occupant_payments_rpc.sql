/*
  # Add RPC Function for Occupant Payment Access

  ## Overview
  Creates a helper RPC function to fetch payments for occupants using their session token.
  
  ## New Function: get_occupant_payments_with_session
  - Takes session_token as parameter
  - Validates the session token
  - Returns all payments for the occupant's flat
  - Uses SECURITY DEFINER to bypass RLS
  - Only returns data if session is valid
  
  ## Security
  - Session validation happens inside the function
  - No direct RLS bypass without valid session
  - Returns empty array if session is invalid/expired
*/

-- Function to get payments for an occupant using session token
CREATE OR REPLACE FUNCTION get_occupant_payments_with_session(session_token uuid)
RETURNS SETOF payment_submissions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Get and validate session
  SELECT * INTO v_session
  FROM get_occupant_from_session(session_token);
  
  -- If no valid session found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Return payments for this occupant's flat
  RETURN QUERY
  SELECT ps.*
  FROM payment_submissions ps
  WHERE ps.flat_id = v_session.flat_id
    AND ps.apartment_id = v_session.apartment_id
    AND ps.block_id = v_session.block_id
  ORDER BY ps.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_occupant_payments_with_session IS 'Returns all payments for an occupant after validating their session token. Used by occupant portal.';
