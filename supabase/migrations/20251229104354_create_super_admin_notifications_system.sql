/*
  # Create Super Admin Notifications System

  1. New Tables
    - `super_admin_notifications`
      - `id` (uuid, primary key)
      - `notification_type` (text) - Type of notification (e.g., 'new_lead', 'system_alert')
      - `title` (text) - Notification title
      - `message` (text) - Notification message content
      - `severity` (text) - Severity level: low, medium, high, critical
      - `related_lead_id` (uuid, nullable) - Link to marketing_leads if applicable
      - `is_read` (boolean) - Whether notification has been read
      - `is_resolved` (boolean) - Whether notification has been resolved
      - `resolved_at` (timestamptz, nullable) - When it was resolved
      - `resolved_by_user_id` (uuid, nullable) - Super admin who resolved it
      - `resolution_notes` (text, nullable) - Notes added when resolving
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `super_admin_notifications`
    - Add policy for super admins to view notifications
    - Add policy for super admins to update notifications
    - Add policy for service role to insert notifications (via triggers)

  3. Triggers
    - Auto-notify super admins when new leads are generated
    - Track when notifications are created/updated

  4. Indexes
    - Index on is_read for filtering unread notifications
    - Index on created_at for sorting by recency
*/

-- Create super_admin_notifications table
CREATE TABLE IF NOT EXISTS super_admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  related_lead_id uuid REFERENCES marketing_leads(id) ON DELETE SET NULL,
  is_read boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE super_admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_super_admin_notifications_is_read 
  ON super_admin_notifications(is_read) 
  WHERE is_resolved = false;

CREATE INDEX IF NOT EXISTS idx_super_admin_notifications_created_at 
  ON super_admin_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_super_admin_notifications_severity 
  ON super_admin_notifications(severity);

-- RLS Policies for super_admin_notifications

-- Super admins can view all notifications
CREATE POLICY "Super admins can view all notifications"
  ON super_admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Super admins can update notifications (mark as read/resolved)
CREATE POLICY "Super admins can update notifications"
  ON super_admin_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Service role can insert notifications (via trigger)
CREATE POLICY "Service role can insert notifications"
  ON super_admin_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_super_admin_notifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_super_admin_notifications_updated_at ON super_admin_notifications;
CREATE TRIGGER trigger_update_super_admin_notifications_updated_at
  BEFORE UPDATE ON super_admin_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_super_admin_notifications_updated_at();

-- Function to notify super admins when new leads are generated
CREATE OR REPLACE FUNCTION notify_super_admin_new_lead()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create notification for new lead
  INSERT INTO super_admin_notifications (
    notification_type,
    title,
    message,
    severity,
    related_lead_id,
    created_at
  ) VALUES (
    'new_lead',
    'New Demo Request Received',
    format('New lead from %s (%s) - %s, %s. Apartment: %s',
           NEW.name, NEW.email, NEW.city, 
           COALESCE(NEW.phone, 'No phone'), 
           NEW.apartment_name),
    'medium',
    NEW.id,
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Create trigger to auto-notify on new lead
DROP TRIGGER IF EXISTS notify_on_new_lead ON marketing_leads;
CREATE TRIGGER notify_on_new_lead
  AFTER INSERT ON marketing_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_super_admin_new_lead();

-- Grant necessary permissions
GRANT SELECT ON super_admin_notifications TO authenticated;
GRANT UPDATE ON super_admin_notifications TO authenticated;
GRANT INSERT ON super_admin_notifications TO service_role;
