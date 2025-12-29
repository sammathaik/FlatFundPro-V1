/*
  # AI Document Classification System - Phase 1

  1. New Tables
    - `payment_document_classifications`
      - Stores AI classification results for each payment
      - Links to payment_submissions table
      - Tracks OpenAI model usage, costs, and confidence

    - `admin_notifications`
      - Stores notifications for admins about low-confidence classifications
      - Links to apartments and payments
      - Supports multiple notification types

  2. Classification Categories
    - Screenshots of UPI payment confirmations (PhonePe, Google Pay, Paytm, etc.)
    - Bank transfer confirmations (NEFT, RTGS, IMPS)
    - Online banking screenshots
    - Cheque images (front/back)
    - Cash receipts
    - Non-payment documents (invoices, random images)
    - Unclear or insufficient data

  3. Confidence Levels
    - High: AI is very confident (80-100%)
    - Medium: Moderately confident (50-79%)
    - Low: Uncertain classification (<50%)

  4. Cost Tracking
    - Track OpenAI model used, tokens consumed, processing time
    - Store cost per classification for budget monitoring

  5. Security
    - Enable RLS on all tables
    - Apartment admins can view their classifications
    - Super admins can view all classifications

  6. Triggers
    - Auto-notify admins for low-confidence classifications
    - Can be called after fraud detection completes
*/

-- Create payment_document_classifications table
CREATE TABLE IF NOT EXISTS payment_document_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_submission_id uuid NOT NULL REFERENCES payment_submissions(id) ON DELETE CASCADE,

  -- Classification Results
  document_type text NOT NULL,
  confidence_level text NOT NULL CHECK (confidence_level IN ('High', 'Medium', 'Low')),
  confidence_score numeric(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- Detailed Analysis
  payment_method text,
  app_or_bank_name text,
  key_identifiers jsonb,
  classification_reasoning text,

  -- AI Model Tracking
  ai_model_used text NOT NULL DEFAULT 'gpt-4-turbo-preview',
  ai_tokens_used integer,
  ai_cost_cents integer,
  ai_processing_time_ms integer,
  ai_raw_response jsonb,

  -- Metadata
  classified_at timestamptz DEFAULT now(),
  classified_by_user_id uuid REFERENCES auth.users(id),
  is_manual_override boolean DEFAULT false,
  admin_notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,

  -- Notification Details
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Related Records
  related_payment_id uuid REFERENCES payment_submissions(id) ON DELETE CASCADE,
  related_classification_id uuid REFERENCES payment_document_classifications(id) ON DELETE CASCADE,

  -- Status Tracking
  is_read boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by_user_id uuid REFERENCES auth.users(id),
  resolution_notes text,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_classifications_payment_id
  ON payment_document_classifications(payment_submission_id);
CREATE INDEX IF NOT EXISTS idx_classifications_confidence
  ON payment_document_classifications(confidence_level);
CREATE INDEX IF NOT EXISTS idx_classifications_document_type
  ON payment_document_classifications(document_type);
CREATE INDEX IF NOT EXISTS idx_classifications_created_at
  ON payment_document_classifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_apartment_id
  ON admin_notifications(apartment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON admin_notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_unresolved
  ON admin_notifications(is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON admin_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE payment_document_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_document_classifications

-- Super admins can view all classifications
CREATE POLICY "Super admins can view all classifications"
  ON payment_document_classifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Apartment admins can view classifications for their apartments
CREATE POLICY "Apartment admins can view their classifications"
  ON payment_document_classifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payment_submissions ps
      JOIN admins a ON ps.apartment_id = a.apartment_id
      WHERE ps.id = payment_document_classifications.payment_submission_id
      AND a.user_id = auth.uid()
      AND a.status = 'active'
    )
  );

-- Apartment admins can update classifications for their apartments (manual override)
CREATE POLICY "Apartment admins can update their classifications"
  ON payment_document_classifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payment_submissions ps
      JOIN admins a ON ps.apartment_id = a.apartment_id
      WHERE ps.id = payment_document_classifications.payment_submission_id
      AND a.user_id = auth.uid()
      AND a.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payment_submissions ps
      JOIN admins a ON ps.apartment_id = a.apartment_id
      WHERE ps.id = payment_document_classifications.payment_submission_id
      AND a.user_id = auth.uid()
      AND a.status = 'active'
    )
  );

