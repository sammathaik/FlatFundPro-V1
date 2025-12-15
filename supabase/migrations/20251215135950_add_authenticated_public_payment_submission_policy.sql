/*
  # Add Authenticated Public User Payment Submission Policy

  ## Changes
  - Add a new RLS policy to allow authenticated users (non-admin) to submit payments to active apartments
  - This addresses the issue where users who are logged in (authenticated) but not admins cannot submit payments
  - The existing policy only allowed 'anon' (anonymous) users to submit payments

  ## Policy Details
  - **Policy Name**: "Authenticated users can submit payments to active apartments"
  - **Operation**: INSERT
  - **Role**: authenticated
  - **Check**: Apartment exists and is active

  ## Security
  - Users can only submit payments to apartments with status = 'active'
  - Does not allow authenticated users to bypass admin-specific permissions
  - Only applies to INSERT operations, not SELECT/UPDATE/DELETE
*/

-- Drop the policy if it exists, then create it
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can submit payments to active apartments" ON payment_submissions;
END $$;

-- Add policy for authenticated users to submit payments to active apartments
CREATE POLICY "Authenticated users can submit payments to active apartments"
  ON payment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM apartments
      WHERE apartments.id = payment_submissions.apartment_id
      AND apartments.status = 'active'
    )
  );
