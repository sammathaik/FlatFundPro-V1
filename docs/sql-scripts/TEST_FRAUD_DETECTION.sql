-- Test Fraud Detection with Sample Data from the Fraudulent Image
-- This demonstrates how the text-based fraud detection would flag the suspicious payment

-- First, let's create a test payment submission with data similar to the fraudulent image
INSERT INTO payment_submissions (
  apartment_id,
  block_id,
  flat_id,
  name,
  email,
  payment_amount,
  payment_date,
  screenshot_url,
  screenshot_filename,
  transaction_reference,
  sender_upi_id,
  other_text,
  bank_name,
  occupant_type
) VALUES (
  (SELECT id FROM apartments LIMIT 1),
  (SELECT id FROM buildings_blocks_phases LIMIT 1),
  (SELECT id FROM flat_numbers LIMIT 1),
  'Test User',
  'test@example.com',
  16000,
  '2025-10-13'::date, -- FUTURE DATE - Should be flagged!
  'https://example.com/fake-screenshot.jpg',
  'fake-screenshot.jpg',
  'fakeupi@okaxis', -- SUSPICIOUS - contains "fake"
  'fakeupi@okaxis', -- SUSPICIOUS UPI ID
  'Completeds', -- TYPO - Should be "Completed"
  'Axis Bank 8813',
  'Owner'
)
RETURNING id;

-- Now test the fraud detection function on this payment
-- Replace 'PAYMENT_ID_HERE' with the ID returned above
SELECT validate_payment_text_fields('PAYMENT_ID_HERE');

-- Expected Result:
-- The function should return a JSON object with:
-- - fraud_score: 85+ (CRITICAL)
-- - is_flagged: true
-- - indicators: Array containing multiple fraud indicators:
--   1. FUTURE_DATE (40 points) - Payment date is 2025-10-13
--   2. SUSPICIOUS_TRANSACTION_ID (30 points) - Contains "fake"
--   3. SUSPICIOUS_UPI_ID (30 points) - Contains "fake"
--   4. SUSPICIOUS_TYPO (15 points) - "Completeds" typo

-- To see the detailed fraud indicators:
-- SELECT
--   id,
--   payment_date,
--   transaction_reference,
--   sender_upi_id,
--   other_text,
--   (SELECT validate_payment_text_fields(id)) as fraud_analysis
-- FROM payment_submissions
-- WHERE transaction_reference = 'fakeupi@okaxis';

-- Clean up test data (uncomment to remove test payment)
-- DELETE FROM payment_submissions WHERE transaction_reference = 'fakeupi@okaxis';
