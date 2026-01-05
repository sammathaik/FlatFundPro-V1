-- Test Script: Occupant Notification Center
-- This script demonstrates how to test the notification center functionality

-- ============================================================
-- PART 1: View Notification Center Setup
-- ============================================================

-- Check if notification table exists and has correct structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'occupant_notifications'
ORDER BY ordinal_position;

-- Check available notification functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%notification%'
ORDER BY routine_name;

-- ============================================================
-- PART 2: Test Data - Create Sample Notifications
-- ============================================================

-- Get a test occupant's details
SELECT
  fem.mobile,
  fem.flat_id,
  fem.apartment_id,
  a.apartment_name,
  f.flat_number,
  fem.name as occupant_name
FROM flat_email_mappings fem
JOIN apartments a ON a.id = fem.apartment_id
JOIN flat_numbers f ON f.id = fem.flat_id
WHERE fem.mobile IS NOT NULL
LIMIT 3;

-- Create test notifications for an occupant
-- Replace the values below with actual values from your database

/*
-- Example: Create a payment approved notification
INSERT INTO occupant_notifications (
  apartment_id,
  flat_id,
  recipient_mobile,
  type,
  title,
  message,
  priority,
  related_entity_type,
  context_data
) VALUES (
  '31cefafb-be45-46ee-8558-a75f9f271923', -- Replace with actual apartment_id
  'your-flat-id-here', -- Replace with actual flat_id
  '+919876544010', -- Replace with actual mobile
  'payment_approved',
  'Payment Approved ✓',
  'Your payment submission for Maintenance Collection Q4 - 2026 has been approved by the committee.

Amount: ₹5000
Payment Date: 04 Jan 2026',
  'normal',
  'payment_submission',
  '{"payment_amount": 5000, "collection_name": "Maintenance Collection Q4 - 2026"}'::jsonb
);

-- Example: Create a payment clarification needed notification
INSERT INTO occupant_notifications (
  apartment_id,
  flat_id,
  recipient_mobile,
  type,
  title,
  message,
  priority,
  related_entity_type,
  context_data
) VALUES (
  '31cefafb-be45-46ee-8558-a75f9f271923',
  'your-flat-id-here',
  '+919876544010',
  'payment_clarification_needed',
  'Payment Submission Needs Attention',
  'Your payment submission for Maintenance Collection Q4 - 2026 requires clarification.

Committee Note: Please provide clearer payment screenshot showing transaction reference.',
  'high',
  'payment_submission',
  '{"payment_amount": 5000, "collection_name": "Maintenance Collection Q4 - 2026"}'::jsonb
);

-- Example: Create a collection announcement
INSERT INTO occupant_notifications (
  apartment_id,
  flat_id,
  recipient_mobile,
  type,
  title,
  message,
  priority,
  related_entity_type,
  context_data
) VALUES (
  '31cefafb-be45-46ee-8558-a75f9f271923',
  'your-flat-id-here',
  '+919876544010',
  'collection_announcement',
  'Collection Update',
  'New collection period is now open: Maintenance Collection Q1 - 2027

Due Date: 31 Mar 2027
Amount: ₹5000

Please submit your payment through the occupant portal.',
  'normal',
  'collection',
  '{"collection_name": "Maintenance Collection Q1 - 2027"}'::jsonb
);
*/

-- ============================================================
-- PART 3: Test Notification Functions
-- ============================================================

-- Get all user flats with unread counts
-- Replace mobile number with actual test mobile
SELECT * FROM get_user_flats_for_notifications('+919876544010');

-- Get notifications for a specific flat
-- Replace parameters with actual values
SELECT * FROM get_occupant_notifications(
  p_mobile := '+919876544010',
  p_flat_id := NULL, -- Will show all flats
  p_apartment_id := NULL,
  p_limit := 50,
  p_unread_only := false
);

-- Get unread notification count for a user
SELECT get_unread_notification_count(
  p_mobile := '+919876544010',
  p_flat_id := NULL,
  p_apartment_id := NULL
);

-- ============================================================
-- PART 4: Test Mark as Read Functionality
-- ============================================================

-- Mark a specific notification as read
-- Replace notification_id with actual notification ID
/*
SELECT mark_notification_as_read(
  p_notification_id := 'your-notification-id-here',
  p_mobile := '+919876544010'
);
*/

-- Mark all notifications as read for a flat
-- Replace parameters with actual values
/*
SELECT mark_all_notifications_as_read(
  p_mobile := '+919876544010',
  p_flat_id := 'your-flat-id-here',
  p_apartment_id := 'your-apartment-id-here'
);
*/

-- ============================================================
-- PART 5: Verify Automatic Notification Creation
-- ============================================================

-- Test automatic notification on payment approval
-- This should trigger the notification automatically

-- First, find a pending payment
SELECT id, apartment_id, email, mobile, collection_name, status
FROM payment_submissions
WHERE status = 'pending'
LIMIT 1;

-- Update payment status to approved (this will trigger notification)
/*
UPDATE payment_submissions
SET status = 'approved',
    admin_comments = 'Payment verified and approved by committee'
WHERE id = 'your-payment-id-here';
*/

-- Check if notification was created
SELECT
  n.title,
  n.message,
  n.type,
  n.priority,
  n.is_read,
  n.created_at,
  a.apartment_name,
  f.flat_number
FROM occupant_notifications n
JOIN apartments a ON a.id = n.apartment_id
JOIN flat_numbers f ON f.id = n.flat_id
ORDER BY n.created_at DESC
LIMIT 10;

-- ============================================================
-- PART 6: Multi-Flat Scenario Test
-- ============================================================

-- Find users with multiple flats
SELECT
  fem.mobile,
  COUNT(DISTINCT fem.flat_id) as flat_count,
  array_agg(DISTINCT f.flat_number) as flats,
  array_agg(DISTINCT a.apartment_name) as apartments
FROM flat_email_mappings fem
JOIN flat_numbers f ON f.id = fem.flat_id
JOIN apartments a ON a.id = fem.apartment_id
WHERE fem.mobile IS NOT NULL
GROUP BY fem.mobile
HAVING COUNT(DISTINCT fem.flat_id) > 1;

-- Test notifications for multi-flat user
-- This should show notifications filtered correctly per flat

-- ============================================================
-- PART 7: Cleanup (Optional)
-- ============================================================

-- Delete test notifications (if needed)
/*
DELETE FROM occupant_notifications
WHERE created_at > now() - interval '1 hour'
  AND message LIKE '%test%';
*/

-- ============================================================
-- TESTING CHECKLIST
-- ============================================================

/*
□ Notification table created with correct structure
□ All functions created and accessible
□ Bell icon visible in occupant portal
□ Unread count badge displays correctly
□ Notification center opens on bell click
□ Multi-flat selector shows all user's flats
□ Notifications filtered by selected flat
□ Mark as read functionality works
□ Mark all as read works
□ Unread count updates after marking read
□ Automatic notifications created on payment approval
□ Automatic notifications created on payment rejection
□ Notification icons display correctly
□ Notification colors match priority/type
□ No notifications visible from other flats
□ Mobile responsive design works well
*/
