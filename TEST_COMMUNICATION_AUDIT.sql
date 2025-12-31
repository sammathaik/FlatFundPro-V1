-- Test Communication Audit System
-- This script inserts test communication records to verify the system works

-- Step 1: Get your apartment_id (replace with your actual apartment)
-- Run this first to find your apartment_id:
-- SELECT id, apartment_name FROM apartments;

-- Step 2: Insert test communications (replace 'YOUR_APARTMENT_ID' and 'YOUR_PAYMENT_ID' with actual values)

-- Test Email Communication
SELECT log_communication_event(
  'YOUR_APARTMENT_ID'::uuid,  -- Replace with actual apartment_id
  'A-101',                      -- Flat number
  'Test Resident',              -- Recipient name
  'test@example.com',           -- Recipient email
  '+919876543210',              -- Recipient mobile
  'EMAIL'::communication_channel,
  'payment_acknowledgment',     -- Communication type
  'YOUR_PAYMENT_ID'::uuid,      -- Replace with actual payment_id (or NULL)
  'Payment Received - Test',    -- Subject
  'This is a test payment acknowledgment message for Flat A-101. Amount: ₹5000. Thank you for your submission.',
  '{"test": true, "amount": 5000}'::jsonb,
  'DELIVERED'::communication_status,
  NULL,                         -- Triggered by user (NULL for system)
  'manual_test',                -- Triggered by event
  'payment_acknowledgment_v1',  -- Template name
  NULL                          -- WhatsApp opt-in (NULL for email)
);

-- Test WhatsApp Communication
SELECT log_communication_event(
  'YOUR_APARTMENT_ID'::uuid,  -- Replace with actual apartment_id
  'A-102',                      -- Flat number
  'Another Resident',           -- Recipient name
  NULL,                         -- No email for WhatsApp
  '+919876543211',              -- Recipient mobile
  'WHATSAPP'::communication_channel,
  'payment_approval',           -- Communication type
  'YOUR_PAYMENT_ID'::uuid,      -- Replace with actual payment_id (or NULL)
  'Payment Approved',           -- Subject
  'Your payment for Flat A-102 has been approved! Amount: ₹5000. Thank you!',
  '{"test": true, "amount": 5000, "gupshup_id": "test123"}'::jsonb,
  'DELIVERED'::communication_status,
  NULL,
  'manual_test',
  'payment_approval_v1',
  true                          -- WhatsApp opt-in
);

-- Test Failed Communication
SELECT log_communication_event(
  'YOUR_APARTMENT_ID'::uuid,
  'A-103',
  'Failed Test',
  'invalid@email',
  NULL,
  'EMAIL'::communication_channel,
  'payment_reminder',
  NULL,
  'Payment Reminder - Overdue',
  'This is a test failed communication for Flat A-103.',
  '{"test": true, "error": "Invalid email address"}'::jsonb,
  'FAILED'::communication_status,
  NULL,
  'manual_test',
  'payment_reminder_v1',
  NULL
);

-- Verify the test data was inserted
SELECT
  id,
  flat_number,
  recipient_name,
  recipient_email,
  mask_mobile_number(recipient_mobile) as mobile_masked,
  communication_channel,
  communication_type,
  status,
  message_subject,
  message_preview,
  created_at
FROM communication_logs
WHERE triggered_by_event = 'manual_test'
ORDER BY created_at DESC;

-- Clean up test data (run this after testing)
-- DELETE FROM communication_logs WHERE triggered_by_event = 'manual_test';
