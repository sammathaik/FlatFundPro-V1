/*
  # Add Payment Reminders to Occupant Notification Center
  
  ## Problem
  Payment reminders are only sent via WhatsApp/Email (notification_outbox) but don't appear 
  in the occupant portal's notification center (occupant_notifications table).
  
  ## Solution
  Create a function that checks for due payment reminders and creates occupant_notifications
  for each flat that needs a reminder. This function can be called periodically (e.g., daily).
  
  The function will:
  1. Check payment_reminder_schedule for due reminders
  2. For each due reminder, find all flats that haven't paid yet
  3. Create an occupant_notification for each flat
  4. Mark the reminder as sent in the schedule
*/

CREATE OR REPLACE FUNCTION create_occupant_payment_reminders()
RETURNS TABLE(notifications_created integer, reminder_details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_notification_count integer := 0;
  v_notification_list jsonb := '[]'::jsonb;
  v_schedule record;
  v_flat record;
  v_reminder_number integer;
  v_reminder_date date;
  v_days_until_due integer;
  v_expected_amount numeric;
  v_title text;
  v_message text;
  v_notification_id uuid;
  v_has_paid boolean;
BEGIN
  -- Loop through all active reminder schedules
  FOR v_schedule IN
    SELECT 
      prs.id as schedule_id,
      prs.apartment_id,
      prs.expected_collection_id,
      prs.reminder_1_date,
      prs.reminder_1_sent,
      prs.reminder_2_date,
      prs.reminder_2_sent,
      prs.reminder_3_date,
      prs.reminder_3_sent,
      ec.collection_name,
      ec.payment_type,
      ec.due_date,
      ec.amount_due,
      ec.rate_per_sqft,
      ec.flat_type_rates,
      a.default_collection_mode,
      a.apartment_name
    FROM payment_reminder_schedule prs
    JOIN expected_collections ec ON ec.id = prs.expected_collection_id
    JOIN apartments a ON a.id = prs.apartment_id
    WHERE prs.is_active = true
      AND ec.is_active = true
      AND ec.due_date >= CURRENT_DATE
      AND (
        (prs.reminder_1_date = CURRENT_DATE AND prs.reminder_1_sent = false) OR
        (prs.reminder_2_date = CURRENT_DATE AND prs.reminder_2_sent = false) OR
        (prs.reminder_3_date = CURRENT_DATE AND prs.reminder_3_sent = false)
      )
  LOOP
    -- Determine which reminder to send
    IF v_schedule.reminder_1_date = CURRENT_DATE AND v_schedule.reminder_1_sent = false THEN
      v_reminder_number := 1;
      v_reminder_date := v_schedule.reminder_1_date;
    ELSIF v_schedule.reminder_2_date = CURRENT_DATE AND v_schedule.reminder_2_sent = false THEN
      v_reminder_number := 2;
      v_reminder_date := v_schedule.reminder_2_date;
    ELSIF v_schedule.reminder_3_date = CURRENT_DATE AND v_schedule.reminder_3_sent = false THEN
      v_reminder_number := 3;
      v_reminder_date := v_schedule.reminder_3_date;
    ELSE
      CONTINUE;
    END IF;
    
    v_days_until_due := v_schedule.due_date - CURRENT_DATE;
    
    -- Loop through all flats in the apartment with mobile numbers
    FOR v_flat IN
      SELECT
        fn.id as flat_id,
        fn.flat_number,
        fn.built_up_area,
        fn.flat_type,
        fem.mobile,
        fem.name,
        fem.occupant_type
      FROM flat_numbers fn
      JOIN flat_email_mappings fem ON fem.flat_id = fn.id
      WHERE fn.block_id IN (
        SELECT id FROM buildings_blocks_phases
        WHERE apartment_id = v_schedule.apartment_id
      )
      AND fem.mobile IS NOT NULL
      AND fem.mobile != ''
    LOOP
      -- Check if payment already submitted
      SELECT EXISTS (
        SELECT 1 FROM payment_submissions
        WHERE expected_collection_id = v_schedule.expected_collection_id
        AND flat_id = v_flat.flat_id
        AND status IN ('Received', 'Reviewed', 'Approved')
      ) INTO v_has_paid;
      
      -- Skip if already paid
      CONTINUE WHEN v_has_paid;
      
      -- Calculate expected amount based on collection mode
      v_expected_amount := CASE v_schedule.default_collection_mode
        WHEN 'A' THEN v_schedule.amount_due
        WHEN 'B' THEN v_schedule.rate_per_sqft * COALESCE(v_flat.built_up_area, 0)
        WHEN 'C' THEN COALESCE(
          (v_schedule.flat_type_rates->>v_flat.flat_type)::numeric,
          v_schedule.amount_due
        )
        ELSE v_schedule.amount_due
      END;
      
      -- Create notification title and message
      v_title := format('Payment Reminder: %s', v_schedule.collection_name);
      
      v_message := format(
        E'Dear %s,\n\n' ||
        'This is a friendly reminder that your payment for *%s* is due on *%s* (%s days remaining).\n\n' ||
        '📍 Flat: %s\n' ||
        '💰 Amount Due: ₹%s\n' ||
        '📅 Due Date: %s\n\n' ||
        'Please submit your payment at your earliest convenience to avoid late fees.\n\n' ||
        'Thank you!\n%s Management',
        v_flat.name,
        v_schedule.collection_name,
        to_char(v_schedule.due_date, 'DD Mon YYYY'),
        v_days_until_due,
        v_flat.flat_number,
        to_char(v_expected_amount, 'FM999999999.00'),
        to_char(v_schedule.due_date, 'DD Mon YYYY'),
        v_schedule.apartment_name
      );
      
      -- Insert occupant notification
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
        v_schedule.apartment_id,
        v_flat.flat_id,
        v_flat.mobile,
        'payment_reminder',
        v_title,
        v_message,
        CASE 
          WHEN v_days_until_due <= 3 THEN 'high'
          WHEN v_days_until_due <= 7 THEN 'normal'
          ELSE 'low'
        END,
        'expected_collection',
        v_schedule.expected_collection_id,
        jsonb_build_object(
          'collection_name', v_schedule.collection_name,
          'due_date', v_schedule.due_date,
          'expected_amount', v_expected_amount,
          'days_until_due', v_days_until_due,
          'reminder_number', v_reminder_number,
          'flat_number', v_flat.flat_number
        )
      )
      RETURNING id INTO v_notification_id;
      
      -- Increment counter and add to details
      v_notification_count := v_notification_count + 1;
      v_notification_list := v_notification_list || jsonb_build_object(
        'flat_number', v_flat.flat_number,
        'recipient_name', v_flat.name,
        'collection_name', v_schedule.collection_name,
        'due_date', v_schedule.due_date,
        'reminder_number', v_reminder_number,
        'notification_id', v_notification_id
      );
    END LOOP;
    
    -- Mark the reminder as sent in the schedule
    IF v_reminder_number = 1 THEN
      UPDATE payment_reminder_schedule
      SET reminder_1_sent = true,
          reminder_1_sent_at = now(),
          reminder_1_sent_count = reminder_1_sent_count + 1,
          updated_at = now()
      WHERE id = v_schedule.schedule_id;
    ELSIF v_reminder_number = 2 THEN
      UPDATE payment_reminder_schedule
      SET reminder_2_sent = true,
          reminder_2_sent_at = now(),
          reminder_2_sent_count = reminder_2_sent_count + 1,
          updated_at = now()
      WHERE id = v_schedule.schedule_id;
    ELSIF v_reminder_number = 3 THEN
      UPDATE payment_reminder_schedule
      SET reminder_3_sent = true,
          reminder_3_sent_at = now(),
          reminder_3_sent_count = reminder_3_sent_count + 1,
          updated_at = now()
      WHERE id = v_schedule.schedule_id;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_notification_count, v_notification_list;
END;
$$;

-- Grant execute permission to authenticated users (for testing)
GRANT EXECUTE ON FUNCTION create_occupant_payment_reminders() TO authenticated;

-- Comment explaining the function
COMMENT ON FUNCTION create_occupant_payment_reminders() IS 
'Creates occupant_notifications for due payment reminders. Should be called daily via cron job or edge function.';
