/*
  # Fix Payment Submissions Permissions

  ## Issue
  - The "Occupants can view their own payments" policy is causing permission errors
  - This policy tries to access auth.users table which fails for all authenticated users
  - Since occupant authentication was reverted, this policy is no longer needed

  ## Changes
  - Drop the problematic "Occupants can view their own payments" policy
  - This allows admins to properly access payment submissions

  ## Result
  - Admin payment management pages will work correctly
  - No impact on existing admin access
*/

-- Drop the problematic occupant policy
DROP POLICY IF EXISTS "Occupants can view their own payments" ON payment_submissions;

-- Verify existing admin policies are still in place
-- These policies should remain:
-- 1. "Admins can view payments" - for SELECT
-- 2. "Admins can insert payments" - for INSERT
-- 3. "Admins can update payments" - for UPDATE
-- 4. "Admins can delete payments" - for DELETE
-- 5. "Public can submit payments to active apartments" - for anon INSERT
