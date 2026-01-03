/*
  # Fix Mobile Number Format Matching Bug
  
  ## Problem
  Payment records are not displaying for occupants because mobile number formats don't match:
  - payment_submissions.contact_number stored as: "9686394010" (no country code)
  - flat_email_mappings.mobile stored as: "+919686394010" (with country code)
  - Query functions fail to match these because they do exact string comparison
  
  ## Changes
  
  ### 1. Data Cleanup
  - Normalize all contact_number values in payment_submissions to include +91 prefix
  - Only update records that are missing the + prefix
  
  ### 2. Function Fix
  - Recreate get_payments_for_flat_with_session to normalize mobile numbers before comparison
  - Add mobile number normalization helper function
  
  ## Impact
  - 23+ payment records will now be correctly matched and displayed
  - Specifically fixes T-19 payment (c9b11416-7bcd-4641-85c1-ce47f8dcec53) for Meenakshi Residency
  
  ## Security
  - Maintains existing RLS and session validation
  - No changes to access control logic
*/

-- Step 1: Create mobile number normalization function
CREATE OR REPLACE FUNCTION normalize_mobile_for_comparison(mobile_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF mobile_input IS NULL OR mobile_input = '' THEN
    RETURN '';
  END IF;
  
  -- Remove all non-digit characters
  mobile_input := regexp_replace(mobile_input, '[^0-9]', '', 'g');
  
  -- If starts with 91 and is 12 digits, add + prefix
  IF mobile_input ~ '^91[0-9]{10}$' THEN
    RETURN '+' || mobile_input;
  END IF;
  
  -- If 10 digits, add +91 prefix
  IF mobile_input ~ '^[0-9]{10}$' THEN
    RETURN '+91' || mobile_input;
  END IF;
  
  -- Otherwise return with + if it doesn't have one
  IF NOT mobile_input LIKE '+%' THEN
    RETURN '+' || mobile_input;
  END IF;
  
  RETURN mobile_input;
END;
$$;

-- Step 2: Normalize all existing contact_number values in payment_submissions
UPDATE payment_submissions
SET contact_number = normalize_mobile_for_comparison(contact_number)
WHERE contact_number IS NOT NULL
  AND contact_number NOT LIKE '+%';

-- Step 3: Recreate get_payments_for_flat_with_session with mobile normalization
DROP FUNCTION IF EXISTS public.get_payments_for_flat_with_session(uuid, uuid);

CREATE FUNCTION public.get_payments_for_flat_with_session(
  session_token uuid,
  flat_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  payment_amount numeric,
  payment_date date,
  payment_type text,
  payment_quarter text,
  platform text,
  transaction_reference text,
  comments text,
  created_at timestamptz,
  status text,
  amount_due numeric,
  collection_name text,
  payment_frequency text
) AS $$
DECLARE
  v_session RECORD;
  v_mobile text;
  v_flat_valid boolean;
BEGIN
  -- Get and validate session
  SELECT * INTO v_session
  FROM occupant_sessions os
  WHERE os.id = session_token
  AND os.expires_at > now();
  
  -- If no valid session found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get mobile for this occupant (normalize it)
  SELECT normalize_mobile_for_comparison(fem.mobile) INTO v_mobile
  FROM flat_email_mappings fem
  WHERE fem.flat_id = v_session.flat_id
  LIMIT 1;
  
  -- Check if the requested flat_id belongs to the same email+mobile
  SELECT EXISTS(
    SELECT 1
    FROM flat_email_mappings fem
    WHERE fem.flat_id = get_payments_for_flat_with_session.flat_id
    AND LOWER(fem.email) = LOWER(v_session.email)
    AND normalize_mobile_for_comparison(fem.mobile) = v_mobile
  ) INTO v_flat_valid;
  
  -- If flat doesn't belong to this occupant, return empty
  IF NOT v_flat_valid THEN
    RETURN;
  END IF;
  
  -- Return payments with normalized mobile number matching
  RETURN QUERY
  SELECT 
    ps.id,
    ps.name,
    ps.payment_amount,
    ps.payment_date,
    ps.payment_type,
    ps.payment_quarter,
    ps.platform,
    ps.transaction_reference,
    ps.comments,
    ps.created_at,
    ps.status,
    ec.amount_due,
    COALESCE(ec.collection_name, ec.quarter || ' ' || ec.payment_type) AS collection_name,
    COALESCE(ec.payment_frequency, 'quarterly') AS payment_frequency
  FROM payment_submissions ps
  LEFT JOIN expected_collections ec ON ps.expected_collection_id = ec.id
  WHERE ps.flat_id = get_payments_for_flat_with_session.flat_id
    AND normalize_mobile_for_comparison(ps.contact_number) = v_mobile
  ORDER BY ps.created_at DESC;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_payments_for_flat_with_session(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payments_for_flat_with_session(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION normalize_mobile_for_comparison(text) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_mobile_for_comparison(text) TO anon;

COMMENT ON FUNCTION public.get_payments_for_flat_with_session IS 'Fixed to normalize mobile numbers for proper matching regardless of format (+91 vs 91 vs plain 10-digit)';
COMMENT ON FUNCTION normalize_mobile_for_comparison IS 'Normalizes mobile numbers to +91XXXXXXXXXX format for consistent comparison';
