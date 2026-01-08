-- TEST PAYMENT ACKNOWLEDGMENT EMAIL SYSTEM
-- Run these queries to test the automatic email acknowledgment feature

-- =============================================================================
-- STEP 1: Verify Email Mappings Exist
-- =============================================================================

-- Check if there are any email mappings
SELECT
  fem.flat_id,
  fem.email,
  fem.name,
  f.flat_number,
  a.apartment_name
FROM flat_email_mappings fem
JOIN flats f ON fem.flat_id = f.flat_id
JOIN blocks b ON f.block_id = b.block_id
JOIN apartments a ON b.apartment_id = a.apartment_id
LIMIT 5;

-- =============================================================================
-- STEP 2: Check Trigger and Function Exist
-- =============================================================================

-- Verify trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_payment_acknowledgment';

-- Verify function exists
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'send_payment_acknowledgment_email';

-- =============================================================================
-- STEP 3: Test Payment Submission (REPLACE flat_id with actual value)
-- =============================================================================

-- Option A: Insert test payment for an existing flat
-- IMPORTANT: Replace <FLAT_ID> with actual flat_id from Step 1
/*
INSERT INTO payment_submissions (
  flat_id,
  payment_type,
  payment_amount,
  payment_quarter,
  payment_date,
  name,
  email,
  mobile,
  status,
  payment_source
) VALUES (
  '<FLAT_ID>',  -- Replace with actual flat_id
  'maintenance',
  5000,
  'Q1-2024',
  CURRENT_DATE,
  'Test User',
  'test@example.com',  -- Replace with your test email
  '9876543210',
  'pending',
  'public_form'
);
*/

-- =============================================================================
-- STEP 4: Verify Payment Was Inserted
-- =============================================================================

-- Check recent payment submissions
SELECT
  ps.id,
  ps.flat_id,
  ps.name,
  ps.email,
  ps.payment_type,
  ps.payment_amount,
  ps.payment_quarter,
  ps.submitted_at,
  ps.status,
  fem.email as mapped_email,
  f.flat_number,
  a.apartment_name
FROM payment_submissions ps
LEFT JOIN flat_email_mappings fem ON ps.flat_id = fem.flat_id
LEFT JOIN flats f ON ps.flat_id = f.flat_id
LEFT JOIN blocks b ON f.block_id = b.block_id
LEFT JOIN apartments a ON b.apartment_id = a.apartment_id
ORDER BY ps.submitted_at DESC
LIMIT 5;

-- =============================================================================
-- STEP 5: Check pg_net Extension and Requests
-- =============================================================================

-- Verify pg_net extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Check recent HTTP requests (if pg_net is being used)
-- Note: This table might not exist if pg_net hasn't made any requests yet
/*
SELECT
  id,
  created,
  url,
  status_code,
  content
FROM net._http_response
ORDER BY created DESC
LIMIT 10;
*/

-- =============================================================================
-- STEP 6: Manual Test of Edge Function (Use in Browser/Postman)
-- =============================================================================

/*
To test the edge function directly, use this curl command:

curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-payment-acknowledgment \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@example.com",
    "name": "Test User",
    "flat_number": "101",
    "apartment_name": "Test Apartment",
    "payment_type": "maintenance",
    "payment_amount": 5000,
    "payment_quarter": "Q1-2024",
    "submission_date": "2024-12-18T14:30:00Z"
  }'

Replace:
- YOUR_PROJECT_REF with your Supabase project reference
- YOUR_ANON_KEY with your Supabase anon key
- email with your test email address
*/

-- =============================================================================
-- STEP 7: Check for Errors in Logs
-- =============================================================================

-- Enable detailed logging for debugging
SET client_min_messages TO NOTICE;

-- Test trigger manually (if needed)
-- This won't actually send email but will show any errors
/*
SELECT send_payment_acknowledgment_email();
*/

-- =============================================================================
-- STEP 8: Cleanup Test Data (Optional)
-- =============================================================================

-- Remove test payment after verification
/*
DELETE FROM payment_submissions
WHERE name = 'Test User'
  AND email = 'test@example.com'
  AND payment_amount = 5000
  AND submitted_at > NOW() - INTERVAL '1 hour';
*/

-- =============================================================================
-- VERIFICATION CHECKLIST
-- =============================================================================

/*
After inserting a test payment, verify:

1. ✓ Payment appears in payment_submissions table
2. ✓ Email mapping exists for the flat
3. ✓ No errors in Supabase logs/console
4. ✓ Email received in inbox within 30 seconds
5. ✓ Email has correct formatting and data
6. ✓ Subject line is correct
7. ✓ Email sender is "FlatFund Pro"

If email not received:
- Check spam/junk folder
- Verify RESEND_API_KEY is configured in Supabase
- Check Supabase function logs for errors
- Verify email address in flat_email_mappings
- Test edge function directly using curl command
*/

-- =============================================================================
-- TROUBLESHOOTING QUERIES
-- =============================================================================

-- Check if flat has email mapping
SELECT
  f.flat_id,
  f.flat_number,
  fem.email,
  fem.name,
  a.apartment_name
FROM flats f
LEFT JOIN flat_email_mappings fem ON f.flat_id = fem.flat_id
LEFT JOIN blocks b ON f.block_id = b.block_id
LEFT JOIN apartments a ON b.apartment_id = a.apartment_id
WHERE f.flat_id = '<FLAT_ID>';  -- Replace with your flat_id

-- Check payment details with all related info
SELECT
  ps.*,
  f.flat_number,
  a.apartment_name,
  fem.email as occupant_email,
  fem.name as occupant_name
FROM payment_submissions ps
JOIN flats f ON ps.flat_id = f.flat_id
JOIN blocks b ON f.block_id = b.block_id
JOIN apartments a ON b.apartment_id = a.apartment_id
LEFT JOIN flat_email_mappings fem ON ps.flat_id = fem.flat_id
WHERE ps.id = '<PAYMENT_ID>';  -- Replace with your payment id
