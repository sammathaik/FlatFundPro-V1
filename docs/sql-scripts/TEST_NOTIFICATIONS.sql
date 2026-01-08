-- Test Notification System
-- Run these queries to test the notification bell icon

-- Step 1: Check your apartment ID (replace email with your admin email)
SELECT
  a.id as apartment_id,
  a.apartment_name,
  adm.admin_name,
  adm.email
FROM admins adm
JOIN apartments a ON adm.apartment_id = a.id
WHERE adm.email = 'meenakshi.admin@example.com';  -- Replace with your email

-- Step 2: View existing notifications for your apartment
SELECT
  notification_type,
  title,
  message,
  severity,
  is_read,
  is_resolved,
  created_at
FROM admin_notifications
WHERE apartment_id = (
  SELECT apartment_id FROM admins
  WHERE email = 'meenakshi.admin@example.com'  -- Replace with your email
  LIMIT 1
)
ORDER BY created_at DESC;

-- Step 3: Create a TEST notification
INSERT INTO admin_notifications (
  apartment_id,
  notification_type,
  title,
  message,
  severity,
  is_read,
  is_resolved
) VALUES (
  (SELECT apartment_id FROM admins
   WHERE email = 'meenakshi.admin@example.com'  -- Replace with your email
   LIMIT 1),
  'test_notification',
  'Test Alert: Notification System Working',
  'This is a test notification to verify the bell icon is functioning correctly. You should see a red badge appear on the bell icon.',
  'medium',
  false,
  false
);

-- Step 4: Create a HIGH SEVERITY notification
INSERT INTO admin_notifications (
  apartment_id,
  notification_type,
  title,
  message,
  severity,
  is_read,
  is_resolved
) VALUES (
  (SELECT apartment_id FROM admins
   WHERE email = 'meenakshi.admin@example.com'  -- Replace with your email
   LIMIT 1),
  'test_critical',
  'URGENT: High Priority Alert',
  'This is a high severity test notification. These typically indicate issues requiring immediate attention.',
  'high',
  false,
  false
);

-- Step 5: Create a LOW SEVERITY notification
INSERT INTO admin_notifications (
  apartment_id,
  notification_type,
  title,
  message,
  severity,
  is_read,
  is_resolved
) VALUES (
  (SELECT apartment_id FROM admins
   WHERE email = 'meenakshi.admin@example.com'  -- Replace with your email
   LIMIT 1),
  'test_info',
  'Info: Low Priority Notice',
  'This is an informational notification for routine matters.',
  'low',
  false,
  false
);

-- Step 6: Verify notifications were created
SELECT
  notification_type,
  title,
  severity,
  is_read,
  created_at
FROM admin_notifications
WHERE apartment_id = (
  SELECT apartment_id FROM admins
  WHERE email = 'meenakshi.admin@example.com'  -- Replace with your email
  LIMIT 1
)
AND notification_type LIKE 'test%'
ORDER BY created_at DESC;

-- Step 7: Count unread notifications (should match the red badge number)
SELECT COUNT(*) as unread_count
FROM admin_notifications
WHERE apartment_id = (
  SELECT apartment_id FROM admins
  WHERE email = 'meenakshi.admin@example.com'  -- Replace with your email
  LIMIT 1
)
AND is_read = false
AND is_resolved = false;

-- CLEANUP: Remove test notifications (run this after testing)
/*
DELETE FROM admin_notifications
WHERE apartment_id = (
  SELECT apartment_id FROM admins
  WHERE email = 'meenakshi.admin@example.com'  -- Replace with your email
  LIMIT 1
)
AND notification_type LIKE 'test%';
*/
