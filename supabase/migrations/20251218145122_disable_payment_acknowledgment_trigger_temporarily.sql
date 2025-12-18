/*
  # Temporarily Disable Payment Acknowledgment Trigger for Debugging
  
  1. Overview
    - Temporarily disables the payment acknowledgment email trigger
    - This will help diagnose if the trigger is causing payment submission failures
  
  2. Changes
    - Drops the trigger (can be re-enabled later)
    - Function remains intact for future use
*/

-- Temporarily disable the trigger
DROP TRIGGER IF EXISTS trigger_payment_acknowledgment ON payment_submissions;

COMMENT ON FUNCTION send_payment_acknowledgment_email() IS 
'Payment acknowledgment email function - TRIGGER CURRENTLY DISABLED FOR DEBUGGING';
