/*
  # Optimize Pending Payments Function Performance

  1. Issue
    - Previous function had repeated complex COALESCE calculations causing slow performance
    - Each calculation was done 4-5 times in the query (SELECT, balance, status checks, HAVING)
    
  2. Changes
    - Pre-calculate the amount once in a CTE (Common Table Expression)
    - Use the pre-calculated amount throughout the query
    - Significantly reduces computation time
    
  3. Impact
    - Much faster loading for pending payments
    - Same functionality, better performance
    - Works for all three collection modes (A, B, C)
*/

CREATE OR REPLACE FUNCTION get_pending_payments_for_flat(
  p_flat_id uuid,
  p_email text DEFAULT NULL,
  p_mobile text DEFAULT NULL
)
RETURNS TABLE(
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_apartment_id uuid;
  v_built_up_area numeric;
  v_flat_type text;
BEGIN
  -- Get apartment ID, built_up_area, and flat_type for the flat
  SELECT bbp.apartment_id, fn.built_up_area, fn.flat_type
  INTO v_apartment_id, v_built_up_area, v_flat_type
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  WHERE fn.id = p_flat_id;

  IF v_apartment_id IS NULL THEN
    RETURN;
  END IF;

  -- Use CTE to calculate amount once and reuse it
  RETURN QUERY
  WITH collection_amounts AS (
    SELECT
      ec.id,
      ec.collection_name,
      ec.payment_type,
      ec.payment_frequency,
      ec.due_date,
      ec.daily_fine,
      ec.quarter,
      -- Calculate amount based on collection mode (once!)
      COALESCE(
        ec.amount_due, 
        CASE WHEN ec.rate_per_sqft IS NOT NULL THEN ec.rate_per_sqft * COALESCE(v_built_up_area, 0) END,
        CASE WHEN ec.flat_type_rates IS NOT NULL AND v_flat_type IS NOT NULL 
             THEN (ec.flat_type_rates->>v_flat_type)::numeric 
        END,
        0
      ) AS calculated_amount
    FROM expected_collections ec
    WHERE ec.apartment_id = v_apartment_id
      AND ec.is_active = true
      AND ec.due_date >= CURRENT_DATE - INTERVAL '365 days'
  ),
  payment_totals AS (
    SELECT
      ca.id,
      ca.collection_name,
      ca.payment_type,
      ca.payment_frequency,
      ca.calculated_amount,
      ca.due_date,
      ca.daily_fine,
      COALESCE(
        SUM(ps.payment_amount) FILTER (
          WHERE ps.status IN ('Received', 'Approved')
          AND (
            p_email IS NULL 
            OR LOWER(ps.email) = LOWER(p_email)
            OR (p_mobile IS NOT NULL AND ps.contact_number = p_mobile)
          )
        ), 
        0
      ) AS total_paid
    FROM collection_amounts ca
    LEFT JOIN payment_submissions ps ON (
      ps.expected_collection_id = ca.id 
      AND ps.flat_id = p_flat_id
    )
    GROUP BY ca.id, ca.collection_name, ca.payment_type, ca.payment_frequency, 
      ca.calculated_amount, ca.due_date, ca.daily_fine, ca.quarter
    HAVING COALESCE(
      SUM(ps.payment_amount) FILTER (
        WHERE ps.status IN ('Received', 'Approved')
        AND (
          p_email IS NULL 
          OR LOWER(ps.email) = LOWER(p_email)
          OR (p_mobile IS NOT NULL AND ps.contact_number = p_mobile)
        )
      ), 
      0
    ) < ca.calculated_amount
  )
  SELECT
    pt.id AS collection_id,
    COALESCE(pt.collection_name, 'Payment') AS collection_name,
    pt.payment_type,
    COALESCE(pt.payment_frequency, 'quarterly') AS payment_frequency,
    pt.calculated_amount AS amount_due,
    pt.total_paid AS amount_paid,
    GREATEST(pt.calculated_amount - pt.total_paid, 0) AS balance,
    pt.due_date,
    GREATEST(CURRENT_DATE - pt.due_date, 0) AS overdue_days,
    GREATEST(CURRENT_DATE - pt.due_date, 0) * COALESCE(pt.daily_fine, 0) AS late_fee,
    CASE
      WHEN pt.total_paid >= pt.calculated_amount THEN 'Paid'
      WHEN pt.total_paid > 0 THEN 'Partially Paid'
      WHEN CURRENT_DATE > pt.due_date THEN 'Overdue'
      ELSE 'Due'
    END AS status
  FROM payment_totals pt
  ORDER BY 
    CASE 
      WHEN CURRENT_DATE > pt.due_date THEN 0
      ELSE 1
    END,
    pt.due_date ASC;
END;
$$;

-- Add helpful indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_expected_collections_apartment_active 
  ON expected_collections(apartment_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_payment_submissions_collection_flat 
  ON payment_submissions(expected_collection_id, flat_id, status);

CREATE INDEX IF NOT EXISTS idx_flat_numbers_block 
  ON flat_numbers(block_id);
