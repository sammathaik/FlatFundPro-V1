/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Add Missing Indexes for Foreign Keys
  - Add index on `flat_email_mappings.block_id`
  - Add index on `occupant_sessions.apartment_id`
  - Add index on `occupant_sessions.block_id`
  - Add index on `occupant_sessions.flat_id`
  - Add index on `payment_submissions.expected_collection_id`

  ### 2. Optimize RLS Policies (Auth Function Initialization)
  - Update all RLS policies to use `(select auth.<function>())` pattern
  - This prevents re-evaluation of auth functions for each row
  - Affects tables: expected_collections, marketing_leads, flat_email_mappings, payment_submissions

  ### 3. Remove Unused Indexes
  - Drop `idx_admins_user`
  - Drop `idx_marketing_leads_email`
  - Drop `idx_marketing_leads_status`
  - Drop `idx_flat_email_mappings_email`
  - Drop `idx_flat_email_mappings_apartment`
  - Drop `idx_flat_email_mappings_mobile`

  ### 4. Fix Multiple Permissive Policies
  - Consolidate SELECT policies for expected_collections
  - Consolidate SELECT policies for flat_email_mappings

  ### 5. Fix Function Search Paths
  - Set search_path for all functions to prevent security issues
*/

-- =====================================================
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- =====================================================

-- Add index on flat_email_mappings.block_id
CREATE INDEX IF NOT EXISTS idx_flat_email_mappings_block_id 
ON flat_email_mappings(block_id);

-- Add index on occupant_sessions foreign keys
CREATE INDEX IF NOT EXISTS idx_occupant_sessions_apartment_id 
ON occupant_sessions(apartment_id);

CREATE INDEX IF NOT EXISTS idx_occupant_sessions_block_id 
ON occupant_sessions(block_id);

CREATE INDEX IF NOT EXISTS idx_occupant_sessions_flat_id 
ON occupant_sessions(flat_id);

-- Add index on payment_submissions.expected_collection_id
CREATE INDEX IF NOT EXISTS idx_payment_submissions_expected_collection_id 
ON payment_submissions(expected_collection_id);

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_admins_user;
DROP INDEX IF EXISTS idx_marketing_leads_email;
DROP INDEX IF EXISTS idx_marketing_leads_status;
DROP INDEX IF EXISTS idx_flat_email_mappings_email;
DROP INDEX IF EXISTS idx_flat_email_mappings_apartment;
DROP INDEX IF EXISTS idx_flat_email_mappings_mobile;

-- =====================================================
-- 3. FIX RLS POLICIES - CONSOLIDATE AND OPTIMIZE
-- =====================================================

-- Fix expected_collections policies
DROP POLICY IF EXISTS "Admins can view expected collections for their apartment" ON expected_collections;
DROP POLICY IF EXISTS "Admins can manage expected collections for their apartment" ON expected_collections;

CREATE POLICY "Admins can view and manage expected collections"
  ON expected_collections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = (select auth.uid())
      AND admins.apartment_id = expected_collections.apartment_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = (select auth.uid())
      AND admins.apartment_id = expected_collections.apartment_id
    )
  );

-- Fix marketing_leads policies
DROP POLICY IF EXISTS "Super Admin can view all leads" ON marketing_leads;
DROP POLICY IF EXISTS "Super Admin can update leads" ON marketing_leads;
DROP POLICY IF EXISTS "Super Admin can delete leads" ON marketing_leads;

CREATE POLICY "Super Admin can manage all leads"
  ON marketing_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
      AND super_admins.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
      AND super_admins.status = 'active'
    )
  );

-- Fix flat_email_mappings policies
DROP POLICY IF EXISTS "Admins can view mappings in their apartment" ON flat_email_mappings;
DROP POLICY IF EXISTS "Admins can manage mappings in their apartment" ON flat_email_mappings;
DROP POLICY IF EXISTS "Occupants can view their own mapping" ON flat_email_mappings;
DROP POLICY IF EXISTS "Public can read mappings for validation" ON flat_email_mappings;

-- Create consolidated policy for admins
CREATE POLICY "Admins can manage mappings"
  ON flat_email_mappings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = (select auth.uid())
      AND admins.apartment_id = flat_email_mappings.apartment_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = (select auth.uid())
      AND admins.apartment_id = flat_email_mappings.apartment_id
    )
  );

