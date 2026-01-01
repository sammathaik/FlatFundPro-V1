/*
  # Remove Super Admin Access to Notification Outbox

  ## Changes
  - Drop the "Super admins can view all notifications" policy
  - Update get_notification_statistics function to remove super admin access
  - Update get_payment_notification_history function to remove super admin access

  ## Security
  - Super Admins will no longer have access to notification_outbox table
  - Only Apartment Admins can access notification data for their apartments
*/

-- Drop super admin access policy for notification_outbox
DROP POLICY IF EXISTS "Super admins can view all notifications" ON notification_outbox;

-- Update get_notification_statistics to remove super admin access
CREATE OR REPLACE FUNCTION get_notification_statistics(
  p_apartment_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_is_authorized boolean;
BEGIN
  -- Check authorization (Apartment Admins only)
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
    AND (p_apartment_id IS NULL OR apartment_id = p_apartment_id)
    AND status = 'active'
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get notification statistics
  SELECT json_build_object(
    'total_notifications', COUNT(*),
    'by_status', json_agg(DISTINCT jsonb_build_object(
      'status', status,
      'count', (SELECT COUNT(*) FROM notification_outbox no2 WHERE no2.status = no.status)
    )),
    'by_template', json_agg(DISTINCT jsonb_build_object(
      'template', template_name,
      'count', (SELECT COUNT(*) FROM notification_outbox no3 WHERE no3.template_name = no.template_name)
    )),
    'by_delivery_mode', json_agg(DISTINCT jsonb_build_object(
      'mode', delivery_mode,
      'count', (SELECT COUNT(*) FROM notification_outbox no4 WHERE no4.delivery_mode = no.delivery_mode)
    )),
    'date_range', json_build_object(
      'start', COALESCE(p_start_date, MIN(created_at)),
      'end', COALESCE(p_end_date, MAX(created_at))
    )
  )
  FROM notification_outbox no
  WHERE (p_apartment_id IS NULL OR payment_submission_id IN (
    SELECT id::text FROM payment_submissions WHERE apartment_id = p_apartment_id
  ))
  AND (p_start_date IS NULL OR created_at >= p_start_date)
  AND (p_end_date IS NULL OR created_at <= p_end_date)
  INTO v_result;

  RETURN COALESCE(v_result, '{}'::json);
END;
$$;

-- Update get_payment_notification_history to remove super admin access
CREATE OR REPLACE FUNCTION get_payment_notification_history(
  p_payment_submission_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_is_authorized boolean;
BEGIN
  -- Check if user has access to this payment's apartment (Apartment Admins only)
  SELECT EXISTS (
    SELECT 1 FROM payment_submissions ps
    JOIN admins a ON a.apartment_id = ps.apartment_id
    WHERE ps.id::text = p_payment_submission_id
    AND a.user_id = auth.uid()
    AND a.status = 'active'
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get notification history
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', id,
      'recipient_name', recipient_name,
      'recipient_phone', recipient_phone,
      'channel', channel,
      'delivery_mode', delivery_mode,
      'template_name', template_name,
      'message_preview', message_preview,
      'trigger_reason', trigger_reason,
      'status', status,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ), '[]'::json)
  FROM notification_outbox
  WHERE payment_submission_id = p_payment_submission_id
  INTO v_result;

  RETURN v_result;
END;
$$;
