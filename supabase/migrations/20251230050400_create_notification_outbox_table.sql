/*
  # Create Notification Outbox Table for WhatsApp Preview System

  ## Overview
  This migration creates a notification outbox table to track WhatsApp notification
  preview and audit records. Initially used for simulation/preview mode with Gupshup
  Sandbox, this table will support future transition to real WhatsApp message delivery.

  ## Purpose
  - Track when notifications SHOULD have been sent
  - Store rendered message previews for admin review
  - Provide audit trail and traceability
  - Support future real WhatsApp delivery without schema changes

  ## New Tables

  ### `notification_outbox`
  Stores WhatsApp notification records for preview, audit, and future delivery.

  **Columns:**
  - `id` (uuid, primary key) - Unique notification record identifier
  - `payment_submission_id` (text, not null) - Reference to related payment submission
  - `recipient_name` (text, nullable) - Name of flat owner or tenant
  - `recipient_phone` (text, not null) - WhatsApp phone number with country code
  - `channel` (text, default 'WHATSAPP') - Notification channel type
  - `delivery_mode` (text, default 'GUPSHUP_SANDBOX') - Sandbox or production mode
  - `template_name` (text, not null) - Logical name of message template used
  - `message_preview` (text, not null) - Fully rendered message text for preview
  - `trigger_reason` (text, not null) - Reason notification was triggered
  - `status` (text, default 'SIMULATED') - Notification state (SIMULATED/SENT/FAILED)
  - `created_at` (timestamptz, default now()) - Record creation timestamp

  ## Design Decisions
  1. **No Foreign Keys:** Intentionally avoiding FK constraints for flexibility during preview phase
  2. **Text IDs:** Using text for payment_submission_id to support various ID formats
  3. **Simple Status:** Starting with basic status values, extensible for future states
  4. **Message Preview:** Full text storage for admin visibility and debugging
  5. **Audit Focus:** Optimized for tracking and review, not real-time delivery

  ## Security
  - Enable RLS on notification_outbox table
  - Admin users can view notifications for their apartments
  - Super admins can view all notification records
  - No insert/update policies yet (will be added when automation is implemented)

  ## Performance
  - Index on payment_submission_id for quick lookups
  - Index on recipient_phone for recipient history queries
  - Index on created_at for time-based filtering
  - Index on status for filtering by delivery state

  ## Future Extensibility
  This design supports future additions:
  - Real delivery via WhatsApp Business API
  - Delivery timestamps and status updates
  - Webhook callback handling
  - Retry mechanisms
  - Cost tracking
  - Read receipts
*/

-- Create notification_outbox table
CREATE TABLE IF NOT EXISTS notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_submission_id text NOT NULL,
  recipient_name text,
  recipient_phone text NOT NULL,
  channel text NOT NULL DEFAULT 'WHATSAPP',
  delivery_mode text NOT NULL DEFAULT 'GUPSHUP_SANDBOX',
  template_name text NOT NULL,
  message_preview text NOT NULL,
  trigger_reason text NOT NULL,
  status text NOT NULL DEFAULT 'SIMULATED',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_outbox_payment_submission
  ON notification_outbox(payment_submission_id);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_recipient_phone
  ON notification_outbox(recipient_phone);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_created_at
  ON notification_outbox(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status
  ON notification_outbox(status);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_template_name
  ON notification_outbox(template_name);

-- Enable Row Level Security
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view notification records for their apartments
-- Note: Since we don't have FK to apartments, we'll use payment_submission_id lookup
CREATE POLICY "Admins can view their apartment notifications"
  ON notification_outbox FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payment_submissions ps
      JOIN admins a ON a.apartment_id = ps.apartment_id
      WHERE ps.id::text = notification_outbox.payment_submission_id
      AND a.user_id = auth.uid()
      AND a.status = 'active'
    )
  );

-- Policy: Super admins can view all notification records
CREATE POLICY "Super admins can view all notifications"
  ON notification_outbox FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Create helper function to get notification statistics
CREATE OR REPLACE FUNCTION get_notification_statistics(
  p_apartment_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_is_authorized boolean;
BEGIN
  -- Check authorization
  SELECT EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
    AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
    AND (p_apartment_id IS NULL OR apartment_id = p_apartment_id)
    AND status = 'active'
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get notification statistics
  SELECT json_build_object(
    'total_notifications', COUNT(*),
    'by_status', json_agg(DISTINCT jsonb_build_object(
      'status', status,
      'count', (SELECT COUNT(*) FROM notification_outbox no2 WHERE no2.status = no.status)
    )),
    'by_template', json_agg(DISTINCT jsonb_build_object(
      'template', template_name,
      'count', (SELECT COUNT(*) FROM notification_outbox no3 WHERE no3.template_name = no.template_name)
    )),
    'by_delivery_mode', json_agg(DISTINCT jsonb_build_object(
      'mode', delivery_mode,
      'count', (SELECT COUNT(*) FROM notification_outbox no4 WHERE no4.delivery_mode = no.delivery_mode)
    )),
    'date_range', json_build_object(
      'start', COALESCE(p_start_date, MIN(created_at)),
      'end', COALESCE(p_end_date, MAX(created_at))
    )
  )
  FROM notification_outbox no
  WHERE (p_apartment_id IS NULL OR payment_submission_id IN (
    SELECT id::text FROM payment_submissions WHERE apartment_id = p_apartment_id
  ))
  AND (p_start_date IS NULL OR created_at >= p_start_date)
  AND (p_end_date IS NULL OR created_at <= p_end_date)
  INTO v_result;

  RETURN COALESCE(v_result, '{}'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_notification_statistics(uuid, timestamptz, timestamptz) TO authenticated;

-- Create helper function to get notification history for a payment
CREATE OR REPLACE FUNCTION get_payment_notification_history(
  p_payment_submission_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_is_authorized boolean;
BEGIN
  -- Check if user has access to this payment's apartment
  SELECT EXISTS (
    SELECT 1 FROM payment_submissions ps
    JOIN admins a ON a.apartment_id = ps.apartment_id
    WHERE ps.id::text = p_payment_submission_id
    AND a.user_id = auth.uid()
    AND a.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
    AND status = 'active'
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get notification history
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', id,
      'recipient_name', recipient_name,
      'recipient_phone', recipient_phone,
      'channel', channel,
      'delivery_mode', delivery_mode,
      'template_name', template_name,
      'message_preview', message_preview,
      'trigger_reason', trigger_reason,
      'status', status,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ), '[]'::json)
  FROM notification_outbox
  WHERE payment_submission_id = p_payment_submission_id
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_payment_notification_history(text) TO authenticated;
