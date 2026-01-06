/*
  # Fix Occupant Notification Trigger for Payment Status Changes
  
  ## Problem
  The `notify_payment_status_change()` trigger was not creating occupant_notifications because:
  1. Case mismatch: checking for 'approved'/'rejected' instead of 'Approved'/'Rejected'
  2. Wrong column references: using NEW.email (doesn't exist) instead of NEW.flat_id
  3. Missing status transitions like 'Reviewed', 'Received'
  
  ## Solution
  Recreate the trigger function to:
  - Use correct capitalized status values
  - Look up mobile from flat_email_mappings using NEW.flat_id directly
  - Handle all relevant status transitions (Approved, Rejected, Reviewed, Received)
  - Create appropriate notifications for occupant portal
*/

CREATE OR REPLACE FUNCTION notify_payment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_title text;
  v_message text;
  v_type text;
  v_priority text;
  v_mobile text;
  v_name text;
  v_flat_number text;
BEGIN
  -- Only process if status changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get mobile and name from flat_email_mappings using flat_id
  SELECT fem.mobile, fem.name
  INTO v_mobile, v_name
  FROM flat_email_mappings fem
  WHERE fem.flat_id = NEW.flat_id
  LIMIT 1;
  
  -- If no mobile found, cannot create notification
  IF v_mobile IS NULL OR v_mobile = '' THEN
    RETURN NEW;
  END IF;
  
  -- Get flat number
  SELECT fn.flat_number
  INTO v_flat_number
  FROM flat_numbers fn
  WHERE fn.id = NEW.flat_id;
  
  -- Use name from payment submission if available
  v_name := COALESCE(NEW.name, v_name, 'Resident');
  
  -- Determine notification based on new status
  CASE NEW.status
    WHEN 'Approved' THEN
      v_title := 'Payment Approved ✓';
      v_message := 'Your payment submission for ' || COALESCE(NEW.payment_type, NEW.payment_quarter) || 
                   ' has been approved by the committee.' || E'\n\n' ||
                   'Amount: ₹' || NEW.payment_amount::text || E'\n' ||
                   'Payment Date: ' || to_char(NEW.payment_date, 'DD Mon YYYY');
      v_type := 'payment_approved';
      v_priority := 'normal';
      
    WHEN 'Rejected' THEN
      v_title := 'Payment Submission Needs Attention';
      v_message := 'Your payment submission for ' || COALESCE(NEW.payment_type, NEW.payment_quarter) || 
                   ' requires clarification.' || E'\n\n';
      
      IF NEW.admin_comments IS NOT NULL AND NEW.admin_comments != '' THEN
        v_message := v_message || 'Committee Note: ' || NEW.admin_comments;
      ELSE
        v_message := v_message || 'Please contact the committee for details.';
      END IF;
      
      v_type := 'payment_clarification_needed';
      v_priority := 'high';
      
    WHEN 'Reviewed' THEN
      v_title := 'Payment Under Review';
      v_message := 'Your payment submission for ' || COALESCE(NEW.payment_type, NEW.payment_quarter) || 
                   ' is being reviewed by the committee.' || E'\n\n' ||
                   'Amount: ₹' || NEW.payment_amount::text || E'\n' ||
                   'You will be notified once the review is complete.';
      v_type := 'payment_under_review';
      v_priority := 'normal';
      
    WHEN 'Received' THEN
      v_title := 'Payment Submission Received';
      v_message := 'Thank you! We have received your payment submission for ' || 
                   COALESCE(NEW.payment_type, NEW.payment_quarter) || '.' || E'\n\n' ||
                   'Amount: ₹' || NEW.payment_amount::text || E'\n' ||
                   'Our team will review it shortly.';
      v_type := 'payment_received';
      v_priority := 'normal';
      
    ELSE
      -- For other statuses, don't create notification
      RETURN NEW;
  END CASE;
  
  -- Insert notification into occupant_notifications
  INSERT INTO occupant_notifications (
    apartment_id,
    flat_id,
    recipient_mobile,
    type,
    title,
    message,
    priority,
    related_entity_type,
    related_entity_id,
    context_data
  ) VALUES (
    NEW.apartment_id,
    NEW.flat_id,
    v_mobile,
    v_type,
    v_title,
    v_message,
    v_priority,
    'payment_submission',
    NEW.id,
    jsonb_build_object(
      'payment_amount', NEW.payment_amount,
      'payment_date', NEW.payment_date,
      'payment_type', NEW.payment_type,
      'payment_quarter', NEW.payment_quarter,
      'status', NEW.status,
      'flat_number', v_flat_number
    )
  );
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main transaction
    RAISE WARNING 'Error creating payment notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS trigger_payment_status_notification ON payment_submissions;

CREATE TRIGGER trigger_payment_status_notification
  AFTER UPDATE ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_status_change();
