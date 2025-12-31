/*
  # Unified Communication Audit System

  ## Purpose
  Create a comprehensive communication audit trail system that:
  - Logs all resident communications (Email and WhatsApp)
  - Provides flat-centric and payment-centric views
  - Implements PII protection with mobile number masking
  - Supports compliance and dispute resolution
  - Integrates with existing audit framework

  ## New Tables
  - communication_logs: Central audit trail for all communications
  - communication_preferences: Resident channel preferences
  - communication_access_audit: PII compliance tracking

  ## Security
  - Enable RLS on all tables
  - Admins can view communications for their apartments
  - Super admins can view all
  - Mobile numbers masked by default

  ## Functions
  - mask_mobile_number() - PII protection
  - log_communication_event() - standardized logging
  - get_flat_communication_history() - admin view
  - get_communication_statistics() - analytics
  - get_payment_communication_timeline() - payment-centric view
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE communication_channel AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE communication_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create communication_logs table
CREATE TABLE IF NOT EXISTS communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid REFERENCES apartments(id) ON DELETE CASCADE NOT NULL,
  flat_number text NOT NULL,
  recipient_name text,
  recipient_email text,
  recipient_mobile text,
  communication_channel communication_channel NOT NULL,
  communication_type text NOT NULL,

  related_payment_id uuid REFERENCES payment_submissions(id) ON DELETE SET NULL,
  related_entity_type text,
  related_entity_id uuid,

  message_subject text,
  message_preview text,
  full_message_data jsonb,

  status communication_status DEFAULT 'PENDING' NOT NULL,
  delivery_status_details jsonb,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,

  triggered_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  triggered_by_event text,
  template_name text,
  template_version text,

  whatsapp_opt_in_status boolean,
  retry_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create communication_preferences table
CREATE TABLE IF NOT EXISTS communication_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid REFERENCES apartments(id) ON DELETE CASCADE NOT NULL,
  flat_number text NOT NULL,

  email_enabled boolean DEFAULT true,
  whatsapp_enabled boolean DEFAULT false,
  sms_enabled boolean DEFAULT false,
  preferred_channel text DEFAULT 'EMAIL',

  communication_types_opted_in text[] DEFAULT ARRAY['payment_acknowledgment', 'payment_approval', 'payment_reminder'],
  communication_types_opted_out text[] DEFAULT ARRAY[]::text[],

  last_updated_at timestamptz DEFAULT now(),
  updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  UNIQUE(apartment_id, flat_number)
);

-- Create communication_access_audit table
CREATE TABLE IF NOT EXISTS communication_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_log_id uuid REFERENCES communication_logs(id) ON DELETE CASCADE NOT NULL,
  accessed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  access_reason text,
  pii_fields_accessed text[] DEFAULT ARRAY[]::text[],
  ip_address inet,
  user_agent text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_communication_logs_apartment_id ON communication_logs(apartment_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_flat_number ON communication_logs(flat_number);
CREATE INDEX IF NOT EXISTS idx_communication_logs_payment_id ON communication_logs(related_payment_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at ON communication_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_logs_status ON communication_logs(status);
CREATE INDEX IF NOT EXISTS idx_communication_logs_channel ON communication_logs(communication_channel);
CREATE INDEX IF NOT EXISTS idx_communication_logs_type ON communication_logs(communication_type);
CREATE INDEX IF NOT EXISTS idx_communication_logs_flat_date ON communication_logs(flat_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_logs_apartment_date ON communication_logs(apartment_id, created_at DESC);

-- Function to mask mobile numbers
CREATE OR REPLACE FUNCTION mask_mobile_number(mobile text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF mobile IS NULL OR mobile = '' THEN
    RETURN NULL;
  END IF;

  IF length(mobile) <= 4 THEN
    RETURN '****';
  ELSE
    RETURN repeat('*', length(mobile) - 4) || right(mobile, 4);
  END IF;
END;
$$;

-- Function to log communication events
CREATE OR REPLACE FUNCTION log_communication_event(
  p_apartment_id uuid,
  p_flat_number text,
  p_recipient_name text,
  p_recipient_email text,
  p_recipient_mobile text,
  p_channel communication_channel,
  p_type text,
  p_payment_id uuid,
  p_subject text,
  p_preview text,
  p_full_data jsonb,
  p_status communication_status,
  p_triggered_by_user_id uuid,
  p_triggered_by_event text,
  p_template_name text DEFAULT NULL,
  p_whatsapp_opt_in boolean DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO communication_logs (
    apartment_id,
    flat_number,
    recipient_name,
    recipient_email,
    recipient_mobile,
    communication_channel,
    communication_type,
    related_payment_id,
    related_entity_type,
    related_entity_id,
    message_subject,
    message_preview,
    full_message_data,
    status,
    triggered_by_user_id,
    triggered_by_event,
    template_name,
    whatsapp_opt_in_status,
    sent_at
  ) VALUES (
    p_apartment_id,
    p_flat_number,
    p_recipient_name,
    p_recipient_email,
    p_recipient_mobile,
    p_channel,
    p_type,
    p_payment_id,
    CASE WHEN p_payment_id IS NOT NULL THEN 'payment' ELSE 'other' END,
    p_payment_id,
    p_subject,
    left(p_preview, 200),
    p_full_data,
    p_status,
    p_triggered_by_user_id,
    p_triggered_by_event,
    p_template_name,
    p_whatsapp_opt_in,
    CASE WHEN p_status IN ('SENT', 'DELIVERED') THEN now() ELSE NULL END
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function to get flat communication history
CREATE OR REPLACE FUNCTION get_flat_communication_history(
  p_apartment_id uuid,
  p_flat_number text,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  flat_number text,
  recipient_name text,
  recipient_email text,
  recipient_mobile_masked text,
  communication_channel text,
  communication_type text,
  payment_id uuid,
  payment_amount numeric,
  payment_date date,
  message_subject text,
  message_preview text,
  status text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  triggered_by_event text,
  template_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.id,
    cl.flat_number,
    cl.recipient_name,
    cl.recipient_email,
    mask_mobile_number(cl.recipient_mobile) as recipient_mobile_masked,
    cl.communication_channel::text,
    cl.communication_type,
    cl.related_payment_id as payment_id,
    ps.payment_amount as payment_amount,
    ps.payment_date,
    cl.message_subject,
    cl.message_preview,
    cl.status::text,
    cl.error_message,
    cl.sent_at,
    cl.delivered_at,
    cl.opened_at,
    cl.triggered_by_event,
    cl.template_name,
    cl.created_at
  FROM communication_logs cl
  LEFT JOIN payment_submissions ps ON cl.related_payment_id = ps.id
  WHERE cl.apartment_id = p_apartment_id
    AND cl.flat_number = p_flat_number
  ORDER BY cl.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to get communication statistics
CREATE OR REPLACE FUNCTION get_communication_statistics(
  p_apartment_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_communications bigint,
  email_sent bigint,
  email_delivered bigint,
  email_failed bigint,
  whatsapp_sent bigint,
  whatsapp_delivered bigint,
  whatsapp_failed bigint,
  whatsapp_skipped bigint,
  avg_delivery_time_minutes numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date timestamptz := COALESCE(p_start_date, now() - interval '30 days');
  v_end_date timestamptz := COALESCE(p_end_date, now());
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_communications,
    COUNT(*) FILTER (WHERE communication_channel = 'EMAIL' AND status IN ('SENT', 'DELIVERED'))::bigint as email_sent,
    COUNT(*) FILTER (WHERE communication_channel = 'EMAIL' AND status = 'DELIVERED')::bigint as email_delivered,
    COUNT(*) FILTER (WHERE communication_channel = 'EMAIL' AND status = 'FAILED')::bigint as email_failed,
    COUNT(*) FILTER (WHERE communication_channel = 'WHATSAPP' AND status IN ('SENT', 'DELIVERED'))::bigint as whatsapp_sent,
    COUNT(*) FILTER (WHERE communication_channel = 'WHATSAPP' AND status = 'DELIVERED')::bigint as whatsapp_delivered,
    COUNT(*) FILTER (WHERE communication_channel = 'WHATSAPP' AND status = 'FAILED')::bigint as whatsapp_failed,
    COUNT(*) FILTER (WHERE communication_channel = 'WHATSAPP' AND status = 'SKIPPED')::bigint as whatsapp_skipped,
    AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60)::numeric(10,2) as avg_delivery_time_minutes
  FROM communication_logs
  WHERE apartment_id = p_apartment_id
    AND created_at BETWEEN v_start_date AND v_end_date;
END;
$$;

-- Function to get payment communication timeline
CREATE OR REPLACE FUNCTION get_payment_communication_timeline(
  p_payment_id uuid
)
RETURNS TABLE (
  id uuid,
  communication_channel text,
  communication_type text,
  recipient_name text,
  recipient_mobile_masked text,
  status text,
  sent_at timestamptz,
  delivered_at timestamptz,
  error_message text,
  message_preview text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.id,
    cl.communication_channel::text,
    cl.communication_type,
    cl.recipient_name,
    mask_mobile_number(cl.recipient_mobile),
    cl.status::text,
    cl.sent_at,
    cl.delivered_at,
    cl.error_message,
    cl.message_preview
  FROM communication_logs cl
  WHERE cl.related_payment_id = p_payment_id
  ORDER BY cl.created_at ASC;
END;
$$;

-- Enable RLS
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_access_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for communication_logs

CREATE POLICY "Super admins can view all communication logs"
  ON communication_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "Apartment admins can view their apartment communications"
  ON communication_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = auth.uid()
      AND a.apartment_id = communication_logs.apartment_id
      AND a.status = 'active'
    )
  );

CREATE POLICY "System can insert communication logs"
  ON communication_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update communication logs"
  ON communication_logs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for communication_preferences

CREATE POLICY "Admins can view communication preferences"
  ON communication_preferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = auth.uid()
      AND a.apartment_id = communication_preferences.apartment_id
      AND a.status = 'active'
    )
  );

CREATE POLICY "Admins can manage communication preferences"
  ON communication_preferences
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM admins a
      WHERE a.user_id = auth.uid()
      AND a.apartment_id = communication_preferences.apartment_id
      AND a.status = 'active'
    )
  );

-- RLS Policies for communication_access_audit

CREATE POLICY "Super admins can view communication access audit"
  ON communication_access_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins sa
      WHERE sa.user_id = auth.uid()
      AND sa.status = 'active'
    )
  );

CREATE POLICY "System can insert access audit records"
  ON communication_access_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Grant permissions
GRANT EXECUTE ON FUNCTION mask_mobile_number(text) TO authenticated;
GRANT EXECUTE ON FUNCTION log_communication_event(uuid, text, text, text, text, communication_channel, text, uuid, text, text, jsonb, communication_status, uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_flat_communication_history(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_communication_statistics(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_communication_timeline(uuid) TO authenticated;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_communication_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_communication_logs_updated_at
  BEFORE UPDATE ON communication_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_communication_logs_updated_at();

-- Create view with masking
CREATE OR REPLACE VIEW admin_communication_dashboard AS
SELECT
  cl.id,
  cl.apartment_id,
  a.apartment_name,
  cl.flat_number,
  cl.recipient_name,
  cl.recipient_email,
  mask_mobile_number(cl.recipient_mobile) as recipient_mobile_masked,
  cl.communication_channel::text as channel,
  cl.communication_type as type,
  cl.related_payment_id,
  ps.payment_amount,
  ps.payment_date,
  cl.message_subject as subject,
  cl.message_preview as preview,
  cl.status::text,
  cl.error_message,
  cl.sent_at,
  cl.delivered_at,
  cl.opened_at,
  cl.triggered_by_event,
  cl.template_name,
  cl.whatsapp_opt_in_status,
  cl.retry_count,
  cl.created_at
FROM communication_logs cl
LEFT JOIN apartments a ON cl.apartment_id = a.id
LEFT JOIN payment_submissions ps ON cl.related_payment_id = ps.id;

GRANT SELECT ON admin_communication_dashboard TO authenticated;
