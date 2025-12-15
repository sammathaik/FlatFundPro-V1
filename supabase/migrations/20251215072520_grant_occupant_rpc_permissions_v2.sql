/*
  # Grant Execute Permissions for Occupant RPC Functions

  ## Overview
  Grants EXECUTE permission to anon users for occupant-related RPC functions.
  
  ## Changes
  - Grant EXECUTE on get_occupant_payments_with_session to anon role
  - Grant EXECUTE on verify_occupant_otp to anon role
  - Grant EXECUTE on get_occupant_from_session to anon role (used internally)
  
  ## Security
  - Functions are SECURITY DEFINER and have internal validation
  - Anon users can only access data validated through session tokens
  - No direct table access is granted
*/

-- Grant execute permissions for occupant RPC functions
GRANT EXECUTE ON FUNCTION get_occupant_payments_with_session(uuid) TO anon;
GRANT EXECUTE ON FUNCTION verify_occupant_otp(text, text) TO anon;
GRANT EXECUTE ON FUNCTION get_occupant_from_session(uuid) TO anon;

-- Also grant to authenticated for consistency (in case admins need to test)
GRANT EXECUTE ON FUNCTION get_occupant_payments_with_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_occupant_otp(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_occupant_from_session(uuid) TO authenticated;

COMMENT ON FUNCTION get_occupant_payments_with_session IS 'Returns payments for an occupant after validating their session token. Granted to anon role for occupant portal access.';
