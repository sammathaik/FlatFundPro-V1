-- ==================================================================
-- TEST: Verify that email reminders EXCLUDE flats with Approved payments
-- ==================================================================
-- This verifies that only flats WITHOUT 'Approved' status receive reminders
-- Replace YOUR_APARTMENT_ID and YOUR_COLLECTION_ID with actual values
-- ==================================================================

-- Step 1: Check all payment statuses for your collection
SELECT
  fn.flat_number,
  bbp.block_name,
  ps.status,
  ps.payment_amount,
  ps.payment_date,
  ps.created_at,
  ps.reviewed_at,
  CASE
    WHEN ps.status = 'Approved' THEN '✓ Should NOT receive reminder'
    WHEN ps.status = 'Reviewed' THEN '✗ Should receive reminder'
    WHEN ps.status = 'Received' THEN '✗ Should receive reminder'
    WHEN ps.status IS NULL THEN '✗ Should receive reminder (no payment)'
  END as reminder_expectation
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
LEFT JOIN payment_submissions ps ON ps.flat_id = fn.id
  AND ps.apartment_id = 'YOUR_APARTMENT_ID'
  AND ps.expected_collection_id = 'YOUR_COLLECTION_ID'
WHERE bbp.apartment_id = 'YOUR_APARTMENT_ID'
ORDER BY fn.flat_number;

-- ==================================================================
-- Step 2: Test the exact logic used in get_flats_without_payment
-- This shows ONLY flats that should receive reminders
-- ==================================================================

SELECT
  fn.flat_number,
  bbp.block_name,
  fem.email,
  'Should receive reminder' as reason,
  COALESCE(ps.status, 'No payment submitted') as current_payment_status
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id
  AND fem.apartment_id = 'YOUR_APARTMENT_ID'
LEFT JOIN payment_submissions ps ON ps.flat_id = fn.id
  AND ps.apartment_id = 'YOUR_APARTMENT_ID'
  AND ps.expected_collection_id = 'YOUR_COLLECTION_ID'
WHERE bbp.apartment_id = 'YOUR_APARTMENT_ID'
AND fem.email IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM payment_submissions ps2
  WHERE ps2.flat_id = fn.id
  AND ps2.apartment_id = 'YOUR_APARTMENT_ID'
  AND ps2.expected_collection_id = 'YOUR_COLLECTION_ID'
  AND ps2.status = 'Approved'  -- This excludes Approved payments
)
ORDER BY fn.flat_number;

-- ==================================================================
-- Step 3: Show flats that should NOT receive reminders
-- (These have Approved status)
-- ==================================================================

SELECT
  fn.flat_number,
  bbp.block_name,
  fem.email,
  ps.status,
  ps.payment_amount,
  ps.reviewed_at,
  'Should NOT receive reminder - Already Approved' as reason
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id
  AND fem.apartment_id = 'YOUR_APARTMENT_ID'
JOIN payment_submissions ps ON ps.flat_id = fn.id
  AND ps.apartment_id = 'YOUR_APARTMENT_ID'
  AND ps.expected_collection_id = 'YOUR_COLLECTION_ID'
WHERE bbp.apartment_id = 'YOUR_APARTMENT_ID'
AND ps.status = 'Approved'
ORDER BY fn.flat_number;

-- ==================================================================
-- Step 4: Summary - Count by status
-- ==================================================================

SELECT
  COALESCE(ps.status, 'No Payment') as payment_status,
  COUNT(DISTINCT fn.id) as flat_count,
  CASE
    WHEN ps.status = 'Approved' THEN 'Will NOT receive reminders'
    ELSE 'Will receive reminders'
  END as reminder_behavior
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id
  AND fem.apartment_id = 'YOUR_APARTMENT_ID'
LEFT JOIN payment_submissions ps ON ps.flat_id = fn.id
  AND ps.apartment_id = 'YOUR_APARTMENT_ID'
  AND ps.expected_collection_id = 'YOUR_COLLECTION_ID'
WHERE bbp.apartment_id = 'YOUR_APARTMENT_ID'
AND fem.email IS NOT NULL
GROUP BY ps.status
ORDER BY
  CASE ps.status
    WHEN 'Approved' THEN 1
    WHEN 'Reviewed' THEN 2
    WHEN 'Received' THEN 3
    ELSE 4
  END;

-- ==================================================================
-- Step 5: Verify actual reminders sent vs expected
-- Compare who received reminders against their payment status
-- ==================================================================

SELECT
  er.recipient_email,
  fn.flat_number,
  bbp.block_name,
  er.sent_at,
  COALESCE(ps.status, 'No Payment') as payment_status_at_reminder_time,
  CASE
    WHEN ps.status = 'Approved' THEN '⚠️ ERROR: Approved flat got reminder!'
    ELSE '✓ OK: Flat correctly received reminder'
  END as validation_result
FROM email_reminders er
LEFT JOIN flat_numbers fn ON er.flat_id = fn.id
LEFT JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
LEFT JOIN payment_submissions ps ON ps.flat_id = fn.id
  AND ps.apartment_id = er.apartment_id
  AND ps.expected_collection_id = er.expected_collection_id
  AND ps.created_at < er.sent_at  -- Payment existed before reminder
WHERE er.apartment_id = 'YOUR_APARTMENT_ID'
AND er.expected_collection_id = 'YOUR_COLLECTION_ID'
ORDER BY er.sent_at DESC;

-- ==================================================================
-- EXPECTED RESULTS:
-- - Step 2: Shows only flats WITHOUT Approved status
-- - Step 3: Shows flats WITH Approved status (excluded from reminders)
-- - Step 4: Summary showing reminder behavior by status
-- - Step 5: Validates that no Approved flats received reminders
-- ==================================================================
