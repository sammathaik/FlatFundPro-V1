/*
  # Create System Configuration Table
  
  1. Overview
    - Creates a system_config table to store configuration values
    - Stores Supabase URL and anon key for use by triggers
    - Secured with RLS to allow only super_admin access
  
  2. Changes
    - Creates system_config table
    - Inserts Supabase configuration
    - Sets up RLS policies
*/

-- Create system configuration table
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Allow super_admin to manage config
CREATE POLICY "super_admin_manage_config"
  ON system_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
    )
  );

-- Insert Supabase configuration
INSERT INTO system_config (key, value, description)
VALUES 
  ('supabase_url', 'https://rjiesmcmdfoavggkhasn.supabase.co', 'Supabase project URL'),
  ('supabase_anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaWVzbWNtZGZvYXZnZ2toYXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDk3OTMsImV4cCI6MjA3ODA4NTc5M30.9WGrZQTdYKe5QGQ6XL7uJthEdyuBtggEer0nPwlT1no', 'Supabase anonymous key')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

COMMENT ON TABLE system_config IS 'System-wide configuration settings';
