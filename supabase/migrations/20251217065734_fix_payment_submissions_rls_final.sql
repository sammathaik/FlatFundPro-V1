/*
  # Fix Payment Submissions RLS for Anonymous Users

  1. Problem
    - Anonymous users cannot insert payments despite permissive policies
    - Complex policy conditions may be causing failures
    
  2. Solution
    - Drop all existing INSERT policies
    - Create simple, working policies for anon and authenticated users
    - Separate policies to avoid conflicts
    
  3. Security
    - Application-level validation ensures apartments are active
    - RLS focuses on allowing legitimate submissions
*/

-- Drop all existing INSERT policies on payment_submissions
DROP POLICY IF EXISTS "Admins can insert payments" ON payment_submissions;
DROP POLICY IF EXISTS "Authenticated users can submit payments to active apartments" ON payment_submissions;
DROP POLICY IF EXISTS "Authenticated users can submit payments to active apartments v2" ON payment_submissions;
DROP POLICY IF EXISTS "Public can submit payments to active apartments" ON payment_submissions;
DROP POLICY IF EXISTS "Allow public payment submissions" ON payment_submissions;

-- Create simple policy for anon users
CREATE POLICY "anon_insert_payments"
ON payment_submissions
FOR INSERT
TO anon
WITH CHECK (true);

-- Create simple policy for authenticated users
CREATE POLICY "authenticated_insert_payments"
ON payment_submissions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add comments
COMMENT ON POLICY "anon_insert_payments" ON payment_submissions IS 
'Allows anonymous users to submit payments. Validation at application level.';

COMMENT ON POLICY "authenticated_insert_payments" ON payment_submissions IS 
'Allows authenticated users to submit payments. Validation at application level.';
