-- Test WhatsApp Notification with Sample Data
-- This script helps you verify the Gupshup integration

-- 1. Check current notifications in the outbox
SELECT
  id,
  recipient_name,
  recipient_phone,
  LEFT(message_preview, 50) as message_start,
  status,
  failure_reason,
  created_at
FROM notification_outbox
ORDER BY created_at DESC
LIMIT 10;

-- 2. View the SIMULATED notification ready for testing
-- This one is ready to be sent via Test Send button
SELECT
  id,
  recipient_name,
  recipient_phone,
  message_preview,
  status,
  created_at
FROM notification_outbox
WHERE status = 'SIMULATED'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Check recent failures to see error messages
SELECT
  id,
  recipient_name,
  recipient_phone,
  status,
  failure_reason,
  created_at
FROM notification_outbox
WHERE status = 'SANDBOX_FAILED'
ORDER BY created_at DESC
LIMIT 5;

-- 4. After fixing API key and testing, check if message was sent successfully
SELECT
  id,
  recipient_name,
  recipient_phone,
  status,
  sent_at,
  created_at
FROM notification_outbox
WHERE status = 'SANDBOX_SENT'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Reset a failed notification back to SIMULATED for retesting
-- Uncomment and run this to retry a specific notification:
/*
UPDATE notification_outbox
SET
  status = 'SIMULATED',
  failure_reason = NULL,
  sent_at = NULL
WHERE id = '7f3de921-6242-4cce-9c3c-279d832668ba'; -- Use actual notification ID
*/

-- 6. View notification statistics
SELECT
  status,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM notification_outbox
GROUP BY status
ORDER BY count DESC;
