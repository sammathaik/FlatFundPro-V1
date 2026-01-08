-- Diagnostic Query for Duplicate Emails and Missing WhatsApp in Communication Audit

-- 1. Check recent G-10 payment submissions
SELECT
  'PAYMENT SUBMISSIONS' as check_type,
  id,
  flat_id,
  name,
  contact_number,
  payment_amount,
  status,
  occupant_type,
  created_at
FROM payment_submissions
WHERE flat_id IN (SELECT id FROM flat_numbers WHERE flat_number = 'G-10')
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check G-10 communication logs
SELECT
  'COMMUNICATION LOGS' as check_type,
  id,
  flat_number,
  recipient_name,
  recipient_email,
  recipient_mobile,
  communication_channel,
  communication_type,
  status,
  created_at,
  triggered_by_event
FROM communication_logs
WHERE flat_number = 'G-10'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check flat_email_mappings for G-10
SELECT
  'FLAT EMAIL MAPPINGS' as check_type,
  flat_id,
  (SELECT flat_number FROM flat_numbers WHERE id = flat_email_mappings.flat_id) as flat_number,
  name,
  email,
  mobile,
  whatsapp_opt_in,
  occupant_type
FROM flat_email_mappings
WHERE flat_id IN (SELECT id FROM flat_numbers WHERE flat_number = 'G-10');

-- 4. Check if there's a duplicate trigger issue by looking at pg_net requests
-- (This will show if the trigger is firing multiple times)
SELECT
  'PG_NET REQUESTS' as check_type,
  id,
  request_id,
  url,
  created_at,
  response_status,
  response_body
FROM net._http_response
WHERE url LIKE '%send-payment-acknowledgment%'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check notification_outbox for WhatsApp notifications
SELECT
  'NOTIFICATION OUTBOX' as check_type,
  id,
  flat_number,
  recipient_name,
  recipient_phone,
  channel,
  message_type,
  status,
  created_at,
  trigger_reason
FROM notification_outbox
WHERE flat_number = 'G-10'
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check for duplicate communication logs (same payment_id, same channel, same timestamp)
SELECT
  'DUPLICATE EMAILS' as check_type,
  related_payment_id,
  communication_channel,
  communication_type,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as log_ids,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM communication_logs
WHERE flat_number = 'G-10'
  AND communication_channel = 'EMAIL'
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY related_payment_id, communication_channel, communication_type
HAVING COUNT(*) > 1;
