/*
  # Fix Payment Status Function - Add Missing Fields

  ## Overview
  Fixes the get_payment_status_data function to include all fields required by the frontend.

  ## Problem
  The payment status dashboard is broken because:
  1. The function is missing the `status` field in its return type (although it tries to select it)
  2. The function is missing the `payment_source` field which was recently added
  3. Frontend expects these fields in the PaymentSnapshot type

  ## Solution
  Drop and recreate the get_payment_status_data function to return all required fields:
  - apartment_id
  - flat_id
  - expected_collection_id
  - payment_amount
  - payment_type
  - payment_source (NEW)
  - payment_quarter
  - payment_date
  - status (FIXED - was selected but not in return type)
  - created_at

  ## Changes Made
  1. DROP the existing function (required to change return type)
  2. CREATE with correct return type including `status` and `payment_source`
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_payment_status_data(text);

-- Recreate with correct return type
CREATE OR REPLACE FUNCTION public.get_payment_status_data(access_code text)
RETURNS TABLE (
  apartment_id uuid,
  flat_id uuid,
  expected_collection_id uuid,
  payment_amount numeric,
  payment_type text,
  payment_source text,
  payment_quarter text,
  payment_date date,
  status text,
  created_at timestamptz
) AS $$
DECLARE
  target_apartment_id uuid;
BEGIN
  -- Find the apartment by public access code
  SELECT id INTO target_apartment_id
  FROM apartments
  WHERE public_access_code = access_code
    AND status = 'active';

  IF target_apartment_id IS NULL THEN
    RETURN;
  END IF;

  -- Return all payment submissions for this apartment
  RETURN QUERY
    SELECT
      ps.apartment_id,
      ps.flat_id,
      ps.expected_collection_id,
      ps.payment_amount,
      ps.payment_type,
      ps.payment_source,
      ps.payment_quarter,
      ps.payment_date,
      ps.status,
      ps.created_at
    FROM payment_submissions ps
    WHERE ps.apartment_id = target_apartment_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions;

-- Ensure anonymous users can access this function (for public payment status page)
GRANT EXECUTE ON FUNCTION public.get_payment_status_data(text) TO anon;

COMMENT ON FUNCTION public.get_payment_status_data IS 'Returns payment data for public payment status dashboard using apartment access code. Includes status and payment_source fields.';
