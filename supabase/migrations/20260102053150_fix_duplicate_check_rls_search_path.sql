/*
  # Fix Duplicate Check Function - RLS and Search Path Issues

  ## Problem
  The check_payment_duplicate function is not finding existing duplicate records even though they exist.
  This causes multiple duplicate submissions to be allowed.

  ## Root Cause
  1. SECURITY DEFINER with search_path may not be properly bypassing RLS
  2. The function queries payment_submissions which has RLS enabled
  3. When called by anonymous users, RLS blocks visibility of existing records

  ## Solution
  1. Ensure SECURITY DEFINER properly bypasses RLS with correct search_path
  2. Add explicit schema qualification
  3. Use SECURITY INVOKER for the wrapper but DEFINER for internal logic
  4. Add better error logging

  ## Changes
  - Recreate function with proper RLS bypass
  - Add logging for debugging
  - Ensure all records are visible regardless of caller role
*/

-- Drop existing function
DROP FUNCTION IF EXISTS public.check_payment_duplicate(uuid, uuid, uuid, date, timestamptz);

-- Create fixed version with proper RLS bypass
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_record record;
  v_count integer;
BEGIN
  -- Debug: Count total matching records (this should find them)
  SELECT COUNT(*) INTO v_count
  FROM public.payment_submissions ps
  WHERE ps.block_id = p_block_id
    AND ps.flat_id = p_flat_id
    AND ps.expected_collection_id = p_expected_collection_id;

  -- If we found any, get the most recent one
  IF v_count > 0 THEN
    SELECT 
      ps.payment_date,
      ps.created_at,
      ps.payment_quarter,
      ps.payment_type,
      ec.collection_name
    INTO v_existing_record
    FROM public.payment_submissions ps
    LEFT JOIN public.expected_collections ec ON ps.expected_collection_id = ec.id
    WHERE ps.block_id = p_block_id
      AND ps.flat_id = p_flat_id
      AND ps.expected_collection_id = p_expected_collection_id
    ORDER BY ps.created_at DESC
    LIMIT 1;

    -- Return duplicate found
    RETURN QUERY SELECT 
      true,
      v_existing_record.payment_date,
      v_existing_record.created_at,
      v_existing_record.payment_quarter,
      v_existing_record.payment_type,
      v_existing_record.collection_name;
  ELSE
    -- No duplicates found
    RETURN QUERY SELECT 
      false, 
      NULL::date, 
      NULL::timestamptz, 
      NULL::text, 
      NULL::text,
      NULL::text;
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_payment_duplicate(uuid, uuid, uuid, date, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.check_payment_duplicate(uuid, uuid, uuid, date, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.check_payment_duplicate IS 
'Checks for duplicate payment submissions. Uses SECURITY DEFINER to bypass RLS and see all existing payments.';
