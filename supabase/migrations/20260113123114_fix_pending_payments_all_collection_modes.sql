/*
  # Fix Pending Payments for All Collection Modes (A, B, C)

  1. Issue
    - Function only handled Mode A (fixed amount) and Mode B (per-sqft)
    - Mode C (flat-type-based) was not implemented, causing no results for apartments like Esteem Enclave
    - Flat A-101 (Studio type) should show ₹5000 maintenance but showed nothing

  2. Collection Modes
    - Mode A: Fixed amount (amount_due field)
    - Mode B: Per square feet (rate_per_sqft × built_up_area)
    - Mode C: Flat type based (flat_type_rates JSONB lookup by flat_type)

  3. Changes
    - Add flat_type to the function query
    - Calculate amount using priority: amount_due → rate_per_sqft calculation → flat_type_rates lookup
    - Update all amount comparisons to use the unified calculation

  4. Impact
    - All three collection modes now work correctly
    - Esteem Enclave occupants will see their pending payments
    - Backward compatibility maintained for modes A and B
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

  -- Return expected collections with payment status
  -- Calculate amount_due based on collection mode:
  -- Mode A: use amount_due if set
  -- Mode B: use rate_per_sqft * built_up_area
  -- Mode C: use flat_type_rates JSONB lookup
  RETURN QUERY
  SELECT
    ec.id AS collection_id,
    COALESCE(ec.collection_name, ec.quarter || ' ' || ec.payment_type) AS collection_name,
    ec.payment_type,
    COALESCE(ec.payment_frequency, 'quarterly') AS payment_frequency,
    -- Calculate actual amount based on collection mode
    COALESCE(
      ec.amount_due, 
      CASE WHEN ec.rate_per_sqft IS NOT NULL THEN ec.rate_per_sqft * COALESCE(v_built_up_area, 0) END,
      CASE WHEN ec.flat_type_rates IS NOT NULL AND v_flat_type IS NOT NULL 
           THEN (ec.flat_type_rates->>v_flat_type)::numeric 
      END,
      0
    ) AS amount_due,
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
      COALESCE(
        ec.amount_due, 
        CASE WHEN ec.rate_per_sqft IS NOT NULL THEN ec.rate_per_sqft * COALESCE(v_built_up_area, 0) END,
        CASE WHEN ec.flat_type_rates IS NOT NULL AND v_flat_type IS NOT NULL 
             THEN (ec.flat_type_rates->>v_flat_type)::numeric 
        END,
        0
      ) - COALESCE(
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
      ) >= COALESCE(
        ec.amount_due, 
        CASE WHEN ec.rate_per_sqft IS NOT NULL THEN ec.rate_per_sqft * COALESCE(v_built_up_area, 0) END,
        CASE WHEN ec.flat_type_rates IS NOT NULL AND v_flat_type IS NOT NULL 
             THEN (ec.flat_type_rates->>v_flat_type)::numeric 
        END,
        0
      ) THEN 'Paid'
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
    ec.amount_due, ec.due_date, ec.daily_fine, ec.quarter, ec.rate_per_sqft, ec.flat_type_rates
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
  ) < COALESCE(
    ec.amount_due, 
    CASE WHEN ec.rate_per_sqft IS NOT NULL THEN ec.rate_per_sqft * COALESCE(v_built_up_area, 0) END,
    CASE WHEN ec.flat_type_rates IS NOT NULL AND v_flat_type IS NOT NULL 
         THEN (ec.flat_type_rates->>v_flat_type)::numeric 
    END,
    0
  )
  ORDER BY 
    CASE 
      WHEN CURRENT_DATE > ec.due_date THEN 0
      ELSE 1
    END,
    ec.due_date ASC;
END;
$$;
