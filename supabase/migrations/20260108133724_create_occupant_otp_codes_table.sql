/*
  # Create Occupant OTP Codes Table

  ## Overview
  Creates a separate table for storing occupant OTP codes for secure authentication.

  ## Changes
  1. **New Table: occupant_otp_codes**
     - Stores OTP codes for occupant login
     - `id` (uuid, primary key) - Unique identifier
     - `email` (text) - Occupant email
     - `mobile` (text) - Occupant mobile number
     - `otp_code` (text) - 6-digit OTP
     - `flat_id` (uuid) - Reference to flat
     - `used` (boolean) - Whether OTP has been used
     - `created_at` (timestamptz) - When OTP was created
     - OTPs are valid for 15 minutes

  2. **Indexes**
     - Index on email for fast lookups
     - Index on mobile for fast lookups
     - Composite index on email + created_at for cleanup

  3. **RLS Policies**
     - No direct access (only via SECURITY DEFINER functions)

  ## Security
  - OTPs expire after 15 minutes
  - Each OTP can only be used once (via `used` flag)
  - No direct table access - only via secure functions
*/

-- Create occupant_otp_codes table
CREATE TABLE IF NOT EXISTS occupant_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  mobile text NOT NULL,
  otp_code text NOT NULL,
  flat_id uuid REFERENCES flat_numbers(id) ON DELETE CASCADE,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE occupant_otp_codes ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_occupant_otp_codes_email ON occupant_otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_occupant_otp_codes_mobile ON occupant_otp_codes(mobile);
CREATE INDEX IF NOT EXISTS idx_occupant_otp_codes_email_created ON occupant_otp_codes(email, created_at);
CREATE INDEX IF NOT EXISTS idx_occupant_otp_codes_created_at ON occupant_otp_codes(created_at);

-- RLS Policy: No direct access (only via SECURITY DEFINER functions)
CREATE POLICY "No direct access to OTP codes"
  ON occupant_otp_codes
  FOR ALL
  TO anon, authenticated, service_role
  USING (false)
  WITH CHECK (false);

-- Cleanup old OTP codes (older than 24 hours) - run periodically
-- This can be set up as a cron job or manually triggered
CREATE OR REPLACE FUNCTION cleanup_old_otp_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM occupant_otp_codes
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

COMMENT ON TABLE occupant_otp_codes IS 'Stores temporary OTP codes for occupant authentication';
COMMENT ON FUNCTION cleanup_old_otp_codes IS 'Removes OTP codes older than 24 hours';
