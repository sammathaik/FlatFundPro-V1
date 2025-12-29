/*
  # Enhance Admin Notifications and Add Triggers

  1. Schema Changes
    - Add `metadata` (jsonb) to admin_notifications for additional context
    - Add `related_occupant_id` to link to flat_email_mappings
    - Update existing policies to use correct table name (admins)

  2. Notification Triggers
    - New payment submission received
    - OCR extraction completed (other_text field populated)
    - Fraud detection alert
    - Payment approved/rejected
    - Large amount alert (> 50000)
    - OCR extraction failed
    - Validation failed
    - Duplicate payment detected

  3. Helper Function
    - create_admin_notification() - Reusable function for creating notifications
*/

-- Add missing columns to admin_notifications
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE admin_notifications ADD COLUMN metadata jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_notifications' AND column_name = 'related_occupant_id'
  ) THEN
    ALTER TABLE admin_notifications ADD COLUMN related_occupant_id uuid REFERENCES flat_email_mappings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Apartment admins can view their notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Super admins can view all notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Apartment admins can update their notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON admin_notifications;

-- Create updated RLS policies with correct table reference

-- Apartment admins can view notifications for their apartment
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

-- Super admins can view all notifications
CREATE POLICY "Super admins can view all admin notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Apartment admins can update their notifications (mark as read/resolved)
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

-- Service role can insert notifications (via triggers)
CREATE POLICY "Service role can insert admin notifications"
  ON admin_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Authenticated users can insert notifications (for immediate feedback)
CREATE POLICY "Authenticated can insert admin notifications"
  ON admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = admin_notifications.apartment_id
      AND admins.status = 'active'
    )
  );

