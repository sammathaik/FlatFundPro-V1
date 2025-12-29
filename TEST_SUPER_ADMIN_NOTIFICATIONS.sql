-- Test Super Admin Notification System
-- Run these queries to test the notification bell icon for super admins

-- Step 1: View existing super admin notifications
SELECT
  notification_type,
  title,
  message,
  severity,
  is_read,
  is_resolved,
  created_at
FROM super_admin_notifications
ORDER BY created_at DESC;

-- Step 2: Count unread notifications (should match the red badge number)
SELECT COUNT(*) as unread_count
FROM super_admin_notifications
WHERE is_read = false
AND is_resolved = false;

-- Step 3: Simulate a NEW LEAD submission (this will auto-trigger a notification)
INSERT INTO marketing_leads (
  name,
  email,
  phone,
  apartment_name,
  city,
  message,
  status
) VALUES (
  'John Doe',
  'john.doe@test-apartment.com',
  '+1-555-0123',
  'Test Apartment Complex',
  'Mumbai',
  'We are interested in using FlatFundPro for our 50-unit apartment complex. Please contact us for a demo.',
  'new'
);

-- Step 4: Verify the notification was automatically created
SELECT
  notification_type,
  title,
  message,
  severity,
  related_lead_id,
  created_at
FROM super_admin_notifications
WHERE notification_type = 'new_lead'
ORDER BY created_at DESC
LIMIT 1;

-- Step 5: View the lead that triggered the notification
SELECT
  l.name,
  l.email,
  l.phone,
  l.apartment_name,
  l.city,
  l.status,
  l.created_at,
  n.title as notification_title,
  n.is_read as notification_read
FROM marketing_leads l
LEFT JOIN super_admin_notifications n ON n.related_lead_id = l.id
ORDER BY l.created_at DESC
LIMIT 5;

-- Step 6: Create a MANUAL TEST notification (for immediate testing)
INSERT INTO super_admin_notifications (
  notification_type,
  title,
  message,
  severity,
  is_read,
  is_resolved
) VALUES (
  'test_notification',
  'Test: Super Admin Notification System',
  'This is a test notification to verify the bell icon is working correctly for super admins.',
  'medium',
  false,
  false
);

-- Step 7: Create a HIGH PRIORITY test notification
INSERT INTO super_admin_notifications (
  notification_type,
  title,
  message,
  severity,
  is_read,
  is_resolved
) VALUES (
  'test_critical',
  'URGENT: System Alert Test',
  'This is a high-priority test notification for super admins.',
  'high',
  false,
  false
);

-- Step 8: Verify all test notifications were created
SELECT
  notification_type,
  title,
  severity,
  is_read,
  created_at
FROM super_admin_notifications
ORDER BY created_at DESC
LIMIT 10;

-- Step 9: Check notification statistics
SELECT
  notification_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count,
  COUNT(*) FILTER (WHERE is_resolved = false) as active_count
FROM super_admin_notifications
GROUP BY notification_type
ORDER BY total_count DESC;

-- CLEANUP: Remove test notifications (run this after testing)
/*
DELETE FROM super_admin_notifications
WHERE notification_type LIKE 'test%';

DELETE FROM marketing_leads
WHERE email = 'john.doe@test-apartment.com';
*/
