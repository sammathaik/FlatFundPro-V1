-- ================================================================
-- Test Email Reminder System
-- ================================================================
-- This script helps you verify the email reminder system is ready
-- ================================================================

-- 1. Check if email_reminders table exists
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'email_reminders'
ORDER BY ordinal_position;

-- 2. Verify the RPC function exists
SELECT
  proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname = 'get_flats_without_payment';

-- 3. Check active collections with flats that need reminders
SELECT
  a.apartment_name,
  ec.collection_name,
  ec.payment_type,
  ec.due_date,
  ec.amount_due,
  COUNT(DISTINCT fn.id) as total_flats,
  COUNT(DISTINCT fem.flat_id) as flats_with_email,
  COUNT(DISTINCT CASE WHEN ps.status = 'Approved' THEN ps.flat_id END) as flats_paid,
  COUNT(DISTINCT fem.flat_id) - COUNT(DISTINCT CASE WHEN ps.status = 'Approved' THEN ps.flat_id END) as flats_needing_reminder
FROM expected_collections ec
JOIN apartments a ON ec.apartment_id = a.id
JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.id
JOIN flat_numbers fn ON fn.block_id = bbp.id
LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id AND fem.apartment_id = a.id
LEFT JOIN payment_submissions ps ON ps.flat_id = fn.id
  AND ps.expected_collection_id = ec.id
  AND ps.status = 'Approved'
WHERE ec.is_active = true
GROUP BY a.id, a.apartment_name, ec.id, ec.collection_name, ec.payment_type, ec.due_date, ec.amount_due
ORDER BY ec.due_date;

-- 4. Check sample flats without payment for a specific collection
-- Replace the UUIDs below with actual IDs from your database
/*
SELECT
  fn.flat_number,
  bbp.block_name,
  fem.email,
  fem.mobile,
  fem.occupant_type,
  ec.collection_name,
  ec.amount_due,
  ec.due_date,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM payment_submissions ps
      WHERE ps.flat_id = fn.id
      AND ps.expected_collection_id = ec.id
      AND ps.status = 'Approved'
    ) THEN 'Has Payment'
    ELSE 'Needs Reminder'
  END as payment_status
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id
CROSS JOIN expected_collections ec
WHERE ec.is_active = true
AND ec.id = 'YOUR_COLLECTION_ID_HERE'  -- Replace with actual collection ID
AND bbp.apartment_id = 'YOUR_APARTMENT_ID_HERE'  -- Replace with actual apartment ID
ORDER BY fn.flat_number;
*/

-- 5. View recent email reminder history (after testing)
/*
SELECT
  er.sent_at,
  er.recipient_email,
  fn.flat_number,
  ec.collection_name,
  er.reminder_type,
  er.status,
  er.error_message
FROM email_reminders er
LEFT JOIN flat_numbers fn ON er.flat_id = fn.id
LEFT JOIN expected_collections ec ON er.expected_collection_id = ec.id
ORDER BY er.sent_at DESC
LIMIT 20;
*/

-- 6. Summary of email reminders sent (grouped by status)
/*
SELECT
  DATE(sent_at) as date,
  status,
  COUNT(*) as count,
  COUNT(DISTINCT flat_id) as unique_flats
FROM email_reminders
WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(sent_at), status
ORDER BY date DESC, status;
*/