-- System can insert classifications (via edge function)
CREATE POLICY "Service role can insert classifications"
  ON payment_document_classifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- RLS Policies for admin_notifications

-- Super admins can view all notifications
CREATE POLICY "Super admins can view all notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Apartment admins can view notifications for their apartments
CREATE POLICY "Apartment admins can view their notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = admin_notifications.apartment_id
      AND admins.status = 'active'
    )
  );

-- Apartment admins can update notifications for their apartments
CREATE POLICY "Apartment admins can update their notifications"
  ON admin_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = admin_notifications.apartment_id
      AND admins.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = admin_notifications.apartment_id
      AND admins.status = 'active'
    )
  );

-- System can insert notifications (via trigger)
CREATE POLICY "Service role can insert notifications"
  ON admin_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create function to notify admins of low-confidence classifications
CREATE OR REPLACE FUNCTION notify_admin_low_confidence_classification()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.confidence_level = 'Low'
     OR NEW.document_type IN ('Non-payment document', 'Unclear or insufficient data') THEN

    INSERT INTO admin_notifications (
      apartment_id,
      notification_type,
      title,
      message,
      severity,
      related_payment_id,
      related_classification_id,
      created_at
    )
    SELECT
      ps.apartment_id,
      'classification_review_needed',
      'Payment Classification Needs Review',
      format('Payment from %s (Flat %s) has %s confidence classification: %s. Please review the document.',
             ps.name, fn.flat_number, NEW.confidence_level, NEW.document_type),
      CASE
        WHEN NEW.document_type = 'Non-payment document' THEN 'high'
        WHEN NEW.confidence_level = 'Low' THEN 'medium'
        ELSE 'low'
      END,
      NEW.payment_submission_id,
      NEW.id,
      NOW()
    FROM payment_submissions ps
    LEFT JOIN flat_numbers fn ON ps.flat_id = fn.id
    WHERE ps.id = NEW.payment_submission_id;

  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-notify on low confidence
CREATE TRIGGER notify_on_low_confidence_classification
  AFTER INSERT ON payment_document_classifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_low_confidence_classification();

-- Create function to get classification statistics
CREATE OR REPLACE FUNCTION get_classification_statistics(p_apartment_id uuid DEFAULT NULL)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_classifications', COUNT(*),
    'by_confidence', jsonb_object_agg(
      confidence_level,
      count
    ),
    'by_document_type', (
      SELECT jsonb_object_agg(document_type, count)
      FROM (
        SELECT document_type, COUNT(*) as count
        FROM payment_document_classifications pdc
        JOIN payment_submissions ps ON pdc.payment_submission_id = ps.id
        WHERE p_apartment_id IS NULL OR ps.apartment_id = p_apartment_id
        GROUP BY document_type
        ORDER BY count DESC
      ) dt
    ),
    'total_cost_usd', COALESCE(SUM(ai_cost_cents), 0) / 100.0,
    'avg_processing_time_ms', ROUND(AVG(ai_processing_time_ms)),
    'last_30_days_count', (
      SELECT COUNT(*)
      FROM payment_document_classifications pdc
      JOIN payment_submissions ps ON pdc.payment_submission_id = ps.id
      WHERE (p_apartment_id IS NULL OR ps.apartment_id = p_apartment_id)
      AND pdc.classified_at >= NOW() - INTERVAL '30 days'
    )
  ) INTO result
  FROM payment_document_classifications pdc
  JOIN payment_submissions ps ON pdc.payment_submission_id = ps.id
  WHERE p_apartment_id IS NULL OR ps.apartment_id = p_apartment_id
  GROUP BY confidence_level;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_classification_statistics TO authenticated;

-- Create view for unresolved notifications
CREATE OR REPLACE VIEW unresolved_notifications AS
SELECT
  n.*,
  a.apartment_name,
  ps.name as payment_name,
  fn.flat_number,
  pdc.document_type,
  pdc.confidence_level
FROM admin_notifications n
JOIN apartments a ON n.apartment_id = a.id
LEFT JOIN payment_submissions ps ON n.related_payment_id = ps.id
LEFT JOIN flat_numbers fn ON ps.flat_id = fn.id
LEFT JOIN payment_document_classifications pdc ON n.related_classification_id = pdc.id
WHERE n.is_resolved = false
ORDER BY
  CASE n.severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  n.created_at DESC;

-- Grant access to view
GRANT SELECT ON unresolved_notifications TO authenticated;