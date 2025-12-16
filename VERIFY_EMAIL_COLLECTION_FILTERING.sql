-- ==================================================================
-- DIAGNOSTIC QUERY: Verify Email Collection Filtering
-- ==================================================================
-- This query helps verify that email reminders are sent only for
-- the specific collection selected, not all collections.
--
-- Run this BEFORE and AFTER sending reminders to verify proper filtering
-- ==================================================================

-- Step 1: Check all active collections for your apartment
-- Replace 'YOUR_APARTMENT_ID' with your actual apartment ID
SELECT
  id,
  collection_name,
  payment_type,
  financial_year,
  quarter,
  due_date,
  is_active,
  amount_due
FROM expected_collections
WHERE apartment_id = 'YOUR_APARTMENT_ID'
AND is_active = true
ORDER BY due_date DESC;

-- ==================================================================
-- Step 2: For a SPECIFIC collection, see which flats need reminders
-- Replace 'YOUR_APARTMENT_ID' and 'SPECIFIC_COLLECTION_ID'
-- ==================================================================

WITH flats_needing_reminder AS (
  SELECT
    fn.id as flat_id,
    fn.flat_number,
    bbp.block_name,
    fem.email,
    fem.mobile,
    fem.occupant_type,
    ec.collection_name,
    ec.payment_type,
    ec.amount_due,
    ec.due_date,
    ec.id as collection_id
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id
    AND fem.apartment_id = 'YOUR_APARTMENT_ID'
  CROSS JOIN expected_collections ec
  WHERE bbp.apartment_id = 'YOUR_APARTMENT_ID'
  AND ec.id = 'SPECIFIC_COLLECTION_ID'  -- THIS FILTERS TO ONE COLLECTION
  AND fem.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM payment_submissions ps
    WHERE ps.flat_id = fn.id
    AND ps.apartment_id = 'YOUR_APARTMENT_ID'
    AND ps.expected_collection_id = 'SPECIFIC_COLLECTION_ID'
    AND ps.status = 'Approved'
  )
)
SELECT
  flat_number,
  block_name,
  email,
  occupant_type,
  collection_name,
  payment_type,
  amount_due,
  due_date::date
FROM flats_needing_reminder
ORDER BY flat_number;

-- ==================================================================
-- Step 3: Verify that the function returns the same results
-- Replace 'YOUR_APARTMENT_ID' and 'SPECIFIC_COLLECTION_ID'
-- ==================================================================

SELECT get_flats_without_payment(
  'YOUR_APARTMENT_ID'::uuid,
  'SPECIFIC_COLLECTION_ID'::uuid
);

-- ==================================================================
-- Step 4: Check email reminders that were actually sent
-- This shows WHICH collection each reminder was for
-- ==================================================================

SELECT
  er.sent_at,
  er.recipient_email,
  er.reminder_type,
  er.status,
  ec.collection_name,
  ec.payment_type,
  ec.financial_year,
  ec.quarter,
  fn.flat_number,
  bbp.block_name
FROM email_reminders er
JOIN expected_collections ec ON er.expected_collection_id = ec.id
LEFT JOIN flat_numbers fn ON er.flat_id = fn.id
LEFT JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
WHERE er.apartment_id = 'YOUR_APARTMENT_ID'
ORDER BY er.sent_at DESC
LIMIT 50;

-- ==================================================================
-- Step 5: VERIFY: Count reminders sent per collection
-- This proves that reminders are being sent for specific collections
-- ==================================================================

SELECT
  ec.collection_name,
  ec.payment_type,
  ec.financial_year,
  ec.quarter,
  COUNT(er.id) as reminders_sent,
  array_agg(DISTINCT fn.flat_number ORDER BY fn.flat_number) as flats_reminded
FROM email_reminders er
JOIN expected_collections ec ON er.expected_collection_id = ec.id
LEFT JOIN flat_numbers fn ON er.flat_id = fn.id
WHERE er.apartment_id = 'YOUR_APARTMENT_ID'
AND er.sent_at >= (CURRENT_DATE - INTERVAL '7 days')
GROUP BY ec.id, ec.collection_name, ec.payment_type, ec.financial_year, ec.quarter
ORDER BY MAX(er.sent_at) DESC;

-- ==================================================================
-- EXPECTED RESULTS:
-- - Step 2 should show ONLY flats without payment for THAT collection
-- - Step 3 should return the same list as Step 2
-- - Step 4 should show that reminders were sent with the correct collection
-- - Step 5 should show reminders grouped by collection, proving separation
-- ==================================================================
