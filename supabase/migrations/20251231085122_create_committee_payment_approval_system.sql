/*
  # Committee Payment Approval System

  This migration implements a comprehensive committee approval workflow with governance controls.

  ## Changes

  1. **Extend payment_submissions table**
     - Add submission source tracking (resident vs admin)
     - Add committee action type and reason
     - Add original values preservation
     - Add committee verification flags
     - Add approval tracking fields

  2. **Create payment_audit_trail table**
     - Track all modifications to payment records
     - Store before/after values
     - Link to admin and reason
     - Enable comprehensive audit history

  3. **Create approval notifications tracking**
     - Extend notification_outbox for approval notifications
     - Track email and WhatsApp delivery status

  ## Security
     - RLS policies ensure only admins can modify payment actions
     - Audit trail is immutable (insert-only)
     - All changes are logged and traceable
*/

-- Add new columns to payment_submissions for committee actions
ALTER TABLE payment_submissions
ADD COLUMN IF NOT EXISTS submission_source text DEFAULT 'resident' CHECK (submission_source IN ('resident', 'admin_on_behalf')),
ADD COLUMN IF NOT EXISTS admin_action_type text CHECK (admin_action_type IN ('approve_as_is', 'edit_and_approve', 'submit_on_behalf', 'rejected')),
ADD COLUMN IF NOT EXISTS committee_action_reason text,
ADD COLUMN IF NOT EXISTS original_values jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS committee_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES admins(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approval_notification_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_email_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS approval_whatsapp_sent_at timestamptz;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_payment_submissions_submission_source 
ON payment_submissions(submission_source);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_admin_action_type 
ON payment_submissions(admin_action_type);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_committee_verified 
ON payment_submissions(committee_verified) 
WHERE committee_verified = true;

CREATE INDEX IF NOT EXISTS idx_payment_submissions_approved_by 
ON payment_submissions(approved_by);

-- Create payment_audit_trail table for comprehensive audit history
CREATE TABLE IF NOT EXISTS payment_audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_submission_id uuid NOT NULL REFERENCES payment_submissions(id) ON DELETE CASCADE,
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'created',
    'status_changed',
    'amount_modified',
    'date_modified',
    'details_modified',
    'approved',
    'rejected',
    'committee_override'
  )),
  performed_by uuid REFERENCES admins(id),
  performed_by_email text,
  performed_by_role text CHECK (performed_by_role IN ('apartment_admin', 'super_admin', 'system')),
  before_values jsonb DEFAULT '{}'::jsonb,
  after_values jsonb DEFAULT '{}'::jsonb,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_payment_audit_trail_payment_id 
ON payment_audit_trail(payment_submission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_audit_trail_apartment 
ON payment_audit_trail(apartment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_audit_trail_performed_by 
ON payment_audit_trail(performed_by);

CREATE INDEX IF NOT EXISTS idx_payment_audit_trail_action_type 
ON payment_audit_trail(action_type);

-- Enable RLS on payment_audit_trail
ALTER TABLE payment_audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_audit_trail
CREATE POLICY "Super admins can view all audit trails"
  ON payment_audit_trail FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Apartment admins can view their apartment audit trails"
  ON payment_audit_trail FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = payment_audit_trail.apartment_id
      AND admins.status = 'active'
    )
  );

CREATE POLICY "Admins can insert audit trail entries"
  ON payment_audit_trail FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Function to log payment modifications
CREATE OR REPLACE FUNCTION log_payment_modification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id uuid;
  v_admin_email text;
  v_admin_role text;
  v_action_type text;
  v_before jsonb;
  v_after jsonb;
