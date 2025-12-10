/*
  # Add Payment Source Field

  1. Changes
    - Add `payment_source` column to store payment methods (UPI, Bank Transfer, Check, etc.)
    - This field is for payment methods from external automation or manual entry
    - The `payment_type` field remains for Owner/Tenant designation (maintenance, contingency, emergency)
  
  2. Data Migration
    - Move any payment method values from `payment_type` to `payment_source`
    - Clear `payment_type` values that are payment methods (not payment categories)
  
  3. Purpose
    - `payment_type`: What the payment is for (maintenance, contingency, emergency) - from user form
    - `payment_source`: How the payment was made (UPI, Bank Transfer, Check, etc.) - from external automation
*/

-- Add payment_source column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_submissions' AND column_name = 'payment_source'
  ) THEN
    ALTER TABLE payment_submissions ADD COLUMN payment_source text;
    
    -- Add comment to clarify purpose
    COMMENT ON COLUMN payment_submissions.payment_source IS 'Payment method: UPI, Bank Transfer, Check, etc. Used by external automation.';
    COMMENT ON COLUMN payment_submissions.payment_type IS 'Payment category: maintenance, contingency, emergency, etc. Set by user during submission.';
  END IF;
END $$;

-- Migrate existing payment method data from payment_type to payment_source
-- Move values like "UPI", "Bank Transfer" from payment_type to payment_source
UPDATE payment_submissions
SET 
  payment_source = payment_type,
  payment_type = NULL
WHERE payment_type IN ('UPI', 'Bank Transfer', 'Check', 'Cash', 'NEFT', 'RTGS', 'IMPS', 'Online Transfer', 'Cheque');

-- Create an index on payment_source for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_submissions_payment_source 
ON payment_submissions(payment_source);
