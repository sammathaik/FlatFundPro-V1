/*
  # Fix Anonymous Payment Submission Policy

  1. Problem
    - The existing RLS policy for anon users has a subquery that fails
    - The subquery checking apartments table doesn't work properly in RLS context
    
  2. Solution
    - Drop the restrictive policy
    - Create a simpler policy that uses SECURITY DEFINER function
    - Or use a direct check without subquery
    
  3. Changes
    - Drop existing anon INSERT policy
    - Create new policy with proper access
*/

-- Reset role to ensure we're running as postgres
RESET ROLE;

-- Drop the existing anon policy that's not working
DROP POLICY IF EXISTS "Public can submit payments to active apartments" ON payment_submissions;

-- Create a function to check if apartment is active (runs with definer privileges)
CREATE OR REPLACE FUNCTION is_apartment_active(apartment_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM apartments 
    WHERE id = apartment_uuid AND status = 'active'
  );
$$;

-- Grant execute permission to anon and authenticated
GRANT EXECUTE ON FUNCTION is_apartment_active TO anon;
GRANT EXECUTE ON FUNCTION is_apartment_active TO authenticated;

-- Create new policy using the function
CREATE POLICY "Public can submit payments to active apartments"
ON payment_submissions
FOR INSERT
TO anon
WITH CHECK (is_apartment_active(apartment_id));

-- Also ensure authenticated users can submit
CREATE POLICY "Authenticated users can submit payments to active apartments v2"
ON payment_submissions
FOR INSERT
TO authenticated
WITH CHECK (is_apartment_active(apartment_id));

COMMENT ON FUNCTION is_apartment_active IS 'Check if an apartment is active - used in RLS policies';
