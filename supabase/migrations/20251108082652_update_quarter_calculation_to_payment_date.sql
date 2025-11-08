/*
  # Update Quarter Calculation to Use Payment Date

  1. Changes
    - Modify calculate_payment_quarter function to accept payment_date parameter
    - Update trigger to use payment_date instead of created_at
    - Recalculate all existing quarters based on payment_date
    - If payment_date is null, fall back to created_at
  
  2. Purpose
    - Quarter should reflect when payment was made (user-entered date)
    - Not when the submission was recorded in the system
    - Better reflects actual financial quarters
  
  3. Data Update
    - All existing records will be updated with correct quarters
    - Records without payment_date will use created_at as fallback
*/

-- ============================================================================
-- 1. UPDATE FUNCTION TO USE PAYMENT_DATE
-- ============================================================================

-- Drop existing function and recreate with payment_date logic
DROP FUNCTION IF EXISTS calculate_payment_quarter(timestamptz);

CREATE OR REPLACE FUNCTION calculate_payment_quarter(payment_date date, submission_date timestamptz)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
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

-- ============================================================================
-- 2. UPDATE TRIGGER FUNCTION
-- ============================================================================

-- Recreate trigger function to use payment_date
CREATE OR REPLACE FUNCTION set_payment_quarter()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate quarter based on payment_date (user-entered) or created_at (fallback)
  NEW.payment_quarter := calculate_payment_quarter(NEW.payment_date, NEW.created_at);
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger (trigger name remains the same)
DROP TRIGGER IF EXISTS trigger_set_payment_quarter ON payment_submissions;

CREATE TRIGGER trigger_set_payment_quarter
  BEFORE INSERT OR UPDATE ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_quarter();

-- ============================================================================
-- 3. RECALCULATE ALL EXISTING QUARTERS
-- ============================================================================

-- Update all existing payment records with correct quarters based on payment_date
UPDATE payment_submissions
SET payment_quarter = calculate_payment_quarter(payment_date, created_at);

-- ============================================================================
-- 4. ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON FUNCTION calculate_payment_quarter(date, timestamptz) IS 'Calculates quarter based on payment_date (user-entered transaction date). Falls back to submission date if payment_date is null.';

COMMENT ON COLUMN payment_submissions.payment_quarter IS 'Calculated quarter based on payment_date (when payment was made), not created_at (when submitted). Format: Q1-2026, Q2-2026, etc.';
