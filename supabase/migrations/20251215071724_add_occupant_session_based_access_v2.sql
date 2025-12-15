/*
  # Add Occupant Session-Based Access for Payment Viewing

  ## Overview
  This migration enables occupants to view their own payment transactions through a secure session-based mechanism.
  
  ## Changes Made
  
  1. **New Table: occupant_sessions**
     - Stores verified occupant sessions after OTP verification
     - `id` (uuid, primary key) - Session identifier (used as bearer token)
     - `flat_id` (uuid) - Reference to the flat
     - `email` (text) - Occupant's email
     - `expires_at` (timestamptz) - Session expiration time (24 hours)
     - `created_at` (timestamptz) - Session creation timestamp
     - Automatically cleaned up after expiration
  
  2. **Updated Function: verify_occupant_otp**
     - Now creates a session token after successful OTP verification
     - Returns session_token along with occupant data
     - Session token valid for 24 hours
  
  3. **New Function: get_occupant_from_session**
     - Validates session token and returns occupant details
     - Used by RLS policies to identify the occupant
  
  4. **New RLS Policy: "Occupants can view their own payments"**
     - Allows anon users to SELECT from payment_submissions
     - Only grants access to payments matching the occupant's flat
     - Validates occupant identity via session token
     - Does NOT interfere with existing admin policies
  
  ## Security Notes
  - Sessions expire after 24 hours
  - Session tokens are UUIDs (cryptographically secure)
  - RLS policy validates both session validity AND flat ownership
  - Admin access remains unchanged (uses authenticated role)
  - Expired sessions are rejected by the validation function
*/

-- Create occupant_sessions table
CREATE TABLE IF NOT EXISTS occupant_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL REFERENCES flat_numbers(id) ON DELETE CASCADE,
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES buildings_blocks_phases(id) ON DELETE CASCADE,
  email text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on occupant_sessions
ALTER TABLE occupant_sessions ENABLE ROW LEVEL SECURITY;

-- Create index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_occupant_sessions_id_expires ON occupant_sessions(id, expires_at);
CREATE INDEX IF NOT EXISTS idx_occupant_sessions_email ON occupant_sessions(email);

-- RLS Policy: No direct access to sessions table (only via functions)
CREATE POLICY "No direct access to sessions"
  ON occupant_sessions
  FOR ALL
  TO anon, authenticated
  USING (false);

-- Function to get occupant details from session token
CREATE OR REPLACE FUNCTION get_occupant_from_session(session_token uuid)
RETURNS TABLE(
  flat_id uuid,
  apartment_id uuid,
  block_id uuid,
  email text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    os.flat_id,
    os.apartment_id,
    os.block_id,
    os.email
  FROM occupant_sessions os
  WHERE os.id = session_token
    AND os.expires_at > now();
END;
$$;

-- Drop and recreate verify_occupant_otp function to add session creation
DROP FUNCTION IF EXISTS verify_occupant_otp(text, text);

CREATE FUNCTION verify_occupant_otp(
  p_email text,
  p_otp text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mapping flat_email_mappings;
  v_session_id uuid;
BEGIN
  -- Find the occupant mapping
  SELECT * INTO v_mapping
  FROM flat_email_mappings
  WHERE LOWER(email) = LOWER(p_email)
    AND otp = p_otp
    AND otp_expires_at > now();

  -- Check if OTP is valid
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid or expired OTP'
    );
  END IF;

  -- Mark mobile as verified if not already
  IF NOT v_mapping.is_mobile_verified THEN
    UPDATE flat_email_mappings
    SET is_mobile_verified = true,
        updated_at = now()
    WHERE id = v_mapping.id;
  END IF;

  -- Clear the OTP
  UPDATE flat_email_mappings
  SET otp = NULL,
      otp_expires_at = NULL
  WHERE id = v_mapping.id;

  -- Create a new session
  INSERT INTO occupant_sessions (flat_id, apartment_id, block_id, email)
  VALUES (v_mapping.flat_id, v_mapping.apartment_id, v_mapping.block_id, v_mapping.email)
  RETURNING id INTO v_session_id;

  -- Return success with session token
  RETURN json_build_object(
    'success', true,
    'session_token', v_session_id,
    'occupant', json_build_object(
      'flat_id', v_mapping.flat_id,
      'apartment_id', v_mapping.apartment_id,
      'block_id', v_mapping.block_id,
      'email', v_mapping.email,
      'mobile', v_mapping.mobile,
      'occupant_type', v_mapping.occupant_type
    )
  );
END;
$$;

-- Add RLS policy for occupants to view their own payments
CREATE POLICY "Occupants can view their own payments"
  ON payment_submissions
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM get_occupant_from_session(
        -- Extract session token from request headers
        NULLIF(current_setting('request.headers', true)::json->>'x-session-token', '')::uuid
      ) AS session
      WHERE session.flat_id = payment_submissions.flat_id
        AND session.apartment_id = payment_submissions.apartment_id
        AND session.block_id = payment_submissions.block_id
    )
  );

-- Function to clean up expired sessions (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_occupant_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM occupant_sessions
  WHERE expires_at < now();
END;
$$;

-- Comment on the session-based approach
COMMENT ON TABLE occupant_sessions IS 'Stores verified occupant sessions for secure access to their payment data. Sessions expire after 24 hours.';
COMMENT ON FUNCTION get_occupant_from_session IS 'Validates session token and returns occupant details for RLS policy checks.';
COMMENT ON FUNCTION verify_occupant_otp IS 'Verifies OTP and creates a session token for occupant access.';
