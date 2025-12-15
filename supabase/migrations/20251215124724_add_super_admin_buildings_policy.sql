/*
  # Add Super Admin Policy for Buildings/Blocks

  1. Security Fix
    - Add SELECT policy for super admins to view all buildings_blocks_phases
    - Super admins need system-wide access to view all buildings/blocks across all apartments
  
  2. Changes
    - Create new policy "Super admins can view all buildings" for SELECT operations
    - Policy checks if authenticated user exists in super_admins table with status = 'active'
*/

-- Add super admin view policy for buildings_blocks_phases
CREATE POLICY "Super admins can view all buildings"
  ON buildings_blocks_phases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );