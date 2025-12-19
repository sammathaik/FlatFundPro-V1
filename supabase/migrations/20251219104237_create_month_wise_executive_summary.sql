/*
  # Create Month-wise Executive Summary Function
  
  1. Purpose
    - Generate comprehensive month-wise collections view for admins
    - Mode-aware calculations (A: Flat Rate, B: Area-Based, C: Flat-Type Based)
    - Shows expected, collected, outstanding, and fines per month
    - Supports monthly, quarterly, and one-time collections
  
  2. Key Features
    - Calculates expected amounts based on apartment's maintenance mode
    - Aggregates all active collections by month
    - Calculates actual collections from payment submissions
    - Computes expected fines for overdue flats
    - Provides collection-wise breakdown per month
  
  3. Mode Calculation Logic
    - Mode A: amount_due × total_flats
    - Mode B: rate_per_sqft × total_built_up_area
    - Mode C: Σ(flat_type_count × flat_type_rate)
  
  4. Month Attribution
    - Monthly: Contributes every month
    - Quarterly: Contributes only in due month
    - One-time: Contributes only in due month
  
  5. Fine Calculation
    - Fines = unpaid_flats × daily_fine × overdue_days
    - Only for payments past due date
    - Respects apartment maintenance mode
*/

-- Drop existing function if any
DROP FUNCTION IF EXISTS get_month_wise_executive_summary(uuid, date, date);

CREATE OR REPLACE FUNCTION get_month_wise_executive_summary(
  p_apartment_id uuid,
  p_start_date date DEFAULT DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')::date,
  p_end_date date DEFAULT DATE_TRUNC('month', CURRENT_DATE + INTERVAL '6 months')::date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_is_super_admin boolean;
  v_is_apartment_admin boolean;
  v_apartment_mode collection_mode_enum;
  v_flat_count integer;
  v_total_built_up_area numeric;
BEGIN
  -- Check permissions
  SELECT EXISTS (
    SELECT 1 FROM super_admins 
    WHERE user_id = auth.uid() AND status = 'active'
  ) INTO v_is_super_admin;
  
  SELECT EXISTS (
    SELECT 1 FROM admins 
    WHERE user_id = auth.uid() 
    AND apartment_id = p_apartment_id 
    AND status = 'active'
  ) INTO v_is_apartment_admin;
  
  IF NOT (v_is_super_admin OR v_is_apartment_admin) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get apartment configuration
  SELECT 
    default_collection_mode,
    (SELECT COUNT(*) FROM flat_numbers fn 
     JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id 
     WHERE bbp.apartment_id = p_apartment_id),
    (SELECT COALESCE(SUM(fn.built_up_area), 0) FROM flat_numbers fn 
     JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id 
     WHERE bbp.apartment_id = p_apartment_id)
  INTO v_apartment_mode, v_flat_count, v_total_built_up_area
  FROM apartments
  WHERE id = p_apartment_id;

  -- Generate month-wise executive summary
  WITH month_series AS (
    SELECT 
      DATE_TRUNC('month', generate_series)::date AS month_start,
      (DATE_TRUNC('month', generate_series) + INTERVAL '1 month - 1 day')::date AS month_end
    FROM generate_series(
      DATE_TRUNC('month', p_start_date::timestamp),
      DATE_TRUNC('month', p_end_date::timestamp),
      '1 month'::interval
    )
  ),
  flat_type_summary AS (
    SELECT 
      fn.flat_type,
      COUNT(*) as count
    FROM flat_numbers fn
    JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
    WHERE bbp.apartment_id = p_apartment_id
    AND fn.flat_type IS NOT NULL
    GROUP BY fn.flat_type
  ),
  collections_with_expected AS (
    SELECT 
      ec.id as collection_id,
      ec.collection_name,
      ec.payment_frequency,
      ec.due_date,
      ec.daily_fine,
      ec.amount_due,
      ec.rate_per_sqft,
      ec.flat_type_rates,
      CASE v_apartment_mode
        WHEN 'A' THEN ec.amount_due * v_flat_count
        WHEN 'B' THEN ec.rate_per_sqft * v_total_built_up_area
        WHEN 'C' THEN (
          SELECT COALESCE(SUM(
            fts.count * (ec.flat_type_rates->>fts.flat_type)::numeric
          ), 0)
          FROM flat_type_summary fts
          WHERE ec.flat_type_rates ? fts.flat_type
        )
      END as expected_amount
    FROM expected_collections ec
    WHERE ec.apartment_id = p_apartment_id
    AND ec.is_active = true
  ),
  month_collection_mapping AS (
    SELECT 
      ms.month_start,
      ms.month_end,
      cwe.collection_id,
      cwe.collection_name,
      cwe.payment_frequency,
      cwe.due_date,
      cwe.daily_fine,
      cwe.expected_amount,
      CASE 
        WHEN cwe.payment_frequency = 'monthly' THEN true
        WHEN cwe.payment_frequency = 'quarterly' AND DATE_TRUNC('month', cwe.due_date) = ms.month_start THEN true
        WHEN cwe.payment_frequency = 'one-time' AND DATE_TRUNC('month', cwe.due_date) = ms.month_start THEN true
        ELSE false
      END as contributes_this_month
    FROM month_series ms
    CROSS JOIN collections_with_expected cwe
  ),
  month_wise_data AS (
    SELECT 
      mcm.month_start,
      mcm.month_end,
      SUM(CASE WHEN mcm.contributes_this_month THEN mcm.expected_amount ELSE 0 END) as total_expected,
      COALESCE((
        SELECT SUM(ps.payment_amount)
        FROM payment_submissions ps
        WHERE ps.apartment_id = p_apartment_id
        AND ps.status = 'Approved'
        AND DATE_TRUNC('month', ps.payment_date) = mcm.month_start
      ), 0) as total_collected,
      json_agg(
        CASE WHEN mcm.contributes_this_month THEN
          json_build_object(
            'collectionName', mcm.collection_name,
            'frequency', mcm.payment_frequency,
            'dueDate', mcm.due_date,
            'expectedAmount', mcm.expected_amount,
            'dailyFine', mcm.daily_fine,
            'collectedAmount', COALESCE((
              SELECT SUM(ps.payment_amount)
              FROM payment_submissions ps
              WHERE ps.apartment_id = p_apartment_id
              AND ps.expected_collection_id = mcm.collection_id
              AND ps.status = 'Approved'
              AND DATE_TRUNC('month', ps.payment_date) = mcm.month_start
            ), 0)
          )
        ELSE NULL END
      ) FILTER (WHERE mcm.contributes_this_month) as collections_breakdown
    FROM month_collection_mapping mcm
    GROUP BY mcm.month_start, mcm.month_end
  ),
  fines_calculation AS (
    SELECT 
      mwd.month_start,
      COALESCE(SUM(
        CASE 
          WHEN mcm.due_date < CURRENT_DATE 
          AND mcm.contributes_this_month
          AND mcm.daily_fine > 0
          THEN 
            -- Calculate unpaid flats for this collection
            GREATEST(0, v_flat_count - COALESCE((
              SELECT COUNT(DISTINCT ps.flat_id)
              FROM payment_submissions ps
              WHERE ps.apartment_id = p_apartment_id
              AND ps.expected_collection_id = mcm.collection_id
              AND ps.status = 'Approved'
            ), 0))
            * mcm.daily_fine
            * GREATEST(0, CURRENT_DATE - mcm.due_date)
          ELSE 0
        END
      ), 0) as expected_fines
    FROM month_wise_data mwd
    JOIN month_collection_mapping mcm ON mcm.month_start = mwd.month_start
    WHERE mcm.contributes_this_month
    GROUP BY mwd.month_start
  )
  SELECT json_build_object(
    'apartmentMode', v_apartment_mode,
    'flatCount', v_flat_count,
    'totalBuiltUpArea', v_total_built_up_area,
    'dateRange', json_build_object(
      'start', p_start_date,
      'end', p_end_date
    ),
    'monthWiseData', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'month', TO_CHAR(mwd.month_start, 'Mon YYYY'),
          'monthStart', mwd.month_start,
          'monthEnd', mwd.month_end,
          'totalExpected', ROUND(mwd.total_expected, 2),
          'totalCollected', ROUND(mwd.total_collected, 2),
          'totalOutstanding', ROUND(GREATEST(0, mwd.total_expected - mwd.total_collected), 2),
          'expectedFines', ROUND(COALESCE(fc.expected_fines, 0), 2),
          'collectionsBreakdown', COALESCE(mwd.collections_breakdown, '[]'::json)
        ) ORDER BY mwd.month_start
      ), '[]'::json)
      FROM month_wise_data mwd
      LEFT JOIN fines_calculation fc ON fc.month_start = mwd.month_start
    ),
    'summary', (
      SELECT json_build_object(
        'totalExpected', ROUND(COALESCE(SUM(total_expected), 0), 2),
        'totalCollected', ROUND(COALESCE(SUM(total_collected), 0), 2),
        'totalOutstanding', ROUND(COALESCE(SUM(GREATEST(0, total_expected - total_collected)), 0), 2),
        'overallCollectionRate', CASE 
          WHEN SUM(total_expected) > 0 
          THEN ROUND((SUM(total_collected) / SUM(total_expected) * 100)::numeric, 2)
          ELSE 0 
        END
      )
      FROM month_wise_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_month_wise_executive_summary(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION get_month_wise_executive_summary IS 
'Generates comprehensive month-wise collections view with mode-aware calculations (A/B/C), showing expected, collected, outstanding amounts, and fines per month';
