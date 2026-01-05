/*
  # Occupant Notification Center System

  ## Overview
  Creates a comprehensive notification center for occupants (owners/tenants) to view
  important updates, payment reminders, committee responses, and announcements.

  ## 1. New Tables

  ### `occupant_notifications`
  Stores all notifications for occupants with flat/apartment context.
  
  - `id` (uuid, primary key)
  - `apartment_id` (uuid, FK to apartments)
  - `flat_id` (uuid, FK to flat_numbers)
  - `recipient_mobile` (text) - User's mobile for filtering
  - `type` (text) - notification category
  - `title` (text) - Short notification title
  - `message` (text) - Full notification message
  - `context_data` (jsonb) - Additional context (payment_id, collection_id, etc.)
  - `priority` (text) - normal, high, urgent
  - `is_read` (boolean) - Read state
  - `read_at` (timestamptz) - When marked as read
  - `related_entity_type` (text) - payment, collection, announcement, etc.
  - `related_entity_id` (uuid) - ID of related entity
  - `action_url` (text) - Optional deep link within app
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on occupant_notifications
  - Occupants can only view notifications for flats they're mapped to
  - Notifications are scoped by apartment + flat + mobile

  ## 3. Functions
  - get_occupant_notifications(mobile, flat_id, apartment_id, limit)
  - mark_notification_as_read(notification_id, mobile)
  - mark_all_notifications_as_read(mobile, flat_id, apartment_id)
  - get_unread_notification_count(mobile, flat_id, apartment_id)

  ## 4. Notification Types
  - payment_reminder
  - payment_overdue
  - payment_approved
  - payment_rejected
  - payment_clarification_needed
  - collection_announcement
  - collection_status_update
  - fine_applied
  - committee_broadcast
*/

-- Create occupant_notifications table
CREATE TABLE IF NOT EXISTS occupant_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  flat_id uuid NOT NULL REFERENCES flat_numbers(id) ON DELETE CASCADE,
  recipient_mobile text NOT NULL,
  type text NOT NULL CHECK (type IN (
    'payment_reminder',
    'payment_overdue',
    'payment_approved',
    'payment_rejected',
    'payment_clarification_needed',
    'collection_announcement',
    'collection_status_update',
    'fine_applied',
    'committee_broadcast',
    'general_update'
  )),
  title text NOT NULL,
  message text NOT NULL,
  context_data jsonb DEFAULT '{}'::jsonb,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  related_entity_type text,
  related_entity_id uuid,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_occupant_notifications_recipient 
  ON occupant_notifications(recipient_mobile, apartment_id, flat_id);

CREATE INDEX IF NOT EXISTS idx_occupant_notifications_unread 
  ON occupant_notifications(recipient_mobile, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_occupant_notifications_flat 
  ON occupant_notifications(apartment_id, flat_id, created_at DESC);

-- Enable RLS
ALTER TABLE occupant_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Occupants can view notifications for their mapped flats
CREATE POLICY "Occupants can view own notifications"
  ON occupant_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM flat_email_mappings fem
      WHERE fem.apartment_id = occupant_notifications.apartment_id
      AND fem.flat_id = occupant_notifications.flat_id
      AND fem.mobile = occupant_notifications.recipient_mobile
    )
  );

-- RLS Policy: System can insert notifications
CREATE POLICY "System can create notifications"
  ON occupant_notifications
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Occupants can update their own notifications (mark as read)
CREATE POLICY "Occupants can update own notifications"
  ON occupant_notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM flat_email_mappings fem
      WHERE fem.apartment_id = occupant_notifications.apartment_id
      AND fem.flat_id = occupant_notifications.flat_id
      AND fem.mobile = occupant_notifications.recipient_mobile
    )
  );

-- Function: Get occupant notifications with filtering
CREATE OR REPLACE FUNCTION get_occupant_notifications(
  p_mobile text,
  p_flat_id uuid DEFAULT NULL,
  p_apartment_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_unread_only boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  apartment_id uuid,
  apartment_name text,
  flat_id uuid,
  flat_number text,
  type text,
  title text,
  message text,
  context_data jsonb,
  priority text,
  is_read boolean,
  read_at timestamptz,
  related_entity_type text,
  related_entity_id uuid,
  action_url text,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.apartment_id,
    a.apartment_name,
    n.flat_id,
    f.flat_number,
    n.type,
    n.title,
    n.message,
    n.context_data,
    n.priority,
    n.is_read,
    n.read_at,
    n.related_entity_type,
    n.related_entity_id,
    n.action_url,
    n.created_at
  FROM occupant_notifications n
  JOIN apartments a ON a.id = n.apartment_id
  JOIN flat_numbers f ON f.id = n.flat_id
  WHERE n.recipient_mobile = p_mobile
    AND (p_flat_id IS NULL OR n.flat_id = p_flat_id)
    AND (p_apartment_id IS NULL OR n.apartment_id = p_apartment_id)
    AND (NOT p_unread_only OR n.is_read = false)
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function: Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(
  p_notification_id uuid,
  p_mobile text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated boolean;
BEGIN
  UPDATE occupant_notifications
  SET 
    is_read = true,
    read_at = now()
  WHERE id = p_notification_id
    AND recipient_mobile = p_mobile
    AND is_read = false;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Function: Mark all notifications as read for a flat
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(
  p_mobile text,
  p_flat_id uuid,
  p_apartment_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE occupant_notifications
  SET 
    is_read = true,
    read_at = now()
  WHERE recipient_mobile = p_mobile
    AND flat_id = p_flat_id
    AND apartment_id = p_apartment_id
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function: Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(
  p_mobile text,
  p_flat_id uuid DEFAULT NULL,
  p_apartment_id uuid DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*)::int INTO v_count
  FROM occupant_notifications
  WHERE recipient_mobile = p_mobile
    AND is_read = false
    AND (p_flat_id IS NULL OR flat_id = p_flat_id)
    AND (p_apartment_id IS NULL OR apartment_id = p_apartment_id);
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function: Get user's flats for notification filtering
CREATE OR REPLACE FUNCTION get_user_flats_for_notifications(
  p_mobile text
)
RETURNS TABLE (
  apartment_id uuid,
  apartment_name text,
  flat_id uuid,
  flat_number text,
  occupant_name text,
  unread_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fem.apartment_id,
    a.apartment_name,
    fem.flat_id,
    f.flat_number,
    fem.name as occupant_name,
    (
      SELECT COUNT(*)::int
      FROM occupant_notifications n
      WHERE n.recipient_mobile = p_mobile
        AND n.apartment_id = fem.apartment_id
        AND n.flat_id = fem.flat_id
        AND n.is_read = false
    ) as unread_count
  FROM flat_email_mappings fem
  JOIN apartments a ON a.id = fem.apartment_id
  JOIN flat_numbers f ON f.id = fem.flat_id
  WHERE fem.mobile = p_mobile
  ORDER BY a.apartment_name, f.flat_number;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_occupant_notifications TO authenticated, anon;
GRANT EXECUTE ON FUNCTION mark_notification_as_read TO authenticated, anon;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_flats_for_notifications TO authenticated, anon;