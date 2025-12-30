/*
  # Create Payment Reminder System

  This migration adds WhatsApp-based automatic payment reminders for active collections.

  ## Changes

  1. **Add WhatsApp Opt-In to flat_email_mappings**
     - `whatsapp_opt_in` (boolean) - Whether occupant consents to receive WhatsApp reminders
     - Defaults to false for privacy compliance

  2. **Create payment_reminders table**
     - Tracks all sent payment reminders to prevent duplicates
     - Records reminder type (7-day, 3-day, 1-day before due date)
     - Links to expected_collection and flat for audit trail

  3. **Create reminder scheduling function**
     - `check_and_queue_payment_reminders()` - Identifies occupants needing reminders
     - Checks active collections with upcoming due dates
     - Only reminds occupants who have opted in and not yet paid
     - Queues WhatsApp messages to notification_outbox

  ## Security
     - RLS policies ensure only authenticated users can view their own reminders
     - Service role required for automatic reminder queuing
*/

-- Add WhatsApp opt-in field to flat_email_mappings
ALTER TABLE flat_email_mappings
ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean DEFAULT false;

-- Add index for efficient opt-in queries
CREATE INDEX IF NOT EXISTS idx_flat_email_mappings_whatsapp_opt_in
ON flat_email_mappings(apartment_id, whatsapp_opt_in)
WHERE whatsapp_opt_in = true;

-- Create payment_reminders tracking table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  expected_collection_id uuid NOT NULL REFERENCES expected_collections(id) ON DELETE CASCADE,
  flat_id uuid NOT NULL REFERENCES flat_numbers(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES buildings_blocks_phases(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_phone text NOT NULL,
  recipient_name text NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('7_days_before', '3_days_before', '1_day_before')),
  due_date date NOT NULL,
  collection_name text NOT NULL,
  expected_amount numeric(10, 2),
  sent_at timestamptz NOT NULL DEFAULT now(),
  notification_id uuid REFERENCES notification_outbox(id),
  created_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_payment_reminders_collection
ON payment_reminders(expected_collection_id, flat_id);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at
ON payment_reminders(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_apartment
ON payment_reminders(apartment_id, sent_at DESC);

-- Enable RLS
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_reminders
CREATE POLICY "Super admins can view all reminders"
  ON payment_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Apartment admins can view their apartment reminders"
  ON payment_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = payment_reminders.apartment_id
      AND admins.status = 'active'
    )
  );

CREATE POLICY "Service role can insert reminders"
  ON payment_reminders FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to check and queue payment reminders
