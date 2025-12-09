/*
  # Add authenticated user lead submission policy

  1. Changes
    - Add policy to allow authenticated users to also submit leads
    - This ensures both anonymous and authenticated users can use the demo request form
*/

-- Policy: Allow authenticated users to submit leads
CREATE POLICY "Allow authenticated users to submit leads"
  ON marketing_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