-- Create policy for occupants (authenticated users checking their own data)
CREATE POLICY "Occupants can view their mappings"
  ON flat_email_mappings
  FOR SELECT
  TO authenticated
  USING (
    email = (select auth.jwt()->>'email')
    OR mobile = (select auth.jwt()->>'phone')
  );

-- Create policy for public/anon (for validation during login)
CREATE POLICY "Public can validate mappings"
  ON flat_email_mappings
  FOR SELECT
  TO anon
  USING (true);

-- Fix payment_submissions policy for occupants
DROP POLICY IF EXISTS "Occupants can view their own payments" ON payment_submissions;

CREATE POLICY "Occupants can view their payments"
  ON payment_submissions
  FOR SELECT
  TO authenticated
  USING (
    email IN (
      SELECT email FROM flat_email_mappings 
      WHERE email = (select auth.jwt()->>'email')
      OR mobile = (select auth.jwt()->>'phone')
    )
  );

-- =====================================================
-- 4. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Fix update_marketing_leads_updated_at
CREATE OR REPLACE FUNCTION update_marketing_leads_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix get_occupant_payments_with_session
CREATE OR REPLACE FUNCTION get_occupant_payments_with_session(p_session_token text)
RETURNS TABLE (
  id uuid,
  apartment_id uuid,
  block_id uuid,
  flat_id uuid,
  email_id text,
  amount numeric,
  payment_date date,
  screenshot_url text,
  quarter text,
  year integer,
  status text,
  payment_source text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_session occupant_sessions;
BEGIN
  SELECT * INTO v_session
  FROM occupant_sessions
  WHERE session_token = p_session_token
  AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired session';
  END IF;

  RETURN QUERY
  SELECT 
    ps.id,
    ps.apartment_id,
    ps.block_id,
    ps.flat_id,
    ps.email as email_id,
    ps.payment_amount as amount,
    ps.payment_date,
    ps.screenshot_url,
    ps.payment_quarter as quarter,
    EXTRACT(YEAR FROM ps.payment_date)::integer as year,
    ps.status,
    ps.payment_source,
    ps.created_at
  FROM payment_submissions ps
  INNER JOIN flat_email_mappings fem 
    ON ps.email = fem.email
  WHERE fem.mobile = v_session.mobile
  AND ps.apartment_id = v_session.apartment_id;
END;
$$;

-- Fix validate_and_create_flat_email_mapping
CREATE OR REPLACE FUNCTION validate_and_create_flat_email_mapping(
  p_apartment_id uuid,
  p_block_id uuid,
  p_flat_id uuid,
  p_email text,
  p_mobile text,
  p_occupant_type text
)
RETURNS json
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_apartment apartments;
  v_block buildings_blocks_phases;
  v_flat flat_numbers;
  v_result json;
BEGIN
  SELECT * INTO v_apartment FROM apartments WHERE id = p_apartment_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid apartment');
  END IF;

  SELECT * INTO v_block FROM buildings_blocks_phases WHERE id = p_block_id AND apartment_id = p_apartment_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid block');
  END IF;

  SELECT * INTO v_flat FROM flat_numbers WHERE id = p_flat_id AND block_id = p_block_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid flat');
  END IF;

  INSERT INTO flat_email_mappings (apartment_id, block_id, flat_id, email, mobile, occupant_type)
  VALUES (p_apartment_id, p_block_id, p_flat_id, p_email, p_mobile, p_occupant_type)
  ON CONFLICT (email, mobile) DO NOTHING;

  RETURN json_build_object('success', true);
END;
$$;

-- Fix get_occupant_flats
CREATE OR REPLACE FUNCTION get_occupant_flats(p_session_token text)
RETURNS TABLE (
  apartment_id uuid,
  apartment_name text,
  block_id uuid,
  block_name text,
  flat_id uuid,
  flat_number text
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_session occupant_sessions;
BEGIN
  SELECT * INTO v_session
  FROM occupant_sessions
  WHERE session_token = p_session_token
  AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired session';
  END IF;

  RETURN QUERY
  SELECT 
    fem.apartment_id,
    a.apartment_name as apartment_name,
    fem.block_id,
    b.block_name as block_name,
    fem.flat_id,
    f.flat_number
  FROM flat_email_mappings fem
  INNER JOIN apartments a ON fem.apartment_id = a.id
  INNER JOIN buildings_blocks_phases b ON fem.block_id = b.id
  INNER JOIN flat_numbers f ON fem.flat_id = f.id
  WHERE fem.mobile = v_session.mobile;
END;
$$;

-- Fix verify_occupant_otp
CREATE OR REPLACE FUNCTION verify_occupant_otp(
  p_mobile text,
  p_otp text
)
RETURNS json
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_session occupant_sessions;
  v_new_token text;
BEGIN
  SELECT * INTO v_session
  FROM occupant_sessions
  WHERE mobile = p_mobile
  AND otp = p_otp
  AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired OTP');
  END IF;

  v_new_token := encode(gen_random_bytes(32), 'hex');

  UPDATE occupant_sessions
  SET session_token = v_new_token,
      expires_at = now() + interval '7 days'
  WHERE id = v_session.id;

  RETURN json_build_object(
    'success', true,
    'session_token', v_new_token,
    'apartment_id', v_session.apartment_id,
    'block_id', v_session.block_id,
    'flat_id', v_session.flat_id
  );
END;
$$;

-- Fix get_occupant_from_session
CREATE OR REPLACE FUNCTION get_occupant_from_session(p_session_token text)
RETURNS json
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_session occupant_sessions;
BEGIN
  SELECT * INTO v_session
  FROM occupant_sessions
  WHERE session_token = p_session_token
  AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired session');
  END IF;

  RETURN json_build_object(
    'success', true,
    'mobile', v_session.mobile,
    'apartment_id', v_session.apartment_id,
    'block_id', v_session.block_id,
    'flat_id', v_session.flat_id
  );
END;
$$;

-- Fix get_payments_for_flat_with_session
CREATE OR REPLACE FUNCTION get_payments_for_flat_with_session(
  p_session_token text,
  p_apartment_id uuid,
  p_flat_id uuid
)
RETURNS TABLE (
  id uuid,
  apartment_id uuid,
  block_id uuid,
  flat_id uuid,
  email_id text,
  amount numeric,
  payment_date date,
  screenshot_url text,
  quarter text,
  year integer,
  status text,
  payment_source text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_session occupant_sessions;
BEGIN
  SELECT * INTO v_session
  FROM occupant_sessions
  WHERE session_token = p_session_token
  AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired session';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM flat_email_mappings
    WHERE mobile = v_session.mobile
    AND flat_email_mappings.apartment_id = p_apartment_id
    AND flat_email_mappings.flat_id = p_flat_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to flat';
  END IF;

  RETURN QUERY
  SELECT 
    ps.id,
    ps.apartment_id,
    ps.block_id,
    ps.flat_id,
    ps.email as email_id,
    ps.payment_amount as amount,
    ps.payment_date,
    ps.screenshot_url,
    ps.payment_quarter as quarter,
    EXTRACT(YEAR FROM ps.payment_date)::integer as year,
    ps.status,
    ps.payment_source,
    ps.created_at
  FROM payment_submissions ps
  WHERE ps.apartment_id = p_apartment_id
  AND ps.flat_id = p_flat_id;
END;
$$;

-- Fix update_expected_collections_updated_at
CREATE OR REPLACE FUNCTION update_expected_collections_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix generate_occupant_otp
CREATE OR REPLACE FUNCTION generate_occupant_otp(
  p_mobile text,
  p_apartment_id uuid,
  p_block_id uuid,
  p_flat_id uuid
)
RETURNS json
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_otp text;
  v_mapping flat_email_mappings;
BEGIN
  SELECT * INTO v_mapping
  FROM flat_email_mappings
  WHERE mobile = p_mobile
  AND apartment_id = p_apartment_id
  AND block_id = p_block_id
  AND flat_id = p_flat_id
  AND is_mobile_verified = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Mobile number not found or not verified');
  END IF;

  v_otp := lpad(floor(random() * 1000000)::text, 6, '0');

  INSERT INTO occupant_sessions (mobile, otp, apartment_id, block_id, flat_id, expires_at)
  VALUES (p_mobile, v_otp, p_apartment_id, p_block_id, p_flat_id, now() + interval '10 minutes')
  ON CONFLICT (mobile) 
  DO UPDATE SET 
    otp = EXCLUDED.otp,
    expires_at = EXCLUDED.expires_at,
    created_at = now();

  RETURN json_build_object('success', true, 'otp', v_otp);
END;
$$;

-- Fix cleanup_expired_occupant_sessions
CREATE OR REPLACE FUNCTION cleanup_expired_occupant_sessions()
RETURNS void
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM occupant_sessions
  WHERE expires_at < now();
END;
$$;