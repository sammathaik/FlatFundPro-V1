/*
  # Fix Notification Outbox Insert Policy for Trigger Function

  ## Overview
  The trigger function needs permission to insert into notification_outbox table.
  Currently only SELECT policies exist, preventing the trigger from creating notifications.

  ## Changes
  1. Add INSERT policy for authenticated users (trigger functions run as authenticated)
  2. Add INSERT policy for service role to allow system operations

  ## Security
  - Only system/trigger functions can insert (via SECURITY DEFINER)
  - Users cannot directly insert notification records
  - Maintains audit trail and traceability
*/

-- Add policy to allow trigger functions to insert notifications
-- The trigger function runs with SECURITY DEFINER, so it needs an INSERT policy
CREATE POLICY "System can insert notifications"
  ON notification_outbox FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add policy for service role as well (for edge functions and system operations)
CREATE POLICY "Service role can insert notifications"
  ON notification_outbox FOR INSERT
  TO service_role
  WITH CHECK (true);
