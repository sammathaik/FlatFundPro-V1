/*
  # Fix Super Admin Access to All Payments

  1. Changes
    - Update the SELECT policy on payment_submissions to allow super admins to view ALL payments
    - Previously only apartment admins could view payments in their apartment
    - Super admins need read-only access to all payments across all apartments
  
  2. Security
    - Super admins can view (SELECT) all payments
    - Super admins cannot modify (INSERT/UPDATE/DELETE) payments - read-only access
    - Apartment admins retain full access to payments in their apartment only
    - Data isolation maintained for apartment admins
*/

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Admins can view payments" ON payment_submissions;

-- Create new policy allowing both super admins and apartment admins to view payments
CREATE POLICY "Admins can view payments"
  ON payment_submissions
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can view ALL payments
    EXISTS (
      SELECT 1 FROM super_admins 
      WHERE super_admins.user_id = (select auth.uid())
    )
    OR
    -- Apartment admins can view only their apartment's payments
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = (select auth.uid())
      AND a.apartment_id = payment_submissions.apartment_id
    )
  );
