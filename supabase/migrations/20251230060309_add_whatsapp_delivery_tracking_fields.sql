/*
  # Add WhatsApp Delivery Tracking Fields

  1. Schema Changes
    - Add `sent_at` column to track when message was delivered
    - Add `failure_reason` column to store error messages
    - Add `delivery_attempts` column to track retry count

  2. Purpose
    - Track Gupshup Sandbox delivery status
    - Store failure reasons for debugging
    - Support future retry logic

  3. Notes
    - Non-breaking changes (nullable fields)
    - Supports both SANDBOX and production modes
*/

-- Add delivery tracking fields to notification_outbox
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_outbox' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE notification_outbox ADD COLUMN sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_outbox' AND column_name = 'failure_reason'
  ) THEN
    ALTER TABLE notification_outbox ADD COLUMN failure_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_outbox' AND column_name = 'delivery_attempts'
  ) THEN
    ALTER TABLE notification_outbox ADD COLUMN delivery_attempts int DEFAULT 0;
  END IF;
END $$;

-- Create index for tracking sent notifications
CREATE INDEX IF NOT EXISTS idx_notification_outbox_sent_at
  ON notification_outbox(sent_at)
  WHERE sent_at IS NOT NULL;

-- Create index for tracking failed notifications
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status
  ON notification_outbox(status);

-- Add helpful comment
COMMENT ON COLUMN notification_outbox.sent_at IS 'Timestamp when message was successfully sent via Gupshup';
COMMENT ON COLUMN notification_outbox.failure_reason IS 'Error message if delivery failed';
COMMENT ON COLUMN notification_outbox.delivery_attempts IS 'Number of times delivery was attempted';
