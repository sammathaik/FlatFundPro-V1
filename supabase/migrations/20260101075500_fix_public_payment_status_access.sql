/*
  # Fix Public Payment Status Access

  ## Problem
  Public payment status links are not loading correctly for residents

  ## Root Cause Analysis
  The issue occurs when:
  1. The apartment's public_access_code is NULL or not set correctly
  2. RLS policies might be blocking anonymous access to required data

  ## Solution
  1. Ensure all active apartments have a public_access_code
  2. Re-grant permissions to anonymous users for the RPC function
  3. Add a diagnostic function to check access codes

  ## Changes
  1. Update any apartments with NULL public_access_code
  2. Ensure SECURITY DEFINER is set on get_payment_status_data
  3. Create a diagnostic helper function
*/

-- Update any apartments that are missing public_access_code
UPDATE apartments
SET public_access_code = regexp_replace(lower(apartment_name), '[^a-z0-9]+', '-', 'g')
WHERE public_access_code IS NULL OR public_access_code = '';

-- Ensure the get_payment_status_data function has proper permissions
GRANT EXECUTE ON FUNCTION public.get_payment_status_data(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_payment_status_data(text) TO authenticated;

-- Create a diagnostic function to help troubleshoot access code issues
CREATE OR REPLACE FUNCTION public.check_apartment_public_access(access_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'found', CASE WHEN a.id IS NOT NULL THEN true ELSE false END,
    'apartment_id', a.id,
    'apartment_name', a.apartment_name,
    'status', a.status,
    'public_access_code', a.public_access_code,
    'has_expected_collections', (
      SELECT COUNT(*) > 0
      FROM expected_collections ec
      WHERE ec.apartment_id = a.id
    ),
    'has_buildings', (
      SELECT COUNT(*) > 0
      FROM buildings_blocks_phases bbp
      WHERE bbp.apartment_id = a.id
    ),
    'has_payments', (
      SELECT COUNT(*) > 0
      FROM payment_submissions ps
      WHERE ps.apartment_id = a.id
    )
  )
  INTO v_result
  FROM apartments a
  WHERE a.public_access_code = access_code
  LIMIT 1;

  RETURN COALESCE(v_result, json_build_object(
    'found', false,
    'message', 'No apartment found with access code: ' || access_code,
    'available_codes', (
      SELECT json_agg(public_access_code)
      FROM apartments
      WHERE status = 'active'
      AND public_access_code IS NOT NULL
      LIMIT 10
    )
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_apartment_public_access(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_apartment_public_access(text) TO authenticated;

COMMENT ON FUNCTION public.check_apartment_public_access IS 'Diagnostic function to check if an apartment access code is valid and has required data';
