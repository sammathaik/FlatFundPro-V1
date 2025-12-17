/*
  # Add OCR Quality and Manual Review Fields

  1. Purpose
    - Track OCR extraction quality separately from validation confidence
    - Flag submissions that require manual review
    - Store OCR preprocessing attempts and results

  2. New Columns
    - `ocr_quality` (text) - HIGH, MEDIUM, LOW, FAILED
    - `ocr_confidence_score` (integer) - 0-100 score for OCR quality
    - `requires_manual_review` (boolean) - Flag for admin review
    - `ocr_attempts` (jsonb) - Log of OCR preprocessing attempts
    - `manual_review_reason` (text) - Why manual review is needed

  3. Changes
    - Add columns to payment_submissions table
    - Update existing validation logic to separate OCR quality from payment validation
*/

-- Add OCR quality tracking fields
ALTER TABLE payment_submissions
ADD COLUMN IF NOT EXISTS ocr_quality text CHECK (ocr_quality IN ('HIGH', 'MEDIUM', 'LOW', 'FAILED')),
ADD COLUMN IF NOT EXISTS ocr_confidence_score integer CHECK (ocr_confidence_score >= 0 AND ocr_confidence_score <= 100),
ADD COLUMN IF NOT EXISTS requires_manual_review boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_review_reason text,
ADD COLUMN IF NOT EXISTS ocr_attempts jsonb DEFAULT '[]'::jsonb;

-- Add index for manual review filtering
CREATE INDEX IF NOT EXISTS idx_payment_submissions_manual_review ON payment_submissions(requires_manual_review) WHERE requires_manual_review = true;

-- Add comment
COMMENT ON COLUMN payment_submissions.ocr_quality IS 'Quality of OCR text extraction: HIGH (>70%), MEDIUM (40-70%), LOW (<40%), FAILED (no text)';
COMMENT ON COLUMN payment_submissions.ocr_confidence_score IS 'Tesseract confidence score for OCR extraction (0-100)';
COMMENT ON COLUMN payment_submissions.requires_manual_review IS 'Flag indicating this submission needs admin review';
COMMENT ON COLUMN payment_submissions.manual_review_reason IS 'Reason why manual review is required';
COMMENT ON COLUMN payment_submissions.ocr_attempts IS 'Log of OCR preprocessing attempts with results';
