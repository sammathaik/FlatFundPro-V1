/*
  # Fix get_resident_payment_history Function

  1. Changes
    - Fixes GROUP BY clause error in get_resident_payment_history function
    - Removes ORDER BY inside jsonb_agg to prevent aggregate function issues
    - Simplifies query structure for better performance
  
  2. Notes
    - Function is used by mobile payment flow to show payment history
    - Returns payments for a specific flat with collection details
*/

-- Drop and recreate the function with corrected SQL
CREATE OR REPLACE FUNCTION get_resident_payment_history(
  p_flat_id uuid,
  p_apartment_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payments jsonb;
BEGIN
  -- Build payments array without GROUP BY issues
  SELECT COALESCE(
    jsonb_agg(payment_data),
    '[]'::jsonb
  )
  INTO v_payments
  FROM (
    SELECT jsonb_build_object(
      'id', ps.id,
      'payment_amount', ps.payment_amount,
      'payment_date', ps.payment_date,
      'payment_type', ps.payment_type,
      'payment_quarter', ps.payment_quarter,
      'status', ps.status,
      'created_at', ps.created_at,
      'collection_name', ec.collection_name
    ) as payment_data
    FROM payment_submissions ps
    LEFT JOIN expected_collections ec ON ec.id = ps.expected_collection_id
    WHERE ps.flat_id = p_flat_id
      AND ps.apartment_id = p_apartment_id
    ORDER BY ps.created_at DESC
    LIMIT p_limit
  ) subquery;

  RETURN jsonb_build_object(
    'success', true,
    'payments', v_payments
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_resident_payment_history(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_resident_payment_history(uuid, uuid, integer) TO anon;
