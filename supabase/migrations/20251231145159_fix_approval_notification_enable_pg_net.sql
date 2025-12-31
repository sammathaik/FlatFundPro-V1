/*
  # Fix Payment Approval Notifications - Enable pg_net Extension
  
  1. Problem
    - Payment approval notifications are not being sent
    - Trigger tries to call net.http_post() but pg_net extension is not enabled
    - This causes the trigger to fail silently
    - Only EMAIL approval notifications appear in audit, no WhatsApp
  
  2. Root Cause
    - The http extension (pg_net) needs to be enabled for async HTTP calls
    - Without it, the trigger cannot call the edge function
  
  3. Solution
    - Enable pg_net extension
    - This allows triggers to make HTTP POST requests to edge functions
  
  4. Impact
    - Approval notifications will now send correctly
    - Both EMAIL and WhatsApp approval notifications will appear in communication audit
*/

-- Enable pg_net extension for HTTP requests from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;

COMMENT ON EXTENSION pg_net IS 
'Enables async HTTP requests from PostgreSQL. Required for payment approval notification triggers to call edge functions.';
