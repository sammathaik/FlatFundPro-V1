/*
  # Fix Public Payment Form Access

  ## Problem
  The public payment form (used by residents to submit payments) cannot load:
  - Apartments
  - Buildings/Blocks
  - Flat numbers

  This is because all RLS policies currently require authentication, but residents
  accessing the public form are anonymous (not logged in).

  ## Solution
  Add public read-only access policies for:
  - apartments table (SELECT only)
  - buildings_blocks_phases table (SELECT only)
  - flat_numbers table (SELECT only)

  ## Security Notes
  - Only SELECT access is granted (no INSERT, UPDATE, DELETE)
  - Only to anonymous/public users (anon role)
  - Existing authenticated user policies remain unchanged
  - No sensitive data exposed (these tables contain building structure, not personal info)

  ## Changes
  1. Add public SELECT policy for apartments
  2. Add public SELECT policy for buildings_blocks_phases
  3. Add public SELECT policy for flat_numbers
*/

-- Policy for public to view apartments (needed for apartment dropdown in payment form)
CREATE POLICY "Public can view apartments for payment submission"
  ON apartments FOR SELECT
  TO anon
  USING (true);

-- Policy for public to view buildings/blocks (needed for block dropdown in payment form)
CREATE POLICY "Public can view buildings for payment submission"
  ON buildings_blocks_phases FOR SELECT
  TO anon
  USING (true);

-- Policy for public to view flat numbers (needed for flat dropdown in payment form)
CREATE POLICY "Public can view flats for payment submission"
  ON flat_numbers FOR SELECT
  TO anon
  USING (true);