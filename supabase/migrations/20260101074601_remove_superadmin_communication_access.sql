/*
  # Remove Super Admin Access to Communication Features

  ## Changes
  - Drop the "Super admins can view all communication logs" policy
  - Drop the "Super admins can view communication access audit" policy
  - These features are now restricted to Apartment Admins only

  ## Security
  - Super Admins will no longer have access to communication_logs table
  - Super Admins will no longer have access to communication_access_audit table
  - Apartment Admins retain full access to their apartment's communication data
*/

-- Drop super admin access policies for communication_logs
DROP POLICY IF EXISTS "Super admins can view all communication logs" ON communication_logs;

-- Drop super admin access policies for communication_access_audit
DROP POLICY IF EXISTS "Super admins can view communication access audit" ON communication_access_audit;