-- Helper function to create admin notifications
CREATE OR REPLACE FUNCTION create_admin_notification(
  p_apartment_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_severity text,
  p_related_payment_id uuid DEFAULT NULL,
  p_related_occupant_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO admin_notifications (
    apartment_id,
    notification_type,
    title,
    message,
    severity,
    related_payment_id,
    related_occupant_id,
    metadata,
    created_at
  ) VALUES (
    p_apartment_id,
    p_notification_type,
    p_title,
    p_message,
    p_severity,
    p_related_payment_id,
    p_related_occupant_id,
    p_metadata,
    NOW()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- 1. Trigger: New Payment Submission
CREATE OR REPLACE FUNCTION notify_admin_payment_submitted()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_flat_number text;
  v_occupant_name text;
BEGIN
  -- Get flat number and occupant name
  SELECT fn.flat_number, fem.name
  INTO v_flat_number, v_occupant_name
  FROM flat_numbers fn
  LEFT JOIN flat_email_mappings fem ON fem.flat_id = NEW.flat_id
  WHERE fn.id = NEW.flat_id
  LIMIT 1;

  -- Create notification
  PERFORM create_admin_notification(
    NEW.apartment_id,
    'payment_submitted',
    'New Payment Submission',
    format('New payment submission from %s (Flat %s) - Amount: ₹%s',
           COALESCE(v_occupant_name, NEW.name),
           COALESCE(v_flat_number, 'Unknown'),
           COALESCE(NEW.payment_amount::text, 'Not specified')),
    'medium',
    NEW.id,
    NULL,
    jsonb_build_object(
      'payment_amount', NEW.payment_amount,
      'payment_date', NEW.payment_date,
      'flat_id', NEW.flat_id,
      'occupant_type', NEW.occupant_type
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_payment_submitted ON payment_submissions;
CREATE TRIGGER notify_on_payment_submitted
  AFTER INSERT ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_payment_submitted();

-- 2. Trigger: OCR Extraction Completed (other_text field updated)
CREATE OR REPLACE FUNCTION notify_admin_ocr_completed()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_flat_number text;
BEGIN
  -- Only trigger if other_text is being populated and wasn't populated before
  IF NEW.other_text IS NOT NULL AND NEW.other_text != '' 
     AND (OLD.other_text IS NULL OR OLD.other_text = '') THEN
    
    -- Get flat number
    SELECT flat_number INTO v_flat_number
    FROM flat_numbers
    WHERE id = NEW.flat_id;

    -- Create notification
    PERFORM create_admin_notification(
      NEW.apartment_id,
      'ocr_completed',
      'OCR Extraction Completed',
      format('OCR text extraction completed successfully for payment from Flat %s - Amount: ₹%s',
             COALESCE(v_flat_number, 'Unknown'),
             COALESCE(NEW.payment_amount::text, 'Not specified')),
      'low',
      NEW.id,
      NULL,
      jsonb_build_object(
        'extracted_amount', NEW.extracted_amount,
        'extracted_date', NEW.extracted_date,
        'extracted_transaction_ref', NEW.extracted_transaction_ref,
        'ocr_quality', NEW.ocr_quality,
        'ocr_confidence_score', NEW.ocr_confidence_score
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_ocr_completed ON payment_submissions;
CREATE TRIGGER notify_on_ocr_completed
  AFTER UPDATE ON payment_submissions
  FOR EACH ROW
  WHEN (NEW.other_text IS NOT NULL AND NEW.other_text != '' 
        AND (OLD.other_text IS NULL OR OLD.other_text = ''))
  EXECUTE FUNCTION notify_admin_ocr_completed();

-- 3. Trigger: Fraud Detection Alert
CREATE OR REPLACE FUNCTION notify_admin_fraud_alert()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_flat_number text;
  v_fraud_reasons text;
BEGIN
  -- Only trigger if fraud flag is being set to true
  IF NEW.is_fraud_flagged = true AND (OLD.is_fraud_flagged IS NULL OR OLD.is_fraud_flagged = false) THEN
    
    -- Get flat number
    SELECT flat_number INTO v_flat_number
    FROM flat_numbers
    WHERE id = NEW.flat_id;

    -- Extract fraud reasons from indicators
    SELECT string_agg(key || ': ' || value::text, ', ')
    INTO v_fraud_reasons
    FROM jsonb_each(COALESCE(NEW.fraud_indicators, '{}'::jsonb));

    -- Create notification
    PERFORM create_admin_notification(
      NEW.apartment_id,
      'fraud_alert',
      '⚠️ Fraud Alert - Suspicious Payment',
      format('FRAUD ALERT: Payment from Flat %s flagged as suspicious - Fraud Score: %s/100. Indicators: %s',
             COALESCE(v_flat_number, 'Unknown'),
             COALESCE(NEW.fraud_score::text, 'Unknown'),
             COALESCE(v_fraud_reasons, 'Check fraud indicators')),
      'critical',
      NEW.id,
      NULL,
      jsonb_build_object(
        'fraud_score', NEW.fraud_score,
        'fraud_indicators', NEW.fraud_indicators,
        'payment_amount', NEW.payment_amount
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_fraud_alert ON payment_submissions;
CREATE TRIGGER notify_on_fraud_alert
  AFTER UPDATE ON payment_submissions
  FOR EACH ROW
  WHEN (NEW.is_fraud_flagged = true AND (OLD.is_fraud_flagged IS NULL OR OLD.is_fraud_flagged = false))
  EXECUTE FUNCTION notify_admin_fraud_alert();

-- 4. Trigger: Large Amount Alert (> 50000)
CREATE OR REPLACE FUNCTION notify_admin_large_amount()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_flat_number text;
BEGIN
  -- Only for new submissions with large amounts
  IF NEW.payment_amount > 50000 THEN
    
    -- Get flat number
    SELECT flat_number INTO v_flat_number
    FROM flat_numbers
    WHERE id = NEW.flat_id;

    -- Create notification
    PERFORM create_admin_notification(
      NEW.apartment_id,
      'large_amount',
      'Large Payment Amount Submitted',
      format('Large payment amount of ₹%s submitted from Flat %s - Please review carefully',
             NEW.payment_amount,
             COALESCE(v_flat_number, 'Unknown')),
      'high',
      NEW.id,
      NULL,
      jsonb_build_object(
        'payment_amount', NEW.payment_amount,
        'threshold', 50000
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_large_amount ON payment_submissions;
CREATE TRIGGER notify_on_large_amount
  AFTER INSERT ON payment_submissions
  FOR EACH ROW
  WHEN (NEW.payment_amount > 50000)
  EXECUTE FUNCTION notify_admin_large_amount();

-- 5. Trigger: OCR Extraction Failed
CREATE OR REPLACE FUNCTION notify_admin_ocr_failed()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_flat_number text;
BEGIN
  -- Trigger if requires_manual_review is set to true
  IF NEW.requires_manual_review = true AND (OLD.requires_manual_review IS NULL OR OLD.requires_manual_review = false) THEN
    
    -- Get flat number
    SELECT flat_number INTO v_flat_number
    FROM flat_numbers
    WHERE id = NEW.flat_id;

    -- Create notification
    PERFORM create_admin_notification(
      NEW.apartment_id,
      'ocr_failed',
      'OCR Extraction Requires Manual Review',
      format('OCR extraction for payment from Flat %s requires manual review. Reason: %s',
             COALESCE(v_flat_number, 'Unknown'),
             COALESCE(NEW.manual_review_reason, 'Low confidence or failed extraction')),
      'medium',
      NEW.id,
      NULL,
      jsonb_build_object(
        'manual_review_reason', NEW.manual_review_reason,
        'ocr_quality', NEW.ocr_quality,
        'ocr_confidence_score', NEW.ocr_confidence_score
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_ocr_failed ON payment_submissions;
CREATE TRIGGER notify_on_ocr_failed
  AFTER UPDATE ON payment_submissions
  FOR EACH ROW
  WHEN (NEW.requires_manual_review = true AND (OLD.requires_manual_review IS NULL OR OLD.requires_manual_review = false))
  EXECUTE FUNCTION notify_admin_ocr_failed();

-- 6. Trigger: Payment Status Changed (Approved/Rejected)
CREATE OR REPLACE FUNCTION notify_admin_payment_status_changed()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_flat_number text;
  v_notification_type text;
  v_title text;
  v_severity text;
BEGIN
  -- Only trigger if status changed from pending to approved or rejected
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    
    -- Get flat number
    SELECT flat_number INTO v_flat_number
    FROM flat_numbers
    WHERE id = NEW.flat_id;

    -- Determine notification details based on new status
    IF NEW.status = 'approved' THEN
      v_notification_type := 'payment_approved';
      v_title := 'Payment Approved';
      v_severity := 'low';
    ELSE
      v_notification_type := 'payment_rejected';
      v_title := 'Payment Rejected';
      v_severity := 'medium';
    END IF;

    -- Create notification
    PERFORM create_admin_notification(
      NEW.apartment_id,
      v_notification_type,
      v_title,
      format('Payment from Flat %s (₹%s) has been %s',
             COALESCE(v_flat_number, 'Unknown'),
             COALESCE(NEW.payment_amount::text, 'Unknown'),
             NEW.status),
      v_severity,
      NEW.id,
      NULL,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'reviewed_by', NEW.reviewed_by,
        'reviewed_at', NEW.reviewed_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_payment_status_changed ON payment_submissions;
CREATE TRIGGER notify_on_payment_status_changed
  AFTER UPDATE ON payment_submissions
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected'))
  EXECUTE FUNCTION notify_admin_payment_status_changed();

-- 7. Trigger: Validation Failed
CREATE OR REPLACE FUNCTION notify_admin_validation_failed()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_flat_number text;
BEGIN
  -- Trigger if validation status is set to failed
  IF NEW.validation_status = 'failed' AND (OLD.validation_status IS NULL OR OLD.validation_status != 'failed') THEN
    
    -- Get flat number
    SELECT flat_number INTO v_flat_number
    FROM flat_numbers
    WHERE id = NEW.flat_id;

    -- Create notification
    PERFORM create_admin_notification(
      NEW.apartment_id,
      'validation_failed',
      'Payment Validation Failed',
      format('Payment validation failed for Flat %s. Reason: %s. Confidence: %s%%',
             COALESCE(v_flat_number, 'Unknown'),
             COALESCE(NEW.validation_reason, 'Unknown reason'),
             COALESCE(NEW.validation_confidence_score::text, 'Unknown')),
      'high',
      NEW.id,
      NULL,
      jsonb_build_object(
        'validation_status', NEW.validation_status,
        'validation_reason', NEW.validation_reason,
        'validation_confidence_score', NEW.validation_confidence_score
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_validation_failed ON payment_submissions;
CREATE TRIGGER notify_on_validation_failed
  AFTER UPDATE ON payment_submissions
  FOR EACH ROW
  WHEN (NEW.validation_status = 'failed' AND (OLD.validation_status IS NULL OR OLD.validation_status != 'failed'))
  EXECUTE FUNCTION notify_admin_validation_failed();

-- Create index on metadata for JSONB queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_metadata 
  ON admin_notifications USING gin(metadata);

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_admin_notification TO service_role;
GRANT INSERT ON admin_notifications TO authenticated;
