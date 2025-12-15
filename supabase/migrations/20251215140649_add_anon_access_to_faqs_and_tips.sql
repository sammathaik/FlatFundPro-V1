/*
  # Add Anonymous Access to FAQs and Helpful Tips

  ## Problem
  Occupants use custom session-based authentication and don't have auth.uid() set,
  so they cannot access FAQs and helpful tips which are restricted to authenticated users only.

  ## Solution
  Add RLS policies to allow anonymous (anon) users to read published FAQs and active tips.
  This is safe because:
  - FAQs and tips are public knowledge articles meant to help all users
  - Only published/active content is visible
  - No sensitive information is exposed
  - Admins still need authentication to create/update/delete content

  ## Changes
  1. Add policy for anon users to view published FAQs
  2. Add policy for anon users to view active helpful tips
  3. Grant execute permissions on helper functions to anon users

  ## Security
  - Anonymous users can only SELECT (read) data
  - Only published FAQs (is_published = true) are visible
  - Only active tips (is_active = true) are visible
  - All write operations still require authentication
*/

-- Allow anonymous users to view published FAQs
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anonymous users can view published FAQs" ON faqs;
END $$;

CREATE POLICY "Anonymous users can view published FAQs"
  ON faqs FOR SELECT
  TO anon
  USING (is_published = true);

-- Allow anonymous users to view active helpful tips
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anonymous users can view active tips" ON helpful_tips;
END $$;

CREATE POLICY "Anonymous users can view active tips"
  ON helpful_tips FOR SELECT
  TO anon
  USING (is_active = true);

-- Grant execute permissions on FAQ functions to anon users
-- (They already have it from the original migration, but ensuring it's set)
GRANT EXECUTE ON FUNCTION increment_faq_views TO anon;
GRANT EXECUTE ON FUNCTION mark_faq_helpful TO anon;
