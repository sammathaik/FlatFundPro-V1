/*
  # Fix get_payment_status_data Function - Ambiguous Column Reference

  ## Problem
  The get_payment_status_data function has an ambiguous column reference error:
  - The function returns a column named "status"
  - The query uses "status = 'active'" without table qualification
  - PostgreSQL cannot determine if this refers to the return column or apartments.status

  ## Solution
  Qualify the column name with the table name to remove ambiguity

  ## Changes
  1. Drop and recreate the function with qualified column names
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_payment_status_data(text);

-- Recreate with properly qualified column names
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
  SELECT a.id INTO target_apartment_id
  FROM apartments a
  WHERE a.public_access_code = access_code
    AND a.status = 'active';

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
GRANT EXECUTE ON FUNCTION public.get_payment_status_data(text) TO authenticated;

COMMENT ON FUNCTION public.get_payment_status_data IS 'Returns payment data for public payment status dashboard using apartment access code. Includes status and payment_source fields.';
