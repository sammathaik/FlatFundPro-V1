/*
  # Add Super Admin View Policies for All Tables

  1. Security Fix
    - Add SELECT policies for super admins to view all data across the system
    - Super admins need system-wide access to view all data for dashboard statistics
  
  2. Changes
    - Add super admin SELECT policy for apartments table
    - Add super admin SELECT policy for admins table
    - Add super admin SELECT policy for flat_numbers table
    - Add super admin SELECT policy for flat_email_mappings table
    - Add super admin SELECT policy for expected_collections table
  
  3. Security
    - All policies check if authenticated user exists in super_admins table with status = 'active'
    - Only applies to SELECT operations (read-only for statistics)
*/

-- Super admin policy for apartments
CREATE POLICY "Super admins can view all apartments"
  ON apartments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Super admin policy for admins
CREATE POLICY "Super admins can view all admins"
  ON admins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Super admin policy for flat_numbers
CREATE POLICY "Super admins can view all flats"
  ON flat_numbers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Super admin policy for flat_email_mappings
CREATE POLICY "Super admins can view all occupants"
  ON flat_email_mappings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Super admin policy for expected_collections
CREATE POLICY "Super admins can view all collections"
  ON expected_collections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );