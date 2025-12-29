/*
  # Fix Lead Acknowledgment Trigger - Audit Log Column Names

  1. Issue
    - Function trying to insert into non-existent columns in audit_logs
    - Was using `changed_by` and `changes` but actual columns are `user_id` and `details`

  2. Fix
    - Update function to use correct column names
    - Map data correctly to audit_logs structure

  3. Notes
    - This fixes the 400 error when submitting marketing leads
    - Audit log will now work correctly
*/

-- Fix the function to use correct audit_logs column names
CREATE OR REPLACE FUNCTION send_lead_acknowledgment_email()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log the email request to audit logs with correct column names
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    details,
    entity_name,
    status
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
    NEW.name,
    'success'
  );

  -- Log for debugging
  RAISE LOG 'Lead acknowledgment email requested for: % (lead_id: %)', NEW.email, NEW.id;

  -- Return NEW to continue with insert
  RETURN NEW;
END;
$$;

-- Comment on fixed function
COMMENT ON FUNCTION send_lead_acknowledgment_email() IS 
'Logs lead acknowledgment email request with correct audit_logs column names. Actual email sending handled by application layer.';
