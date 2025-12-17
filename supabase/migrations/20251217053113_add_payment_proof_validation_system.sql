/*
  # Payment Proof Validation System

  1. Purpose
    - Add comprehensive payment validation infrastructure
    - Store OCR extracted text and AI classification results
    - Track validation status and confidence scoring

  2. New Columns
    - `ocr_text`: Raw text extracted from payment proof (OCR)
    - `extracted_amount`: Amount extracted from payment proof
    - `extracted_date`: Date extracted from payment proof
    - `extracted_transaction_ref`: Transaction reference from OCR
    - `payment_type`: Type of payment (UPI, NEFT, IMPS, RTGS, etc.)
    - `payment_platform`: Platform used (MyGate, NoBroker, Adda, Bank, UPI App)
    - `validation_status`: AUTO_APPROVED, MANUAL_REVIEW, REJECTED, PENDING
    - `validation_confidence_score`: 0-100 confidence score
    - `validation_reason`: Detailed reason for validation decision
    - `ai_classification`: JSON result from AI classification
    - `validation_performed_at`: Timestamp of validation

  3. Security
    - Maintains existing RLS policies
    - Admin-only access to validation fields
*/

-- Add OCR and validation columns
DO $$ 
BEGIN
  -- Raw OCR text
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'ocr_text'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN ocr_text text;
  END IF;

  -- Extracted amount from OCR
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'extracted_amount'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN extracted_amount decimal(10,2);
  END IF;

  -- Extracted date from OCR
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'extracted_date'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN extracted_date date;
  END IF;

  -- Extracted transaction reference from OCR
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'extracted_transaction_ref'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN extracted_transaction_ref text;
  END IF;

  -- Payment type (UPI, NEFT, IMPS, RTGS, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN payment_type text;
  END IF;

  -- Payment platform (MyGate, NoBroker, Adda, Bank, UPI App)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'payment_platform'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN payment_platform text;
  END IF;

  -- Validation status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'validation_status'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN validation_status text DEFAULT 'PENDING';
  END IF;

  -- Validation confidence score (0-100)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'validation_confidence_score'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN validation_confidence_score int DEFAULT 0;
  END IF;

  -- Validation reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'validation_reason'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN validation_reason text;
  END IF;

  -- AI classification result (JSON)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'ai_classification'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN ai_classification jsonb;
  END IF;

  -- Validation timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_submissions' AND column_name = 'validation_performed_at'
  ) THEN
    ALTER TABLE payment_submissions 
    ADD COLUMN validation_performed_at timestamptz;
  END IF;
END $$;

-- Create indexes for validation queries
CREATE INDEX IF NOT EXISTS idx_payment_submissions_validation_status 
ON payment_submissions(validation_status);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_validation_score 
ON payment_submissions(validation_confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_payment_type 
ON payment_submissions(payment_type);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_payment_platform 
ON payment_submissions(payment_platform);

-- Add comments for documentation
COMMENT ON COLUMN payment_submissions.ocr_text IS 'Raw text extracted from payment proof via OCR';
COMMENT ON COLUMN payment_submissions.extracted_amount IS 'Amount extracted from payment proof';
COMMENT ON COLUMN payment_submissions.extracted_date IS 'Date extracted from payment proof';
COMMENT ON COLUMN payment_submissions.extracted_transaction_ref IS 'Transaction reference extracted from payment proof';
COMMENT ON COLUMN payment_submissions.payment_type IS 'Payment method: UPI, NEFT, IMPS, RTGS, etc.';
COMMENT ON COLUMN payment_submissions.payment_platform IS 'Platform: MyGate, NoBroker, Adda, Bank, UPI App';
COMMENT ON COLUMN payment_submissions.validation_status IS 'AUTO_APPROVED, MANUAL_REVIEW, REJECTED, or PENDING';
COMMENT ON COLUMN payment_submissions.validation_confidence_score IS 'Confidence score 0-100 for validation decision';
COMMENT ON COLUMN payment_submissions.validation_reason IS 'Detailed explanation of validation decision';
COMMENT ON COLUMN payment_submissions.ai_classification IS 'JSON result from AI classification model';
COMMENT ON COLUMN payment_submissions.validation_performed_at IS 'Timestamp when validation was performed';
