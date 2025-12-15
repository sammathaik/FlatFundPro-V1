/*
  # Add Occupant Payment View Policy

  ## Changes
  - Add RLS policy to allow occupants to view their own payment submissions
  - Occupants can view payments for flats they are mapped to in flat_email_mappings
  
  ## Security
  - Policy checks that the authenticated user's email matches an entry in flat_email_mappings
  - Access is restricted to payments for their specific apartment, block, and flat combination
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Occupants can view their own payments" ON payment_submissions;

-- Create policy for occupants to view their own payments
CREATE POLICY "Occupants can view their own payments"
  ON payment_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM flat_email_mappings fem
      WHERE fem.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND fem.apartment_id = payment_submissions.apartment_id
        AND fem.block_id = payment_submissions.block_id
        AND fem.flat_id = payment_submissions.flat_id
    )
  );
