/*
  # Recalculate Payment Quarters from payment_date
  
  - Recalculates payment_quarter for all records that have payment_date
  - Ensures payment_quarter uses payment_date (user-specified) instead of created_at
  - Only updates records where payment_date exists and quarter might be wrong
*/

-- ============================================================================
-- 1. VERIFY TRIGGER FUNCTION USES payment_date
-- ============================================================================

-- Ensure the trigger function correctly uses payment_date
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

-- ============================================================================
-- 2. RECALCULATE ALL QUARTERS FROM payment_date
-- ============================================================================

-- Update all records that have payment_date to use payment_date for quarter calculation
UPDATE payment_submissions
SET payment_quarter = calculate_payment_quarter(payment_date, created_at)
WHERE payment_date IS NOT NULL;

-- Also update records without payment_date to ensure they're using created_at
UPDATE payment_submissions
SET payment_quarter = calculate_payment_quarter(NULL::date, created_at)
WHERE payment_date IS NULL AND payment_quarter IS NULL;

-- ============================================================================
-- 3. VERIFY CALCULATIONS
-- ============================================================================

-- Check for any records where payment_quarter doesn't match what it should be
DO $$
DECLARE
  mismatch_count integer;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM payment_submissions ps
  WHERE (
    -- Records with payment_date should use payment_date for quarter
    (ps.payment_date IS NOT NULL 
     AND ps.payment_quarter != calculate_payment_quarter(ps.payment_date, ps.created_at))
    OR
    -- Records without payment_date should use created_at for quarter
    (ps.payment_date IS NULL 
     AND ps.payment_quarter != calculate_payment_quarter(NULL::date, ps.created_at))
  );
  
  IF mismatch_count > 0 THEN
    RAISE WARNING 'Found % records where payment_quarter does not match expected calculation', mismatch_count;
  ELSE
    RAISE NOTICE 'All payment_quarter values are correctly calculated from payment_date (or created_at if payment_date is NULL)';
  END IF;
END $$;

-- ============================================================================
-- 4. SHOW SUMMARY
-- ============================================================================

-- Show summary of the update
SELECT 
  'Summary' as info,
  COUNT(*) FILTER (WHERE payment_date IS NOT NULL) as records_with_payment_date,
  COUNT(*) FILTER (WHERE payment_date IS NULL) as records_without_payment_date,
  COUNT(*) as total_records
FROM payment_submissions;

COMMENT ON FUNCTION set_payment_quarter() IS 'Trigger function to automatically set payment_quarter on insert/update. Uses payment_date (user-specified transaction date) if available, otherwise uses created_at (submission timestamp).';


