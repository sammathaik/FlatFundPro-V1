/*
  # Enhanced Occupant Payment History with Amount Due
  
  ## Purpose
  Recreates the get_payments_for_flat_with_session function to include
  the amount_due from expected_collections, allowing occupants to see
  both what they paid and what was expected.
  
  ## Changes
  - Adds LEFT JOIN with expected_collections
  - Returns amount_due alongside payment_amount
  - Returns collection_name and payment_frequency
  - Maintains all existing security and validation logic
  
  ## UX Benefit
  Occupants can now clearly see:
  - Amount Due (from collection)
  - Amount Paid (their actual payment)
  - Collection frequency (monthly/quarterly/one-time)
*/

-- Create the enhanced function
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
  FROM occupant_sessions
  WHERE id = session_token
  AND expires_at > now();
  
  -- If no valid session found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get mobile for this occupant
  SELECT fem.mobile INTO v_mobile
  FROM flat_email_mappings fem
  WHERE fem.flat_id = v_session.flat_id
  LIMIT 1;
  
  -- Check if the requested flat_id belongs to the same email+mobile
  SELECT EXISTS(
    SELECT 1
    FROM flat_email_mappings fem
    WHERE fem.flat_id = get_payments_for_flat_with_session.flat_id
    AND LOWER(fem.email) = LOWER(v_session.email)
    AND fem.mobile = v_mobile
  ) INTO v_flat_valid;
  
  -- If flat doesn't belong to this occupant, return empty
  IF NOT v_flat_valid THEN
    RETURN;
  END IF;
  
  -- Return payments with collection details
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
  ORDER BY ps.created_at DESC;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_payments_for_flat_with_session(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payments_for_flat_with_session(uuid, uuid) TO anon;

COMMENT ON FUNCTION public.get_payments_for_flat_with_session IS 'Enhanced to return amount_due and collection details for transaction history clarity';
