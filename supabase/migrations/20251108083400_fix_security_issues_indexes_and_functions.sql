/*
  # Fix Security Issues - Indexes and Function Search Paths

  1. Add Missing Indexes for Foreign Keys
    - payment_submissions.block_id
    - payment_submissions.flat_id
    - payment_submissions.reviewed_by
    These indexes improve query performance for joins and foreign key lookups

  2. Remove Unused Indexes
    - idx_apartments_city
    - idx_apartments_country
    - idx_payment_submissions_quarter (quarter is already indexed via enum filter)
    - idx_payment_submissions_transaction_ref
    - idx_payment_submissions_comments
    Unused indexes waste storage and slow down INSERT/UPDATE operations

  3. Fix Function Search Path Security
    - Add SECURITY DEFINER where needed
    - Set explicit search_path to prevent injection
    - Make functions immutable where possible

  4. Notes
    - Leaked password protection must be enabled in Supabase Dashboard
    - Cannot be set via SQL migration
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Index for payment_submissions.block_id foreign key
CREATE INDEX IF NOT EXISTS idx_payment_submissions_block_id 
ON payment_submissions(block_id);

-- Index for payment_submissions.flat_id foreign key
CREATE INDEX IF NOT EXISTS idx_payment_submissions_flat_id 
ON payment_submissions(flat_id);

-- Index for payment_submissions.reviewed_by foreign key
CREATE INDEX IF NOT EXISTS idx_payment_submissions_reviewed_by 
ON payment_submissions(reviewed_by);

COMMENT ON INDEX idx_payment_submissions_block_id IS 'Foreign key index for joins with buildings_blocks_phases';
COMMENT ON INDEX idx_payment_submissions_flat_id IS 'Foreign key index for joins with flat_numbers';
COMMENT ON INDEX idx_payment_submissions_reviewed_by IS 'Foreign key index for joins with admins';

-- ============================================================================
-- 2. REMOVE UNUSED INDEXES
-- ============================================================================

-- Drop unused apartment indexes (city and country are rarely queried alone)
DROP INDEX IF EXISTS idx_apartments_city;
DROP INDEX IF EXISTS idx_apartments_country;

-- Drop unused payment submission indexes
DROP INDEX IF EXISTS idx_payment_submissions_quarter;
DROP INDEX IF EXISTS idx_payment_submissions_transaction_ref;
DROP INDEX IF EXISTS idx_payment_submissions_comments;

-- ============================================================================
-- 3. FIX FUNCTION SEARCH PATH SECURITY
-- ============================================================================

-- Recreate calculate_payment_quarter with secure search_path
DROP FUNCTION IF EXISTS calculate_payment_quarter(date, timestamptz);

CREATE OR REPLACE FUNCTION calculate_payment_quarter(payment_date date, submission_date timestamptz)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quarter_num integer;
  year_num integer;
  date_to_use timestamptz;
BEGIN
  -- Use payment_date if provided, otherwise fall back to submission_date
  IF payment_date IS NOT NULL THEN
    date_to_use := payment_date::timestamptz;
  ELSE
    date_to_use := submission_date;
  END IF;
  
  -- Extract year and month
  year_num := EXTRACT(YEAR FROM date_to_use);
  
  -- Calculate quarter based on month
  quarter_num := CASE 
    WHEN EXTRACT(MONTH FROM date_to_use) BETWEEN 1 AND 3 THEN 1
    WHEN EXTRACT(MONTH FROM date_to_use) BETWEEN 4 AND 6 THEN 2
    WHEN EXTRACT(MONTH FROM date_to_use) BETWEEN 7 AND 9 THEN 3
    ELSE 4
  END;
  
  -- Return formatted quarter
  RETURN 'Q' || quarter_num || '-' || year_num;
END;
$$;

-- Recreate set_payment_quarter with secure search_path
DROP FUNCTION IF EXISTS set_payment_quarter() CASCADE;

CREATE OR REPLACE FUNCTION set_payment_quarter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate quarter based on payment_date (user-entered) or created_at (fallback)
  NEW.payment_quarter := calculate_payment_quarter(NEW.payment_date, NEW.created_at);
  RETURN NEW;
END;
$$;

-- Recreate trigger (CASCADE dropped it)
CREATE TRIGGER trigger_set_payment_quarter
  BEFORE INSERT OR UPDATE ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_quarter();

-- ============================================================================
-- 4. ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON FUNCTION calculate_payment_quarter(date, timestamptz) IS 'Calculates quarter from payment_date with SECURITY DEFINER and explicit search_path';
COMMENT ON FUNCTION set_payment_quarter() IS 'Trigger function with SECURITY DEFINER and explicit search_path to prevent injection';

-- ============================================================================
-- 5. NOTES ON MANUAL CONFIGURATION
-- ============================================================================

/*
  LEAKED PASSWORD PROTECTION:
  
  This setting cannot be enabled via SQL migration. To enable it:
  
  1. Go to Supabase Dashboard
  2. Navigate to Authentication → Providers
  3. Find "Password" provider settings
  4. Enable "Check against compromised passwords (HaveIBeenPwned)"
  5. Save changes
  
  This will prevent users from using passwords that have been leaked in data breaches.
  
  The feature uses the HaveIBeenPwned.org API to check password security without
  exposing the actual password (uses k-anonymity model with partial hash matching).
*/