CREATE OR REPLACE FUNCTION check_and_queue_payment_reminders()
RETURNS TABLE (
  reminders_queued integer,
  reminder_details jsonb
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_reminder_count integer := 0;
  v_reminder_list jsonb := '[]'::jsonb;
  v_collection record;
  v_flat record;
  v_days_until_due integer;
  v_reminder_type text;
  v_expected_amount numeric;
  v_notification_id uuid;
  v_message_text text;
  v_has_paid boolean;
BEGIN
  -- Loop through all active collections
  FOR v_collection IN
    SELECT
      ec.id as collection_id,
      ec.apartment_id,
      ec.collection_name,
      ec.due_date,
      ec.payment_type,
      ec.amount_due,
      ec.rate_per_sqft,
      ec.flat_type_rates,
      a.default_collection_mode,
      a.apartment_name as apartment_name
    FROM expected_collections ec
    JOIN apartments a ON a.id = ec.apartment_id
    WHERE ec.is_active = true
    AND ec.due_date >= CURRENT_DATE
    AND ec.due_date <= CURRENT_DATE + INTERVAL '7 days'
  LOOP
    -- Calculate days until due
    v_days_until_due := v_collection.due_date - CURRENT_DATE;

    -- Determine reminder type based on days until due
    v_reminder_type := CASE
      WHEN v_days_until_due = 7 THEN '7_days_before'
      WHEN v_days_until_due = 3 THEN '3_days_before'
      WHEN v_days_until_due = 1 THEN '1_day_before'
      ELSE NULL
    END;

    -- Skip if not a reminder day
    CONTINUE WHEN v_reminder_type IS NULL;

    -- Loop through all flats in the apartment with WhatsApp opt-in
    FOR v_flat IN
      SELECT
        fn.id as flat_id,
        fn.block_id,
        fn.flat_number,
        fn.built_up_area,
        fn.flat_type,
        fem.email,
        fem.mobile,
        fem.name,
        fem.occupant_type
      FROM flat_numbers fn
      JOIN flat_email_mappings fem ON fem.flat_id = fn.id
      WHERE fn.block_id IN (
        SELECT id FROM buildings_blocks_phases
        WHERE apartment_id = v_collection.apartment_id
      )
      AND fem.whatsapp_opt_in = true
      AND fem.mobile IS NOT NULL
      AND fem.mobile != ''
    LOOP
      -- Check if reminder already sent
      IF EXISTS (
        SELECT 1 FROM payment_reminders
        WHERE expected_collection_id = v_collection.collection_id
        AND flat_id = v_flat.flat_id
        AND reminder_type = v_reminder_type
      ) THEN
        CONTINUE;
      END IF;

      -- Check if payment already submitted
      SELECT EXISTS (
        SELECT 1 FROM payment_submissions
        WHERE expected_collection_id = v_collection.collection_id
        AND flat_id = v_flat.flat_id
        AND status IN ('Received', 'Reviewed', 'Approved')
      ) INTO v_has_paid;

      -- Skip if already paid
      CONTINUE WHEN v_has_paid;

      -- Calculate expected amount based on collection mode
      v_expected_amount := CASE v_collection.default_collection_mode
        WHEN 'A' THEN v_collection.amount_due
        WHEN 'B' THEN v_collection.rate_per_sqft * COALESCE(v_flat.built_up_area, 0)
        WHEN 'C' THEN COALESCE(
          (v_collection.flat_type_rates->>v_flat.flat_type)::numeric,
          v_collection.amount_due
        )
        ELSE v_collection.amount_due
      END;

      -- Create WhatsApp message
      v_message_text := format(
        E'🔔 Payment Reminder\n\n' ||
        'Dear %s,\n\n' ||
        'This is a friendly reminder that your payment for *%s* is due on *%s* (%s days remaining).\n\n' ||
        '📍 Flat: %s\n' ||
        '💰 Amount Due: ₹%s\n' ||
        '📅 Due Date: %s\n\n' ||
        'Please submit your payment at your earliest convenience to avoid late fees.\n\n' ||
        'Thank you!\n' ||
        '%s Management',
        v_flat.name,
        v_collection.collection_name,
        to_char(v_collection.due_date, 'DD Mon YYYY'),
        v_days_until_due,
        v_flat.flat_number,
        to_char(v_expected_amount, 'FM999999999.00'),
        to_char(v_collection.due_date, 'DD Mon YYYY'),
        v_collection.apartment_name
      );

      -- Insert into notification_outbox
      INSERT INTO notification_outbox (
        apartment_id,
        recipient_phone,
        recipient_name,
        message_type,
        message_preview,
        full_message_data,
        status
      ) VALUES (
        v_collection.apartment_id,
        v_flat.mobile,
        v_flat.name,
        'payment_reminder',
        v_message_text,
        jsonb_build_object(
          'collection_id', v_collection.collection_id,
          'collection_name', v_collection.collection_name,
          'flat_number', v_flat.flat_number,
          'due_date', v_collection.due_date,
          'expected_amount', v_expected_amount,
          'reminder_type', v_reminder_type,
          'days_until_due', v_days_until_due
        ),
        'PENDING'
      )
      RETURNING id INTO v_notification_id;

      -- Record the reminder
      INSERT INTO payment_reminders (
        apartment_id,
        expected_collection_id,
        flat_id,
        block_id,
        recipient_email,
        recipient_phone,
        recipient_name,
        reminder_type,
        due_date,
        collection_name,
        expected_amount,
        notification_id
      ) VALUES (
        v_collection.apartment_id,
        v_collection.collection_id,
        v_flat.flat_id,
        v_flat.block_id,
        v_flat.email,
        v_flat.mobile,
        v_flat.name,
        v_reminder_type,
        v_collection.due_date,
        v_collection.collection_name,
        v_expected_amount,
        v_notification_id
      );

      -- Increment counter and add to details
      v_reminder_count := v_reminder_count + 1;
      v_reminder_list := v_reminder_list || jsonb_build_object(
        'flat_number', v_flat.flat_number,
        'recipient_name', v_flat.name,
        'collection_name', v_collection.collection_name,
        'due_date', v_collection.due_date,
        'reminder_type', v_reminder_type,
        'notification_id', v_notification_id
      );
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_reminder_count, v_reminder_list;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION check_and_queue_payment_reminders() TO service_role;

-- Add comment
COMMENT ON FUNCTION check_and_queue_payment_reminders() IS
'Checks active collections and queues WhatsApp payment reminders for opted-in occupants who have not yet paid. Sends reminders at 7, 3, and 1 day before due date.';

-- Add comment to whatsapp_opt_in field
COMMENT ON COLUMN flat_email_mappings.whatsapp_opt_in IS
'Whether the occupant has consented to receive WhatsApp payment reminders. Defaults to false for privacy compliance.';
