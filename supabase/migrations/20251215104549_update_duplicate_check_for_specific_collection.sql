/*
  # Update Duplicate Payment Check to Consider Specific Collection
  
  1. Changes
    - Modifies the `check_payment_duplicate` function to accept expected_collection_id parameter
    - Updates duplicate check logic to verify if payment already exists for the SPECIFIC collection
    - Allows users to pay for different collection types (maintenance, contingency, emergency) independently
  
  2. Logic
    - A duplicate is now defined as: same block_id, flat_id, AND expected_collection_id
    - This allows an owner/tenant to submit payments for multiple collections (e.g., maintenance and contingency) separately
    - Previous behavior blocked any payment in the same quarter regardless of type
  
  3. Security
    - Maintains SECURITY DEFINER for RLS bypass
    - Grants execute permission to anonymous users
*/

-- Drop the old function
DROP FUNCTION IF EXISTS public.check_payment_duplicate(uuid, uuid, date, timestamptz);

-- Create updated function that checks for specific collection
CREATE OR REPLACE FUNCTION public.check_payment_duplicate(
  p_block_id uuid,
  p_flat_id uuid,
  p_expected_collection_id uuid,
  p_payment_date date DEFAULT NULL,
  p_submission_date timestamptz DEFAULT now()
)
RETURNS TABLE (
  is_duplicate boolean,
  existing_payment_date date,
  existing_created_at timestamptz,
  existing_quarter text,
  existing_payment_type text,
  existing_collection_name text
) AS $$
DECLARE
  existing_record record;
BEGIN
  -- Check for existing submissions with same block, flat, and collection
  SELECT 
    ps.payment_date,
    ps.created_at,
    ps.payment_quarter,
    ps.payment_type,
    ec.collection_name
  INTO existing_record
  FROM payment_submissions ps
  LEFT JOIN expected_collections ec ON ps.expected_collection_id = ec.id
  WHERE ps.block_id = p_block_id
    AND ps.flat_id = p_flat_id
    AND ps.expected_collection_id = p_expected_collection_id
  ORDER BY ps.created_at DESC
  LIMIT 1;
  
  -- Return result
  IF existing_record IS NOT NULL THEN
    RETURN QUERY SELECT 
      true,
      existing_record.payment_date,
      existing_record.created_at,
      existing_record.payment_quarter,
      existing_record.payment_type,
      existing_record.collection_name;
  ELSE
    RETURN QUERY SELECT 
      false, 
      NULL::date, 
      NULL::timestamptz, 
      NULL::text, 
      NULL::text,
      NULL::text;
  END IF;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.check_payment_duplicate(uuid, uuid, uuid, date, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.check_payment_duplicate(uuid, uuid, uuid, date, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.check_payment_duplicate IS 'Checks for duplicate payment submissions based on block, flat, and specific collection. Allows multiple payments for different collections (maintenance, contingency, emergency).';
