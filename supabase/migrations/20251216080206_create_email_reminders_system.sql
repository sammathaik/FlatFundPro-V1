/*
  Email Reminder System
  
  1. New Tables
    - email_reminders table for tracking sent reminders
  
  2. Security
    - Enable RLS with proper policies
  
  3. Functions
    - Get flats without payment confirmation
    - Send bulk reminders
*/

-- Create email_reminders table
CREATE TABLE IF NOT EXISTS email_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  expected_collection_id uuid NOT NULL REFERENCES expected_collections(id) ON DELETE CASCADE,
  flat_id uuid REFERENCES flat_numbers(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('due_soon', 'overdue', 'final_notice', 'manual')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_reminders_apartment ON email_reminders(apartment_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_collection ON email_reminders(expected_collection_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_flat ON email_reminders(flat_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_sent_at ON email_reminders(sent_at);

-- Enable RLS
ALTER TABLE email_reminders ENABLE ROW LEVEL SECURITY;

-- Policy for apartment admins to view their apartment's reminders
CREATE POLICY "Admins can view their apartment reminders"
  ON email_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = email_reminders.apartment_id
      AND admins.status = 'active'
    )
  );

-- Policy for super admins to view all reminders
CREATE POLICY "Super admins can view all reminders"
  ON email_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Policy for admins to create reminders
CREATE POLICY "Admins can create reminders"
  ON email_reminders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = email_reminders.apartment_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Function to get flats without payment confirmation for a collection
CREATE OR REPLACE FUNCTION get_flats_without_payment(
  p_apartment_id uuid,
  p_expected_collection_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_is_admin boolean;
BEGIN
  -- Check if user is admin or super admin
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
    AND apartment_id = p_apartment_id
    AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid()
    AND status = 'active'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Get flats without approved payments for this collection
  SELECT COALESCE(json_agg(
    json_build_object(
      'flat_id', fn.id,
      'flat_number', fn.flat_number,
      'block_name', bbp.block_name,
      'email', fem.email,
      'mobile', fem.mobile,
      'occupant_type', fem.occupant_type,
      'collection_name', ec.collection_name,
      'payment_type', ec.payment_type,
      'amount_due', ec.amount_due,
      'due_date', ec.due_date,
      'daily_fine', ec.daily_fine
    )
  ), '[]'::json)
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id AND fem.apartment_id = p_apartment_id
  CROSS JOIN expected_collections ec
  WHERE bbp.apartment_id = p_apartment_id
  AND ec.id = p_expected_collection_id
  AND fem.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM payment_submissions ps
    WHERE ps.flat_id = fn.id
    AND ps.apartment_id = p_apartment_id
    AND ps.expected_collection_id = p_expected_collection_id
    AND ps.status = 'Approved'
  )
  INTO v_result;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_flats_without_payment(uuid, uuid) TO authenticated;
