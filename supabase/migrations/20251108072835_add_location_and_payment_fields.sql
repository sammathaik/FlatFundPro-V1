/*
  # Add Location and Payment Fields

  1. Changes to Apartments Table
    - Add `city` column (text) - city or town name
    - Add `country` column (text) - country name for flag display
    - Add indexes for better query performance
  
  2. Changes to Payment Submissions Table
    - Add `transaction_reference` column (text) - transaction reference number
    - Add `payment_quarter` column (text) - computed quarter like Q4-2025, Q1-2026
    - Add index on payment_quarter for filtering
  
  3. Security
    - All existing RLS policies remain unchanged
    - New columns follow same security model
    - Super admins and apartment admins have appropriate access
  
  4. Data Migration
    - Existing records get NULL values (will be updated via UI)
    - Future records require these fields based on UI validation
*/

-- ============================================================================
-- 1. ADD LOCATION FIELDS TO APARTMENTS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add city column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apartments' AND column_name = 'city'
  ) THEN
    ALTER TABLE apartments ADD COLUMN city text;
  END IF;

  -- Add country column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apartments' AND column_name = 'country'
  ) THEN
    ALTER TABLE apartments ADD COLUMN country text;
  END IF;
END $$;

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_apartments_city ON apartments(city);
CREATE INDEX IF NOT EXISTS idx_apartments_country ON apartments(country);

-- ============================================================================
-- 2. ADD PAYMENT FIELDS TO PAYMENT_SUBMISSIONS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add transaction_reference column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_submissions' AND column_name = 'transaction_reference'
  ) THEN
    ALTER TABLE payment_submissions ADD COLUMN transaction_reference text;
  END IF;

  -- Add payment_quarter column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_submissions' AND column_name = 'payment_quarter'
  ) THEN
    ALTER TABLE payment_submissions ADD COLUMN payment_quarter text;
  END IF;
END $$;

-- Add index for quarter-based filtering
CREATE INDEX IF NOT EXISTS idx_payment_submissions_quarter ON payment_submissions(payment_quarter);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_transaction_ref ON payment_submissions(transaction_reference);

-- ============================================================================
-- 3. CREATE FUNCTION TO CALCULATE PAYMENT QUARTER
-- ============================================================================

-- Function to calculate quarter from date (e.g., Q4-2025, Q1-2026)
CREATE OR REPLACE FUNCTION calculate_payment_quarter(submission_date timestamptz)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  quarter_num integer;
  year_num integer;
BEGIN
  -- Extract year and month
  year_num := EXTRACT(YEAR FROM submission_date);
  
  -- Calculate quarter based on month
  quarter_num := CASE 
    WHEN EXTRACT(MONTH FROM submission_date) BETWEEN 1 AND 3 THEN 1
    WHEN EXTRACT(MONTH FROM submission_date) BETWEEN 4 AND 6 THEN 2
    WHEN EXTRACT(MONTH FROM submission_date) BETWEEN 7 AND 9 THEN 3
    ELSE 4
  END;
  
  -- Return formatted quarter
  RETURN 'Q' || quarter_num || '-' || year_num;
END;
$$;

-- ============================================================================
-- 4. UPDATE EXISTING PAYMENT RECORDS WITH CALCULATED QUARTERS
-- ============================================================================

-- Update all existing payment records with calculated quarters based on created_at
UPDATE payment_submissions
SET payment_quarter = calculate_payment_quarter(created_at)
WHERE payment_quarter IS NULL;

-- ============================================================================
-- 5. CREATE TRIGGER TO AUTO-CALCULATE QUARTER ON INSERT/UPDATE
-- ============================================================================

-- Function for trigger
CREATE OR REPLACE FUNCTION set_payment_quarter()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate quarter based on created_at timestamp
  NEW.payment_quarter := calculate_payment_quarter(NEW.created_at);
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_set_payment_quarter ON payment_submissions;

-- Create trigger to auto-set payment_quarter on insert or update
CREATE TRIGGER trigger_set_payment_quarter
  BEFORE INSERT OR UPDATE ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_quarter();

-- ============================================================================
-- 6. ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON COLUMN apartments.city IS 'City or town where the apartment complex is located';
COMMENT ON COLUMN apartments.country IS 'Country where the apartment complex is located (used for flag display)';
COMMENT ON COLUMN payment_submissions.transaction_reference IS 'Transaction reference number or ID from payment gateway';
COMMENT ON COLUMN payment_submissions.payment_quarter IS 'Calculated quarter in format Q1-2026, Q2-2026, etc. Auto-populated from created_at';
