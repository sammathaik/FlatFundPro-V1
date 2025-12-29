/*
  # Simplify Lead Acknowledgment Email Trigger

  1. Changes
    - Simplified trigger function that works without pg_net extension
    - Logs email request to audit logs for tracking
    - Creates a simpler integration approach

  2. Alternative Approach
    - Email sending handled via edge function invocation
    - Can be called from application layer after lead submission
    - Or via webhook/scheduled job

  3. Notes
    - This ensures lead creation never fails due to email issues
    - Email is sent asynchronously via application layer
    - Audit trail maintained for all email attempts
*/

-- Simplified function that logs the email request
CREATE OR REPLACE FUNCTION send_lead_acknowledgment_email()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log the email request to audit logs
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    changed_by,
    changes,
    created_at
  ) VALUES (
    'marketing_leads',
    NEW.id,
    'lead_acknowledgment_email_requested',
    NULL,
    jsonb_build_object(
      'email', NEW.email,
      'name', NEW.name,
      'apartment_name', NEW.apartment_name,
      'city', NEW.city,
      'action', 'send_acknowledgment_email'
    ),
    NOW()
  );

  -- Log for debugging
  RAISE LOG 'Lead acknowledgment email requested for: % (lead_id: %)', NEW.email, NEW.id;

  -- Return NEW to continue with insert
  RETURN NEW;
END;
$$;

-- Comment on simplified approach
COMMENT ON FUNCTION send_lead_acknowledgment_email() IS 
'Logs lead acknowledgment email request. Actual email sending handled by application layer or edge function.';
