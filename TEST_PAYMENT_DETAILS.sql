/*
  Test Payment Details Feature

  This file contains sample SQL commands to test the new expandable payment details feature.
  Run these commands in your Supabase SQL editor to populate test data.
*/

-- ============================================================================
-- OPTION 1: Update an existing payment with full details
-- ============================================================================

-- Replace [PAYMENT_ID] with an actual payment ID from your database
-- You can find payment IDs by running: SELECT id, name FROM payment_submissions LIMIT 5;

UPDATE payment_submissions
SET
  payer_name = 'Rajesh Kumar',
  payee_name = 'Sunshine Apartments Society',
  bank_name = 'HDFC Bank',
  currency = 'INR',
  platform = 'UPI',
  payment_type = 'Quarterly Maintenance',
  sender_upi_id = 'rajeshkumar@oksbi',
  receiver_account = 'sunshineapt@hdfcbank',
  ifsc_code = 'HDFC0001234',
  narration = 'Maintenance payment for Q4-2024 - Flat A-101',
  screenshot_source = 'WhatsApp',
  other_text = 'Payment confirmed by bank. Transaction successful at 10:30 AM.'
WHERE id = '1704b222-c2b3-4945-93d6-bce2c7c6c272';

-- ============================================================================
-- OPTION 2: Update with partial details (some fields populated)
-- ============================================================================

UPDATE payment_submissions
SET
  payer_name = 'Priya Sharma',
  bank_name = 'ICICI Bank',
  platform = 'NEFT',
  payment_type = 'Maintenance',
  narration = 'Regular monthly maintenance charge',
  screenshot_source = 'Email'
WHERE id = '2018b1dc-49c4-46b8-9ff8-511afca8d919';

-- ============================================================================
-- OPTION 3: Update with UPI payment details
-- ============================================================================

UPDATE payment_submissions
SET
  payer_name = 'Amit Patel',
  payee_name = 'Green Valley Apartments',
  platform = 'Google Pay',
  payment_type = 'Maintenance Fee',
  sender_upi_id = 'amitpatel@ybl',
  receiver_account = 'greenvalley@ybl',
  currency = 'INR',
  narration = 'Maintenance charges - March 2024',
  screenshot_source = 'Google Pay Screenshot',
  other_text = 'Payment made via Google Pay. UPI transaction ID: 123456789012'
WHERE id = '599c9862-e940-4c50-9025-213a60501c51';

-- ============================================================================
-- OPTION 4: View the updated data
-- ============================================================================

SELECT
  id,
  name,
  payment_amount,
  payer_name,
  payee_name,
  bank_name,
  platform,
  sender_upi_id,
  narration
FROM payment_submissions
WHERE payer_name IS NOT NULL
ORDER BY created_at DESC;

-- ============================================================================
-- OPTION 5: Sample make.com API payload
-- ============================================================================

/*
  For make.com integration, use this JSON payload format:

  PATCH https://rjiesmcmdfoavggkhasn.supabase.co/rest/v1/payment_submissions?id=eq.[PAYMENT_ID]

  Headers:
  {
    "apikey": "YOUR_SUPABASE_ANON_KEY",
    "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  }

  Body:
  {
    "payer_name": "John Doe",
    "payee_name": "ABC Apartments",
    "bank_name": "HDFC Bank",
    "currency": "INR",
    "platform": "UPI",
    "payment_type": "Maintenance",
    "sender_upi_id": "johndoe@oksbi",
    "receiver_account": "abcapartments@hdfcbank",
    "ifsc_code": "HDFC0001234",
    "narration": "Maintenance payment for Q1-2024",
    "screenshot_source": "WhatsApp",
    "other_text": "Additional notes here"
  }
*/

-- ============================================================================
-- OPTION 6: Clear test data (reset to null)
-- ============================================================================

/*
-- Uncomment to clear payment details from a specific payment:

UPDATE payment_submissions
SET
  payer_name = NULL,
  payee_name = NULL,
  bank_name = NULL,
  currency = NULL,
  platform = NULL,
  payment_type = NULL,
  sender_upi_id = NULL,
  receiver_account = NULL,
  ifsc_code = NULL,
  narration = NULL,
  screenshot_source = NULL,
  other_text = NULL
WHERE id = '[PAYMENT_ID]';
*/

-- ============================================================================
-- VERIFICATION: Check all new columns exist
-- ============================================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_submissions'
  AND column_name IN (
    'payer_name', 'payee_name', 'bank_name', 'currency',
    'platform', 'payment_type', 'sender_upi_id', 'receiver_account',
    'ifsc_code', 'narration', 'screenshot_source', 'other_text'
  )
ORDER BY column_name;

-- Expected output: 12 rows with data_type = 'text' and is_nullable = 'YES'
