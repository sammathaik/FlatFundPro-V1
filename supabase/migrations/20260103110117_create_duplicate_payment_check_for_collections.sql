/*
  # Create Duplicate Payment Check for Collections
  
  ## Purpose
  Creates a function to check if a payment has already been submitted for a specific
  collection by the same flat, considering email and mobile number for validation.
  
  ## Features
  - Checks for existing payments for the same expected_collection_id
  - Validates against flat_id, email, and mobile number combination
  - Considers payments in 'Received' or 'Approved' status
  - Returns count of existing payments
  
  ## Security
  - Uses SECURITY DEFINER to bypass RLS for duplicate checking
  - Accessible to authenticated and anonymous users
  - Only returns count, no sensitive data
  
  ## Returns
  Integer count of existing payments matching the criteria
*/

-- Create function to check for duplicate payment by collection
CREATE OR REPLACE FUNCTION public.check_duplicate_payment(
  p_flat_id uuid,
  p_expected_collection_id uuid,
  p_email text,
  p_mobile text
)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count existing payments for this collection from this flat
  -- Match by flat_id and expected_collection_id
  -- Additionally verify email or mobile matches for security
  SELECT COUNT(*)::integer INTO v_count
  FROM payment_submissions
  WHERE flat_id = p_flat_id
    AND expected_collection_id = p_expected_collection_id
    AND status IN ('Received', 'Approved')
    AND (
      LOWER(email) = LOWER(p_email)
      OR (p_mobile IS NOT NULL AND contact_number = p_mobile)
    );
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_duplicate_payment(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_duplicate_payment(uuid, uuid, text, text) TO anon;

COMMENT ON FUNCTION public.check_duplicate_payment IS 'Checks if a payment has already been submitted for a specific collection by the same flat. Returns count of existing matching payments.';
