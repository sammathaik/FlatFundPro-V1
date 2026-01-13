/*
  # Fix Pending Payments Function for Per-SqFt Calculation

  1. Issue
    - The `get_pending_payments_for_flat` function was not calculating amounts for collections that use per-square-feet pricing
    - When `amount_due` is NULL and `rate_per_sqft` is set, the function should calculate: rate_per_sqft * built_up_area
    - This caused no pending payments to show for apartments using collection mode B (per sqft)

  2. Changes
    - Update function to calculate actual amount_due based on flat's built_up_area when rate_per_sqft is set
    - Use the calculated amount in all comparisons and filtering
    - Maintain backward compatibility for fixed-amount collections

  3. Impact
    - Occupants in apartments with per-sqft pricing will now see their pending payments correctly
    - Fixes the issue where Flat N-102 (1500 sqft) wasn't showing ₹4500 pending for maintenance (₹3/sqft)
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
BEGIN
  -- Get apartment ID and built_up_area for the flat
  SELECT bbp.apartment_id, fn.built_up_area 
  INTO v_apartment_id, v_built_up_area
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  WHERE fn.id = p_flat_id;

  IF v_apartment_id IS NULL THEN
    RETURN;
  END IF;

  -- Return expected collections with payment status
  -- Calculate amount_due based on rate_per_sqft if amount_due is NULL
  RETURN QUERY
  SELECT
    ec.id AS collection_id,
    COALESCE(ec.collection_name, ec.quarter || ' ' || ec.payment_type) AS collection_name,
    ec.payment_type,
    COALESCE(ec.payment_frequency, 'quarterly') AS payment_frequency,
    -- Calculate actual amount: use amount_due if set, otherwise calculate from rate_per_sqft
    COALESCE(ec.amount_due, ec.rate_per_sqft * COALESCE(v_built_up_area, 0)) AS amount_due,
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
    ) AS amount_paid,
    GREATEST(
      COALESCE(ec.amount_due, ec.rate_per_sqft * COALESCE(v_built_up_area, 0)) - COALESCE(
        SUM(ps.payment_amount) FILTER (
          WHERE ps.status IN ('Received', 'Approved')
          AND (
            p_email IS NULL 
            OR LOWER(ps.email) = LOWER(p_email)
            OR (p_mobile IS NOT NULL AND ps.contact_number = p_mobile)
          )
        ), 
        0
      ), 
      0
    ) AS balance,
    ec.due_date,
    GREATEST(CURRENT_DATE - ec.due_date, 0) AS overdue_days,
    GREATEST(CURRENT_DATE - ec.due_date, 0) * COALESCE(ec.daily_fine, 0) AS late_fee,
    CASE
      WHEN COALESCE(
        SUM(ps.payment_amount) FILTER (
          WHERE ps.status IN ('Received', 'Approved')
          AND (
            p_email IS NULL 
            OR LOWER(ps.email) = LOWER(p_email)
            OR (p_mobile IS NOT NULL AND ps.contact_number = p_mobile)
          )
        ), 
        0
      ) >= COALESCE(ec.amount_due, ec.rate_per_sqft * COALESCE(v_built_up_area, 0)) THEN 'Paid'
      WHEN COALESCE(
        SUM(ps.payment_amount) FILTER (
          WHERE ps.status IN ('Received', 'Approved')
          AND (
            p_email IS NULL 
            OR LOWER(ps.email) = LOWER(p_email)
            OR (p_mobile IS NOT NULL AND ps.contact_number = p_mobile)
          )
        ), 
        0
      ) > 0 THEN 'Partially Paid'
      WHEN CURRENT_DATE > ec.due_date THEN 'Overdue'
      ELSE 'Due'
    END AS status
  FROM expected_collections ec
  LEFT JOIN payment_submissions ps ON (
    ps.expected_collection_id = ec.id 
    AND ps.flat_id = p_flat_id
  )
  WHERE ec.apartment_id = v_apartment_id
    AND ec.is_active = true
    AND ec.due_date >= CURRENT_DATE - INTERVAL '365 days'
  GROUP BY ec.id, ec.collection_name, ec.payment_type, ec.payment_frequency, 
    ec.amount_due, ec.due_date, ec.daily_fine, ec.quarter, ec.rate_per_sqft
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
  ) < COALESCE(ec.amount_due, ec.rate_per_sqft * COALESCE(v_built_up_area, 0))
  ORDER BY 
    CASE 
      WHEN CURRENT_DATE > ec.due_date THEN 0
      ELSE 1
    END,
    ec.due_date ASC;
END;
$$;
