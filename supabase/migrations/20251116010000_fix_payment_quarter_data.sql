/*
  # Fix Payment Quarter Data Issues
  
  - Ensures all payment_submissions have payment_quarter calculated
  - Fixes any NULL payment_quarter values
  - Verifies trigger is working correctly
  - Ensures future submissions always have payment_quarter set
*/

-- ============================================================================
-- 1. VERIFY TRIGGER EXISTS AND IS WORKING
-- ============================================================================

-- Check if trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_set_payment_quarter' 
    AND tgrelid = 'payment_submissions'::regclass
  ) THEN
    -- Recreate trigger if it doesn't exist
    CREATE TRIGGER trigger_set_payment_quarter
      BEFORE INSERT OR UPDATE ON payment_submissions
      FOR EACH ROW
      EXECUTE FUNCTION set_payment_quarter();
    
    RAISE NOTICE 'Created missing trigger_set_payment_quarter';
  END IF;
END $$;

-- ============================================================================
-- 2. FIX ALL NULL payment_quarter VALUES
-- ============================================================================

-- Update all records with NULL payment_quarter
UPDATE payment_submissions
SET payment_quarter = calculate_payment_quarter(payment_date, created_at)
WHERE payment_quarter IS NULL;

-- ============================================================================
-- 3. VERIFY NO NULL VALUES REMAIN
-- ============================================================================

-- Check if any NULL values remain (this should return 0 rows)
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM payment_submissions
  WHERE payment_quarter IS NULL;
  
  IF null_count > 0 THEN
    RAISE WARNING 'Found % records with NULL payment_quarter after update', null_count;
  ELSE
    RAISE NOTICE 'All payment_submissions now have payment_quarter set';
  END IF;
END $$;

-- ============================================================================
-- 4. ADD CONSTRAINT TO PREVENT NULL payment_quarter (Optional - can be commented out)
-- ============================================================================

-- Uncomment the following if you want to enforce NOT NULL at database level
-- ALTER TABLE payment_submissions 
--   ALTER COLUMN payment_quarter SET NOT NULL;

-- ============================================================================
-- 5. VERIFY TRIGGER FUNCTION IS CORRECT
-- ============================================================================

-- Ensure set_payment_quarter function exists and is correct
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

COMMENT ON FUNCTION set_payment_quarter() IS 'Trigger function to automatically set payment_quarter on insert/update. Uses payment_date if available, otherwise uses created_at.';


