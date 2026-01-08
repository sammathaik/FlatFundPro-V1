-- Debug Communication Audit System
-- Check why communications are not being logged

-- 1. Check if communication_logs table exists and has data
SELECT
  'Total communication logs' as check_type,
  COUNT(*) as count
FROM communication_logs;

-- 2. Check recent payment submissions
SELECT
  'Recent payment submissions (last 24h)' as check_type,
  COUNT(*) as count
FROM payment_submissions
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 3. Check if any communications were logged for recent payments
SELECT
  ps.id as payment_id,
  ps.flat_number,
  ps.submitted_by_name,
  ps.submitted_by_email,
  ps.submitted_by_mobile,
  ps.status,
  ps.created_at as payment_created_at,
  cl.id as communication_log_id,
  cl.communication_channel,
  cl.status as comm_status,
  cl.created_at as comm_created_at
FROM payment_submissions ps
LEFT JOIN communication_logs cl ON cl.payment_id = ps.id
WHERE ps.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ps.created_at DESC
LIMIT 10;

-- 4. Check if the trigger exists and is enabled
SELECT
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE trigger_name LIKE '%communication%'
   OR trigger_name LIKE '%acknowledgment%'
   OR trigger_name LIKE '%notification%';

-- 5. Check if the log_communication_event function exists
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'log_communication_event'
   OR routine_name LIKE '%communication%'
   OR routine_name LIKE '%acknowledgment%';

-- 6. Check notification_outbox for WhatsApp messages
SELECT
  id,
  flat_number,
  recipient_mobile,
  message_type,
  status,
  created_at,
  sent_at,
  error_message
FROM notification_outbox
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 7. Check audit_logs for any system activity
SELECT
  action,
  table_name,
  record_id,
  changes,
  created_at
FROM audit_logs
WHERE table_name IN ('payment_submissions', 'communication_logs', 'notification_outbox')
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- 8. Test if we can manually call log_communication_event
SELECT
  'Testing log_communication_event function' as test_type,
  log_communication_event(
    (SELECT id FROM apartments LIMIT 1),
    'TEST-DEBUG',
    'Debug Test',
    'debug@test.com',
    '+919999999999',
    'EMAIL'::communication_channel,
    'test',
    NULL,
    'Debug Test Subject',
    'Debug test message to verify function works',
    '{"test": true}'::jsonb,
    'DELIVERED'::communication_status,
    NULL,
    'manual_debug_test',
    'debug_test_v1',
    NULL
  ) as result;

-- 9. Verify the function was inserted
SELECT
  id,
  flat_number,
  communication_channel,
  triggered_by_event,
  created_at
FROM communication_logs
WHERE triggered_by_event = 'manual_debug_test'
ORDER BY created_at DESC
LIMIT 1;

-- 10. Clean up debug test
DELETE FROM communication_logs WHERE triggered_by_event = 'manual_debug_test';
