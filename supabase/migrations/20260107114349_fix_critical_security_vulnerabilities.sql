/*
  # Fix Critical Security Vulnerabilities

  ## Security Issues Fixed
  
  1. **flat_email_mappings - Unrestricted Anonymous UPDATE**
     - REMOVED: Overly permissive policy allowing any anonymous user to update any mapping
     - This was flagged as a CRITICAL security risk by Supabase Security Advisor
     - Anonymous users should NOT be able to modify occupant data directly
  
  2. **chatbot_conversations - Data Leakage**
     - FIXED: Anonymous users could view ALL conversations (not just their own)
     - NOW: Anonymous users can only view conversations matching their session_id
     - Prevents privacy violations and unauthorized data access
  
  3. **chatbot_messages - Data Leakage**
     - FIXED: Anonymous users could view ALL messages (not just their own)
     - NOW: Anonymous users can only view messages in conversations they created
     - Prevents privacy violations and unauthorized data access
  
  ## Impact
  
  - Fixes 3 critical security vulnerabilities flagged by Supabase Security Advisor
  - Prevents unauthorized data modification and access
  - Maintains legitimate functionality for anonymous chatbot users
  - Protects occupant privacy and data integrity
*/

-- ============================================================================
-- FIX 1: Remove dangerous flat_email_mappings UPDATE policy for anonymous users
-- ============================================================================

DROP POLICY IF EXISTS "Occupants can update their own mobile" ON flat_email_mappings;

-- Note: Updates to flat_email_mappings should only be done through:
-- 1. Authenticated admins (existing policy: "Admins can manage mappings")
-- 2. RPC functions with proper validation (e.g., mobile login flows)
-- Anonymous users should NEVER directly modify this sensitive data

-- ============================================================================
-- FIX 2: Restrict chatbot_conversations SELECT for anonymous users
-- ============================================================================

DROP POLICY IF EXISTS "Guests can view session conversations" ON chatbot_conversations;

CREATE POLICY "Guests can view own session conversations"
  ON chatbot_conversations
  FOR SELECT
  TO anon
  USING (
    session_id IS NOT NULL 
    AND session_id = current_setting('request.headers', true)::json->>'x-session-id'
  );

-- Fallback: If session tracking is not implemented, restrict to no access
-- Better to be restrictive than to leak all data

-- ============================================================================
-- FIX 3: Restrict chatbot_messages SELECT for anonymous users
-- ============================================================================

DROP POLICY IF EXISTS "Guests can view session messages" ON chatbot_messages;

CREATE POLICY "Guests can view own session messages"
  ON chatbot_messages
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 
      FROM chatbot_conversations cc
      WHERE cc.id = chatbot_messages.conversation_id
        AND cc.session_id IS NOT NULL
        AND cc.session_id = current_setting('request.headers', true)::json->>'x-session-id'
    )
  );

-- ============================================================================
-- Verification: Check remaining policies with 'true' clause
-- ============================================================================

-- After this migration, run:
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (qual = 'true' OR with_check = 'true')
-- ORDER BY tablename;

-- Expected remaining 'true' policies are for:
-- - System/service_role inserts (audit logs, notifications, etc.)
-- - Intentionally open endpoints (marketing leads, public payment submissions)
