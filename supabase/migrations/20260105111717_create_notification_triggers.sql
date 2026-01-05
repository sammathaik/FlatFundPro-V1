/*
  # Notification Triggers for System Events

  ## Overview
  Creates triggers to automatically generate occupant notifications
  when key events occur in the system.

  ## Notification Triggers

  1. **Payment Status Changes**
     - When payment is approved → notification to occupant
     - When payment is rejected → notification with reason
     - When clarification is needed → notification with details

  2. **Collection Status Updates**
     - When collection status is shared → notification to all residents

  ## Functions

  - notify_payment_status_change() - Trigger function for payment approval/rejection
  - notify_collection_status_share() - Trigger function for collection status sharing
  
  ## Design Principles
  
  - Reuse existing event data (status changes in payment_submissions)
  - Don't duplicate notification logic
  - Fire notifications asynchronously where possible
  - Handle multi-flat scenarios correctly
*/

-- Function: Create notification for payment status change
CREATE OR REPLACE FUNCTION notify_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_title text;
  v_message text;
  v_type text;
  v_priority text;
  v_flat_id uuid;
  v_mobile text;
BEGIN
  -- Only process if status changed to approved or rejected
  IF NEW.status IN ('approved', 'rejected') AND OLD.status != NEW.status THEN
    
    -- Get flat_id and mobile from flat_email_mappings
    SELECT fem.flat_id, fem.mobile INTO v_flat_id, v_mobile
    FROM flat_email_mappings fem
    WHERE fem.email = NEW.email
      AND fem.apartment_id = NEW.apartment_id
    LIMIT 1;
    
    -- If we couldn't find mapping, try by mobile directly
    IF v_flat_id IS NULL AND NEW.mobile IS NOT NULL THEN
      SELECT fem.flat_id INTO v_flat_id
      FROM flat_email_mappings fem
      WHERE fem.mobile = NEW.mobile
        AND fem.apartment_id = NEW.apartment_id
      LIMIT 1;
      
      v_mobile := NEW.mobile;
    END IF;
    
    -- Only create notification if we have flat mapping
    IF v_flat_id IS NOT NULL AND v_mobile IS NOT NULL THEN
      
      IF NEW.status = 'approved' THEN
        v_title := 'Payment Approved ✓';
        v_message := 'Your payment submission for ' || COALESCE(NEW.collection_name, NEW.payment_quarter) || 
                    ' has been approved by the committee.' || E'\n\n' ||
                    'Amount: ₹' || NEW.payment_amount::text || E'\n' ||
                    'Payment Date: ' || to_char(NEW.payment_date, 'DD Mon YYYY');
        v_type := 'payment_approved';
        v_priority := 'normal';
        
      ELSIF NEW.status = 'rejected' THEN
        v_title := 'Payment Submission Needs Attention';
        v_message := 'Your payment submission for ' || COALESCE(NEW.collection_name, NEW.payment_quarter) || 
                    ' requires clarification.' || E'\n\n';
        
        IF NEW.admin_comments IS NOT NULL THEN
          v_message := v_message || 'Committee Note: ' || NEW.admin_comments;
        ELSE
          v_message := v_message || 'Please contact the committee for details.';
        END IF;
        
        v_type := 'payment_clarification_needed';
        v_priority := 'high';
      END IF;
      
      -- Insert notification
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
        v_flat_id,
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
          'collection_name', NEW.collection_name,
          'payment_quarter', NEW.payment_quarter,
          'status', NEW.status
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main transaction
    RAISE WARNING 'Error creating payment notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger for payment status changes
DROP TRIGGER IF EXISTS trigger_payment_status_notification ON payment_submissions;
CREATE TRIGGER trigger_payment_status_notification
  AFTER UPDATE ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_status_change();

-- Function: Helper to create collection announcement notifications
CREATE OR REPLACE FUNCTION create_collection_announcement(
  p_apartment_id uuid,
  p_collection_name text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create notifications for all flats in the apartment
  INSERT INTO occupant_notifications (
    apartment_id,
    flat_id,
    recipient_mobile,
    type,
    title,
    message,
    priority,
    related_entity_type,
    context_data
  )
  SELECT
    p_apartment_id,
    fem.flat_id,
    fem.mobile,
    'collection_announcement',
    'Collection Update',
    p_message,
    'normal',
    'collection',
    jsonb_build_object('collection_name', p_collection_name)
  FROM flat_email_mappings fem
  WHERE fem.apartment_id = p_apartment_id
    AND fem.mobile IS NOT NULL
  ON CONFLICT DO NOTHING;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating collection announcement: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_collection_announcement TO authenticated, service_role;