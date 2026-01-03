/*
  # Fix Pending Payments Function - Apartment ID Join
  
  ## Problem
  The get_pending_payments_for_flat function was trying to get apartment_id directly
  from flat_numbers table, but that column doesn't exist there. It needs to join
  through buildings_blocks_phases to get the apartment_id.
  
  ## Solution
  Update the function to properly join flat_numbers -> buildings_blocks_phases
  to retrieve the apartment_id.
  
  ## Schema Reference
  - flat_numbers: has block_id (references buildings_blocks_phases)
  - buildings_blocks_phases: has apartment_id (references apartments)
  - expected_collections: has apartment_id
*/

-- Drop and recreate the function with proper join
DROP FUNCTION IF EXISTS public.get_pending_payments_for_flat(uuid);

CREATE OR REPLACE FUNCTION public.get_pending_payments_for_flat(
  p_flat_id uuid
)
RETURNS TABLE (
  collection_id uuid,
  collection_name text,
  payment_type text,
  payment_frequency text,
  amount_due numeric,
  amount_paid numeric,
  balance numeric,
  due_date date,
  overdue_days integer,
  late_fee numeric,
  status text
) AS $$
DECLARE
  v_apartment_id uuid;
BEGIN
  -- Get apartment ID for the flat by joining through buildings_blocks_phases
  SELECT bbp.apartment_id INTO v_apartment_id
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
  WHERE fn.id = p_flat_id;
  
  IF v_apartment_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return expected collections with payment status
  RETURN QUERY
  SELECT
    ec.id AS collection_id,
    COALESCE(ec.collection_name, ec.quarter || ' ' || ec.payment_type) AS collection_name,
    ec.payment_type,
    COALESCE(ec.payment_frequency, 'quarterly') AS payment_frequency,
    ec.amount_due,
    COALESCE(SUM(ps.payment_amount) FILTER (WHERE ps.status = 'Approved'), 0) AS amount_paid,
    GREATEST(ec.amount_due - COALESCE(SUM(ps.payment_amount) FILTER (WHERE ps.status = 'Approved'), 0), 0) AS balance,
    ec.due_date,
    GREATEST(CURRENT_DATE - ec.due_date, 0) AS overdue_days,
    GREATEST(CURRENT_DATE - ec.due_date, 0) * COALESCE(ec.daily_fine, 0) AS late_fee,
    CASE
      WHEN COALESCE(SUM(ps.payment_amount) FILTER (WHERE ps.status = 'Approved'), 0) >= ec.amount_due THEN 'Paid'
      WHEN COALESCE(SUM(ps.payment_amount) FILTER (WHERE ps.status = 'Approved'), 0) > 0 THEN 'Partially Paid'
      WHEN CURRENT_DATE > ec.due_date THEN 'Overdue'
      ELSE 'Due'
    END AS status
  FROM expected_collections ec
  LEFT JOIN payment_submissions ps ON (
    ps.expected_collection_id = ec.id 
    AND ps.flat_id = p_flat_id
    AND ps.status = 'Approved'
  )
  WHERE ec.apartment_id = v_apartment_id
    AND ec.is_active = true
    AND ec.due_date >= CURRENT_DATE - INTERVAL '365 days'  -- Only show last year
  GROUP BY ec.id, ec.collection_name, ec.payment_type, ec.payment_frequency, 
           ec.amount_due, ec.due_date, ec.daily_fine
  HAVING COALESCE(SUM(ps.payment_amount) FILTER (WHERE ps.status = 'Approved'), 0) < ec.amount_due
  ORDER BY 
    CASE 
      WHEN CURRENT_DATE > ec.due_date THEN 0  -- Overdue first
      ELSE 1
    END,
    ec.due_date ASC;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pending_payments_for_flat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_payments_for_flat(uuid) TO anon;

COMMENT ON FUNCTION public.get_pending_payments_for_flat IS 'Returns pending/due collections for an occupant flat with payment status and overdue calculations. Fixed to properly join through buildings_blocks_phases for apartment_id.';