BEGIN
  -- Determine admin performing action
  SELECT id, admin_email INTO v_admin_id, v_admin_email
  FROM admins
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Check if super admin
  IF v_admin_id IS NULL THEN
    SELECT id, email INTO v_admin_id, v_admin_email
    FROM super_admins
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    IF v_admin_id IS NOT NULL THEN
      v_admin_role := 'super_admin';
    END IF;
  ELSE
    v_admin_role := 'apartment_admin';
  END IF;

  -- Determine action type based on changes
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'created';
    v_before := '{}'::jsonb;
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect specific changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'Approved' THEN
        v_action_type := 'approved';
      ELSIF NEW.status = 'Rejected' THEN
        v_action_type := 'rejected';
      ELSE
        v_action_type := 'status_changed';
      END IF;
    ELSIF OLD.payment_amount IS DISTINCT FROM NEW.payment_amount THEN
      v_action_type := 'amount_modified';
    ELSIF OLD.payment_date IS DISTINCT FROM NEW.payment_date THEN
      v_action_type := 'date_modified';
    ELSIF NEW.admin_action_type IN ('edit_and_approve', 'submit_on_behalf') THEN
      v_action_type := 'committee_override';
    ELSE
      v_action_type := 'details_modified';
    END IF;

    -- Store changed fields only
    v_before := jsonb_build_object(
      'status', OLD.status,
      'payment_amount', OLD.payment_amount,
      'payment_date', OLD.payment_date,
      'transaction_reference', OLD.transaction_reference,
      'payment_type', OLD.payment_type
    );
    
    v_after := jsonb_build_object(
      'status', NEW.status,
      'payment_amount', NEW.payment_amount,
      'payment_date', NEW.payment_date,
      'transaction_reference', NEW.transaction_reference,
      'payment_type', NEW.payment_type
    );
  END IF;

  -- Insert audit trail entry
  INSERT INTO payment_audit_trail (
    payment_submission_id,
    apartment_id,
    action_type,
    performed_by,
    performed_by_email,
    performed_by_role,
    before_values,
    after_values,
    reason,
    metadata
  ) VALUES (
    NEW.id,
    NEW.apartment_id,
    v_action_type,
    v_admin_id,
    v_admin_email,
    v_admin_role,
    v_before,
    v_after,
    NEW.committee_action_reason,
    jsonb_build_object(
      'admin_action_type', NEW.admin_action_type,
      'submission_source', NEW.submission_source,
      'committee_verified', NEW.committee_verified
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for automatic audit logging
DROP TRIGGER IF EXISTS trg_payment_audit_log ON payment_submissions;
CREATE TRIGGER trg_payment_audit_log
AFTER INSERT OR UPDATE ON payment_submissions
FOR EACH ROW
EXECUTE FUNCTION log_payment_modification();

-- Function to get payment audit history
CREATE OR REPLACE FUNCTION get_payment_audit_history(p_payment_id uuid)
RETURNS TABLE (
  id uuid,
  action_type text,
  performed_by_email text,
  performed_by_role text,
  before_values jsonb,
  after_values jsonb,
  reason text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pat.id,
    pat.action_type,
    pat.performed_by_email,
    pat.performed_by_role,
    pat.before_values,
    pat.after_values,
    pat.reason,
    pat.created_at
  FROM payment_audit_trail pat
  WHERE pat.payment_submission_id = p_payment_id
  ORDER BY pat.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_payment_audit_history(uuid) TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN payment_submissions.submission_source IS 
'Indicates whether payment was submitted by resident or admin on their behalf';

COMMENT ON COLUMN payment_submissions.admin_action_type IS 
'Type of committee action: approve_as_is, edit_and_approve, submit_on_behalf, or rejected';

COMMENT ON COLUMN payment_submissions.committee_action_reason IS 
'Mandatory reason provided by committee member for any action taken. Required for governance and audit.';

COMMENT ON COLUMN payment_submissions.original_values IS 
'Stores original submission values before any committee edits for audit trail';

COMMENT ON COLUMN payment_submissions.committee_verified IS 
'Indicates payment has been verified and approved by committee member';

COMMENT ON TABLE payment_audit_trail IS 
'Comprehensive audit trail of all payment modifications, committee actions, and status changes';

COMMENT ON FUNCTION log_payment_modification() IS 
'Automatically logs all payment modifications to audit trail with before/after values';

COMMENT ON FUNCTION get_payment_audit_history(uuid) IS 
'Retrieves complete audit history for a specific payment submission';
