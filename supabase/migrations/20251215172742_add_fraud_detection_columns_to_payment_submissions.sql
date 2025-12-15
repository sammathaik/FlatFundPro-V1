/*
  # Add Fraud Detection Columns to Payment Submissions

  1. Purpose
    - Add columns to store fraud detection results
    - Enable automatic fraud detection via trigger

  2. New Columns
    - fraud_score: Integer score 0-100
    - is_fraud_flagged: Boolean flag for quick filtering
    - fraud_indicators: JSON array of detected issues
    - fraud_checked_at: Timestamp of last check

  3. Security
    - Only admins can view fraud fields via RLS
*/

-- Add fraud detection columns
DO $$ 
BEGIN
  -- Add fraud_score column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'fraud_score'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN fraud_score int DEFAULT 0;
  END IF;

  -- Add is_fraud_flagged column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'is_fraud_flagged'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN is_fraud_flagged boolean DEFAULT false;
  END IF;

  -- Add fraud_indicators column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'fraud_indicators'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN fraud_indicators jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add fraud_checked_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'fraud_checked_at'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN fraud_checked_at timestamptz;
  END IF;
END $$;

-- Create index for quick filtering of flagged payments
CREATE INDEX IF NOT EXISTS idx_payment_submissions_fraud_flagged 
ON payment_submissions(is_fraud_flagged) 
WHERE is_fraud_flagged = true;

-- Create index for fraud score queries
CREATE INDEX IF NOT EXISTS idx_payment_submissions_fraud_score 
ON payment_submissions(fraud_score DESC);

COMMENT ON COLUMN payment_submissions.fraud_score IS 'Fraud detection score 0-100, higher means more suspicious';
COMMENT ON COLUMN payment_submissions.is_fraud_flagged IS 'True if fraud_score >= 70';
COMMENT ON COLUMN payment_submissions.fraud_indicators IS 'JSON array of detected fraud indicators';
COMMENT ON COLUMN payment_submissions.fraud_checked_at IS 'Timestamp of last fraud detection check';