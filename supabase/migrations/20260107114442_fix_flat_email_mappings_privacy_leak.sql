/*
  # Fix Privacy Leak in flat_email_mappings

  ## Security Issue Fixed
  
  **flat_email_mappings - Unrestricted SELECT exposes all occupant data**
  - CRITICAL: Policy "Public can validate mappings" with USING(true) allows 
    anonymous users to view ALL occupant personal information:
    - Names, email addresses, mobile numbers
    - OTPs and OTP expiration times
    - WhatsApp preferences
    - All flat assignments
  
  ## Solution
  
  - REMOVE: Overly permissive "Public can validate mappings" policy
  - KEEP: Mobile login validation through secure RPC functions only
  - These RPC functions (generate_mobile_otp, verify_mobile_otp) have proper
    parameter validation and don't expose bulk data
  
  ## Impact
  
  - Prevents unauthorized access to ALL occupant personal data
  - Maintains legitimate mobile login functionality through RPC functions
  - Protects resident privacy and prevents data scraping
  - Complies with data protection best practices
  
  ## Functionality Preserved
  
  Mobile login still works through:
  - generate_mobile_otp(mobile, flat_id, apartment_id) - validates before sending OTP
  - verify_mobile_otp(mobile, flat_id, otp_code) - validates OTP
  - These functions internally check flat_email_mappings without exposing all data
*/

-- ============================================================================
-- Remove privacy-violating policy that exposes all occupant data
-- ============================================================================

DROP POLICY IF EXISTS "Public can validate mappings" ON flat_email_mappings;

-- ============================================================================
-- Note: Mobile login validation should ONLY occur through RPC functions:
-- - generate_mobile_otp() - validates mobile/flat combination before generating OTP
-- - verify_mobile_otp() - validates OTP and creates session
-- - get_pending_payments_for_flat() - validates session access
-- 
-- Direct table access for validation is a security anti-pattern that:
-- 1. Exposes ALL occupant data to enumeration attacks
-- 2. Allows scraping of personal information (names, emails, phones)
-- 3. Reveals OTPs and expiration times
-- 4. Violates privacy regulations (GDPR, etc.)
-- ============================================================================

-- ============================================================================
-- Verification: Confirm flat_email_mappings policies
-- ============================================================================

-- After this migration, flat_email_mappings should only have:
-- 1. "Admins can manage mappings" - authenticated admins only
-- 2. "Occupants can view their mappings" - authenticated occupants only  
-- 3. "Super admins can view all occupants" - authenticated super admins only
--
-- NO anonymous access to this sensitive table except through RPC functions
