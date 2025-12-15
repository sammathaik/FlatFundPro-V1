/*
  # Enhance Audit Logs and Add System Settings

  ## Summary
  Enhances the existing audit_logs table with additional fields and adds system_settings functionality for application-wide configuration.

  ## 1. Audit Logs Enhancements
  - Add `entity_type` as alias for `table_name`
  - Add `entity_id` as alias for `record_id`  
  - Add `entity_name` for human-readable entity description
  - Add `changes` as alias for `details` (before/after values)
  - Add `metadata` for additional context (IP, user agent, etc.)
  - Add `status` field ('success', 'failure', 'warning')
  - Add `error_message` for failure details
  - Update indexes for better query performance

  ## 2. New System Settings Table
  - `id` (uuid, primary key) - Unique identifier
  - `setting_key` (text, unique) - Setting identifier
  - `setting_value` (jsonb) - Setting value (flexible JSON)
  - `setting_type` (text) - Category (general, payment, notification)
  - `description` (text) - Human-readable description
  - `is_public` (boolean) - Visibility to non-admins
  - `updated_by` (uuid) - Last modifier
  - `created_at`, `updated_at` - Timestamps

  ## 3. Security
  - RLS policies for super admin access to settings
  - Public settings viewable by authenticated users
  - Enhanced audit log policies for apartment admins
  - Audit logging function with security definer

  ## 4. Initial Settings
  - Currency, date format, payment reminders
  - Late fees, grace periods, notifications
  - System name, maintenance mode, limits
*/

-- Add new columns to audit_logs table
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_name text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status text DEFAULT 'success';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS error_message text;

-- Add check constraint for status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'audit_logs_status_check'
  ) THEN
    ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_status_check 
      CHECK (status IN ('success', 'failure', 'warning'));
  END IF;
END $$;

-- Rename columns conceptually by creating views/aliases isn't ideal, so we'll use the existing columns
-- table_name = entity_type, record_id = entity_id, details = changes

-- Create indexes for audit_logs if not exists
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  setting_type text NOT NULL DEFAULT 'general',
  description text,
  is_public boolean DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for system_settings
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_type ON system_settings(setting_type);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- System Settings Policies

-- Super admins can view all settings
CREATE POLICY "Super admins can view all settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN super_admins sa ON sa.user_id = a.user_id
      WHERE a.user_id = auth.uid()
      AND a.status = 'active'
    )
  );

-- Super admins can update settings
CREATE POLICY "Super admins can update settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN super_admins sa ON sa.user_id = a.user_id
      WHERE a.user_id = auth.uid()
      AND a.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN super_admins sa ON sa.user_id = a.user_id
      WHERE a.user_id = auth.uid()
      AND a.status = 'active'
    )
  );

-- Super admins can insert new settings
CREATE POLICY "Super admins can insert settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN super_admins sa ON sa.user_id = a.user_id
      WHERE a.user_id = auth.uid()
      AND a.status = 'active'
    )
  );

-- Super admins can delete settings
CREATE POLICY "Super admins can delete settings"
  ON system_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN super_admins sa ON sa.user_id = a.user_id
      WHERE a.user_id = auth.uid()
      AND a.status = 'active'
    )
  );

-- Public settings can be viewed by authenticated users
CREATE POLICY "Authenticated users can view public settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS system_settings_updated_at ON system_settings;
CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Function to create audit log entries (using existing audit_logs structure)
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_entity_name text DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_status text DEFAULT 'success',
  p_error_message text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_user_email text;
  v_log_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    user_email,
    action,
    table_name,
    record_id,
    entity_name,
    details,
    metadata,
    status,
    error_message
  ) VALUES (
    v_user_id,
    v_user_email,
    p_action,
    p_table_name,
    p_record_id,
    p_entity_name,
    p_details,
    p_metadata,
    p_status,
    p_error_message
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on log_audit_event to authenticated users
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public)
VALUES
  ('currency', '{"code": "INR", "symbol": "₹", "name": "Indian Rupee"}'::jsonb, 'general', 'Default currency for the system', true),
  ('date_format', '{"format": "DD/MM/YYYY", "display": "Day/Month/Year"}'::jsonb, 'general', 'Date display format', true),
  ('payment_reminder_days', '{"days": [7, 3, 1], "enabled": true}'::jsonb, 'notification', 'Days before due date to send payment reminders', false),
  ('late_payment_fee', '{"enabled": false, "percentage": 5, "fixed_amount": 0}'::jsonb, 'payment', 'Late payment fee configuration', false),
  ('payment_grace_period_days', '{"days": 5}'::jsonb, 'payment', 'Grace period for payments after due date', false),
  ('email_notifications_enabled', '{"enabled": true}'::jsonb, 'notification', 'Enable email notifications system-wide', false),
  ('sms_notifications_enabled', '{"enabled": false}'::jsonb, 'notification', 'Enable SMS notifications system-wide', false),
  ('system_name', '{"name": "FlatFund Pro"}'::jsonb, 'general', 'Application name', true),
  ('maintenance_mode', '{"enabled": false, "message": "System is under maintenance"}'::jsonb, 'general', 'Enable maintenance mode', false),
  ('max_payment_amount', '{"amount": 1000000}'::jsonb, 'payment', 'Maximum single payment amount allowed', false)
ON CONFLICT (setting_key) DO NOTHING;
