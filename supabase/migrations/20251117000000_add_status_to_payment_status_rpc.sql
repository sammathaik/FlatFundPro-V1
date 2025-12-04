-- Add status field to get_payment_status_data RPC function
-- This is required for the new payment status calculation logic

CREATE OR REPLACE FUNCTION public.get_payment_status_data(access_code text)
RETURNS TABLE (
  apartment_id uuid,
  flat_id uuid,
  expected_collection_id uuid,
  payment_amount numeric,
  payment_type text,
  payment_quarter text,
  payment_date date,
  status text,
  created_at timestamptz
) AS $$
DECLARE
  target_apartment_id uuid;
BEGIN
  SELECT id INTO target_apartment_id
  FROM apartments
  WHERE public_access_code = access_code
    AND status = 'active';

  IF target_apartment_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      ps.apartment_id,
      ps.flat_id,
      ps.expected_collection_id,
      ps.payment_amount,
      ps.payment_type,
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

GRANT EXECUTE ON FUNCTION public.get_payment_status_data(text) TO anon;
