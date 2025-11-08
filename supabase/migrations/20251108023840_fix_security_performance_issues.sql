/*
  # Fix Security and Performance Issues

  ## Performance Optimizations
  
  1. **Foreign Key Indexes**
     - Add indexes on `payment_submissions.block_id`
     - Add indexes on `payment_submissions.flat_id`
     - Add indexes on `payment_submissions.reviewed_by`
  
  2. **RLS Performance Optimization**
     - Wrap all `auth.uid()` calls with `(select auth.uid())`
     - Wrap all `auth.jwt()` calls with `(select auth.jwt())`
     - This prevents re-evaluation for each row
  
  3. **Policy Consolidation**
     - Combine multiple permissive SELECT policies into single policies
     - Reduces policy evaluation overhead
  
  4. **Function Security**
     - Set immutable search_path on `update_updated_at_column` function

  ## Changes Made
  - Added 3 missing foreign key indexes
  - Optimized 17 RLS policies for performance
  - Consolidated 8 duplicate permissive policies
  - Secured trigger function search_path
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Index for payment_submissions.block_id foreign key
CREATE INDEX IF NOT EXISTS idx_payment_submissions_block_id 
  ON payment_submissions(block_id);

-- Index for payment_submissions.flat_id foreign key
CREATE INDEX IF NOT EXISTS idx_payment_submissions_flat_id 
  ON payment_submissions(flat_id);

-- Index for payment_submissions.reviewed_by foreign key
CREATE INDEX IF NOT EXISTS idx_payment_submissions_reviewed_by 
  ON payment_submissions(reviewed_by);

-- ============================================================================
-- 2. DROP EXISTING POLICIES (TO BE RECREATED WITH OPTIMIZATIONS)
-- ============================================================================

-- Apartments policies
DROP POLICY IF EXISTS "Super admins can view all apartments" ON apartments;
DROP POLICY IF EXISTS "Apartment admins can view their apartment" ON apartments;
DROP POLICY IF EXISTS "Super admins can manage apartments" ON apartments;
DROP POLICY IF EXISTS "Super admins can insert apartments" ON apartments;
DROP POLICY IF EXISTS "Super admins can update apartments" ON apartments;
DROP POLICY IF EXISTS "Super admins can delete apartments" ON apartments;

-- Buildings/Blocks/Phases policies
DROP POLICY IF EXISTS "Admins can view their apartment buildings" ON buildings_blocks_phases;
DROP POLICY IF EXISTS "Admins can manage their apartment buildings" ON buildings_blocks_phases;
DROP POLICY IF EXISTS "Admins can insert buildings" ON buildings_blocks_phases;
DROP POLICY IF EXISTS "Admins can update buildings" ON buildings_blocks_phases;
DROP POLICY IF EXISTS "Admins can delete buildings" ON buildings_blocks_phases;

-- Flat numbers policies
DROP POLICY IF EXISTS "Admins can view flats in their apartment" ON flat_numbers;
DROP POLICY IF EXISTS "Admins can manage flats in their apartment" ON flat_numbers;
DROP POLICY IF EXISTS "Admins can insert flats" ON flat_numbers;
DROP POLICY IF EXISTS "Admins can update flats" ON flat_numbers;
DROP POLICY IF EXISTS "Admins can delete flats" ON flat_numbers;

-- Admins policies
DROP POLICY IF EXISTS "Super admins can view all admins" ON admins;
DROP POLICY IF EXISTS "Admins can view their own record" ON admins;
DROP POLICY IF EXISTS "Super admins can manage all admins" ON admins;
DROP POLICY IF EXISTS "Super admins can insert admins" ON admins;
DROP POLICY IF EXISTS "Super admins can update admins" ON admins;
DROP POLICY IF EXISTS "Super admins can delete admins" ON admins;

-- Super admins policies
DROP POLICY IF EXISTS "Super admins can view their own record" ON super_admins;
DROP POLICY IF EXISTS "Super admins can update their own record" ON super_admins;

-- Payment submissions policies
DROP POLICY IF EXISTS "Admins can view payments in their apartment" ON payment_submissions;
DROP POLICY IF EXISTS "Admins can manage payments in their apartment" ON payment_submissions;
DROP POLICY IF EXISTS "Admins can insert payments" ON payment_submissions;
DROP POLICY IF EXISTS "Admins can update payments" ON payment_submissions;
DROP POLICY IF EXISTS "Admins can delete payments in their apartment" ON payment_submissions;

-- Audit logs policies
DROP POLICY IF EXISTS "Admins can view audit logs for their apartment" ON audit_logs;
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON audit_logs;

-- ============================================================================
-- 3. CREATE OPTIMIZED POLICIES WITH (SELECT auth.uid())
-- ============================================================================

-- APARTMENTS TABLE POLICIES (Consolidated)
-- Consolidated SELECT policy for both super admins and apartment admins
CREATE POLICY "Admins can view apartments"
  ON apartments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = (select auth.uid())
      AND admins.apartment_id = apartments.id
    )
  );

CREATE POLICY "Super admins can insert apartments"
  ON apartments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Super admins can update apartments"
  ON apartments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Super admins can delete apartments"
  ON apartments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

-- BUILDINGS_BLOCKS_PHASES TABLE POLICIES (Consolidated)
CREATE POLICY "Admins can view buildings"
  ON buildings_blocks_phases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = (select auth.uid())
      AND admins.apartment_id = buildings_blocks_phases.apartment_id
    )
  );

CREATE POLICY "Admins can insert buildings"
  ON buildings_blocks_phases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = (select auth.uid())
      AND admins.apartment_id = buildings_blocks_phases.apartment_id
    )
  );

CREATE POLICY "Admins can update buildings"
  ON buildings_blocks_phases
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = (select auth.uid())
      AND admins.apartment_id = buildings_blocks_phases.apartment_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = (select auth.uid())
      AND admins.apartment_id = buildings_blocks_phases.apartment_id
    )
  );

CREATE POLICY "Admins can delete buildings"
  ON buildings_blocks_phases
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = (select auth.uid())
      AND admins.apartment_id = buildings_blocks_phases.apartment_id
    )
  );

-- FLAT_NUMBERS TABLE POLICIES (Consolidated)
CREATE POLICY "Admins can view flats"
  ON flat_numbers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.apartment_id
      WHERE a.user_id = (select auth.uid())
      AND flat_numbers.block_id = bbp.id
    )
  );

CREATE POLICY "Admins can insert flats"
  ON flat_numbers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.apartment_id
      WHERE a.user_id = (select auth.uid())
      AND flat_numbers.block_id = bbp.id
    )
  );

CREATE POLICY "Admins can update flats"
  ON flat_numbers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.apartment_id
      WHERE a.user_id = (select auth.uid())
      AND flat_numbers.block_id = bbp.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.apartment_id
      WHERE a.user_id = (select auth.uid())
      AND flat_numbers.block_id = bbp.id
    )
  );

CREATE POLICY "Admins can delete flats"
  ON flat_numbers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.apartment_id
      WHERE a.user_id = (select auth.uid())
      AND flat_numbers.block_id = bbp.id
    )
  );

-- ADMINS TABLE POLICIES (Consolidated)
CREATE POLICY "Admins can view admin records"
  ON admins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
    )
    OR
    admins.user_id = (select auth.uid())
  );

CREATE POLICY "Super admins can insert admins"
  ON admins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Super admins can update admins"
  ON admins
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Super admins can delete admins"
  ON admins
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
    )
  );

-- SUPER_ADMINS TABLE POLICIES
CREATE POLICY "Super admins can view own record"
  ON super_admins
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Super admins can update own record"
  ON super_admins
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- PAYMENT_SUBMISSIONS TABLE POLICIES
CREATE POLICY "Admins can view payments"
  ON payment_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = (select auth.uid())
      AND a.apartment_id = payment_submissions.apartment_id
    )
  );

CREATE POLICY "Admins can insert payments"
  ON payment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = (select auth.uid())
      AND a.apartment_id = payment_submissions.apartment_id
    )
  );

CREATE POLICY "Admins can update payments"
  ON payment_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = (select auth.uid())
      AND a.apartment_id = payment_submissions.apartment_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = (select auth.uid())
      AND a.apartment_id = payment_submissions.apartment_id
    )
  );

CREATE POLICY "Admins can delete payments"
  ON payment_submissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = (select auth.uid())
      AND a.apartment_id = payment_submissions.apartment_id
    )
  );

-- AUDIT_LOGS TABLE POLICIES
-- Allow super admins and admins who performed the action to view logs
CREATE POLICY "Users can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
    )
    OR
    audit_logs.user_id = (select auth.uid())
  );

-- ============================================================================
-- 4. FIX FUNCTION SEARCH_PATH SECURITY
-- ============================================================================

-- Recreate the update_updated_at_column function with secure search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;