/*
  # Add Duplicate Payment Check Function
  
  - Creates a function to check for duplicate payment submissions
  - Allows anonymous users to check for duplicates before submitting
  - Returns minimal information about existing duplicate if found
  - Uses SECURITY DEFINER to bypass RLS for duplicate checking
*/

-- Function to check for duplicate payment submissions
-- Duplicate is defined as: same block_id, flat_id, and payment_quarter
CREATE OR REPLACE FUNCTION public.check_payment_duplicate(
  p_block_id uuid,
  p_flat_id uuid,
  p_payment_date date,
  p_submission_date timestamptz DEFAULT now()
)
RETURNS TABLE (
  is_duplicate boolean,
  existing_payment_date date,
  existing_created_at timestamptz,
  existing_quarter text,
  existing_payment_type text
) AS $$
DECLARE
  calculated_quarter text;
  existing_record record;
BEGIN
  -- Calculate the quarter that would be used for this submission
  calculated_quarter := calculate_payment_quarter(p_payment_date, p_submission_date);
  
  -- Check for existing submissions with same block, flat, and quarter (regardless of payment_type)
  SELECT 
    payment_date,
    created_at,
    payment_quarter,
    payment_type
  INTO existing_record
  FROM payment_submissions
  WHERE block_id = p_block_id
    AND flat_id = p_flat_id
    AND (
      payment_quarter = calculated_quarter
      OR (
        payment_quarter IS NULL
        AND calculate_payment_quarter(payment_date, created_at) = calculated_quarter
      )
    )
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Return result
  IF existing_record IS NOT NULL THEN
    RETURN QUERY SELECT 
      true,
      existing_record.payment_date,
      existing_record.created_at,
      COALESCE(existing_record.payment_quarter, calculate_payment_quarter(existing_record.payment_date, existing_record.created_at)),
      existing_record.payment_type;
  ELSE
    RETURN QUERY SELECT false, NULL::date, NULL::timestamptz, NULL::text, NULL::text;
  END IF;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.check_payment_duplicate(uuid, uuid, date, timestamptz) TO anon;

COMMENT ON FUNCTION public.check_payment_duplicate IS 'Checks for duplicate payment submissions based on block, flat, and quarter only. Returns minimal information if duplicate found.';
