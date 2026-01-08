-- QUICK TEST: Create Sample Communications
-- This will insert test data so you can see the Communication Audit dashboard in action

-- Step 1: Get the first apartment ID (you can change this to your specific apartment)
DO $$
DECLARE
  v_apartment_id uuid;
  v_payment_id uuid;
BEGIN
  -- Get the first apartment
  SELECT id INTO v_apartment_id FROM apartments LIMIT 1;

  -- Get a payment ID if one exists (or use NULL)
  SELECT id INTO v_payment_id FROM payment_submissions LIMIT 1;

  -- Insert 5 test communications with different scenarios

  -- 1. Successful Email Acknowledgment
  PERFORM log_communication_event(
    v_apartment_id,
    'TEST-101',
    'John Doe',
    'john.doe@example.com',
    '+919876543210',
    'EMAIL'::communication_channel,
    'payment_acknowledgment',
    v_payment_id,
    'Payment Received - Under Review | Maintenance ₹5,000',
    'We have successfully received your payment submission for Flat TEST-101. Amount: ₹5,000. Your payment is now under review.',
    jsonb_build_object(
      'payment_type', 'Maintenance',
      'payment_amount', 5000,
      'test_data', true
    ),
    'DELIVERED'::communication_status,
    NULL,
    'test_insertion',
    'payment_acknowledgment_v1',
    NULL
  );

  -- 2. Successful WhatsApp Approval
  PERFORM log_communication_event(
    v_apartment_id,
    'TEST-102',
    'Jane Smith',
    'jane.smith@example.com',
    '+919876543211',
    'WHATSAPP'::communication_channel,
    'payment_approval',
    v_payment_id,
    'Payment Approved - Flat TEST-102',
    'Your maintenance payment has been approved after committee verification. Thank you! Flat: TEST-102, Amount: ₹5,000',
    jsonb_build_object(
      'approved_amount', 5000,
      'gupshup_message_id', 'test-msg-12345',
      'test_data', true
    ),
    'DELIVERED'::communication_status,
    NULL,
    'test_insertion',
    'payment_approval_v1',
    true
  );

  -- 3. Failed Email (Invalid Address)
  PERFORM log_communication_event(
    v_apartment_id,
    'TEST-103',
    'Bob Wilson',
    'invalid.email@',
    NULL,
    'EMAIL'::communication_channel,
    'payment_reminder',
    NULL,
    'Payment Reminder - Due Soon',
    'This is a reminder that your payment is due in 3 days. Flat TEST-103, Amount: ₹5,000',
    jsonb_build_object(
      'reminder_type', 'due_soon',
      'test_data', true
    ),
    'FAILED'::communication_status,
    NULL,
    'test_insertion',
    'payment_reminder_v1',
    NULL
  );

  -- 4. Pending WhatsApp (Opt-out)
  PERFORM log_communication_event(
    v_apartment_id,
    'TEST-104',
    'Alice Brown',
    'alice.brown@example.com',
    '+919876543212',
    'WHATSAPP'::communication_channel,
    'payment_reminder',
    NULL,
    'Payment Reminder',
    'Payment reminder for Flat TEST-104. Amount: ₹5,000',
    jsonb_build_object(
      'test_data', true
    ),
    'SKIPPED'::communication_status,
    NULL,
    'test_insertion',
    'payment_reminder_v1',
    false
  );

  -- 5. Email with Long Message
  PERFORM log_communication_event(
    v_apartment_id,
    'TEST-105',
    'Charlie Davis',
    'charlie.davis@example.com',
    '+919876543213',
    'EMAIL'::communication_channel,
    'payment_acknowledgment',
    v_payment_id,
    'Payment Received - Contingency Fund ₹10,000',
    'Dear Charlie Davis, we have successfully received your payment submission for Flat TEST-105 at your apartment complex. Your payment details: Type: Contingency Fund, Amount: ₹10,000, Date: ' || now()::date || '. Your payment is now under review by the admin team.',
    jsonb_build_object(
      'payment_type', 'Contingency Fund',
      'payment_amount', 10000,
      'email_id', 'resend-test-67890',
      'test_data', true
    ),
    'DELIVERED'::communication_status,
    NULL,
    'test_insertion',
    'payment_acknowledgment_v1',
    NULL
  );

  RAISE NOTICE 'Successfully inserted 5 test communications!';
  RAISE NOTICE 'Apartment ID used: %', v_apartment_id;
  RAISE NOTICE 'Payment ID used: %', COALESCE(v_payment_id::text, 'NULL (no payments found)');
END $$;

-- Verify the data
SELECT
  flat_number,
  recipient_name,
  mask_mobile_number(recipient_mobile) as mobile,
  communication_channel::text as channel,
  communication_type,
  status::text,
  message_subject,
  LEFT(message_preview, 60) || '...' as preview_snippet,
  created_at
FROM communication_logs
WHERE triggered_by_event = 'test_insertion'
ORDER BY created_at DESC;

-- Summary statistics
SELECT
  COUNT(*) as total_test_communications,
  COUNT(*) FILTER (WHERE status = 'DELIVERED') as delivered,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
  COUNT(*) FILTER (WHERE status = 'SKIPPED') as skipped,
  COUNT(*) FILTER (WHERE communication_channel = 'EMAIL') as emails,
  COUNT(*) FILTER (WHERE communication_channel = 'WHATSAPP') as whatsapp
FROM communication_logs
WHERE triggered_by_event = 'test_insertion';

-- To clean up test data later, run:
-- DELETE FROM communication_logs WHERE triggered_by_event = 'test_insertion';
