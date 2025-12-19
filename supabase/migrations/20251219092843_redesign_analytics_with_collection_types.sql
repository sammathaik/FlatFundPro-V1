/*
  # Redesigned Analytics Functions with Collection Type Support
  
  1. Overview
    - Collection types A, B, C represent different maintenance categories
    - Each flat can have multiple active collection types
    - amount_due is per-flat per collection type
    - All calculations must account for collection type breakdown
  
  2. Functions Updated
    - get_executive_summary: Add collection type breakdown
    - get_collection_performance: Enhanced with type-specific metrics
    - get_collection_efficiency: Improved with collection type analysis
  
  3. Key Calculations
    - Total Expected = SUM(amount_due × flat_count) for each collection type
    - Collection Rate = (Total Collected / Total Expected) × 100
    - Per-flat expected = SUM(all active collection types for that flat)
*/

-- =====================================================================
-- 1. Executive Summary with Collection Type Breakdown
-- =====================================================================

DROP FUNCTION IF EXISTS get_executive_summary(uuid, date, date);

CREATE OR REPLACE FUNCTION get_executive_summary(
  p_apartment_id uuid,
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '12 months')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_is_super_admin boolean;
  v_is_apartment_admin boolean;
  v_flat_count integer;
BEGIN
  -- Auth check
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

  -- Get flat count
  SELECT COUNT(*) INTO v_flat_count
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  WHERE bbp.apartment_id = p_apartment_id;

  WITH collection_breakdown AS (
    SELECT 
      ec.collection_type,
      ec.amount_due,
      v_flat_count as flat_count,
      ec.amount_due * v_flat_count as total_expected,
      COALESCE((
        SELECT SUM(ps.payment_amount)
        FROM payment_submissions ps
        WHERE ps.apartment_id = p_apartment_id
        AND ps.collection_type = ec.collection_type
        AND ps.status = 'Approved'
        AND ps.payment_date BETWEEN p_start_date AND p_end_date
      ), 0) as total_collected
    FROM expected_collections ec
    WHERE ec.apartment_id = p_apartment_id
    AND ec.is_active = true
    AND ec.due_date BETWEEN p_start_date AND p_end_date
    GROUP BY ec.collection_type, ec.amount_due
  ),
  totals AS (
    SELECT
      SUM(total_expected) as overall_expected,
      SUM(total_collected) as overall_collected
    FROM collection_breakdown
  )
  SELECT json_build_object(
    'flatCount', v_flat_count,
    'dateRange', json_build_object(
      'start', p_start_date,
      'end', p_end_date
    ),
    'totalExpected', COALESCE((SELECT overall_expected FROM totals), 0),
    'totalCollected', COALESCE((SELECT overall_collected FROM totals), 0),
    'totalOutstanding', COALESCE((SELECT overall_expected - overall_collected FROM totals), 0),
    'overallCollectionRate', (
      SELECT CASE 
        WHEN overall_expected > 0 
        THEN ROUND((overall_collected / overall_expected * 100)::numeric, 2)
        ELSE 0 
      END
      FROM totals
    ),
    'collectionTypeBreakdown', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'type', collection_type,
          'perFlatAmount', amount_due,
          'flatCount', flat_count,
          'totalExpected', total_expected,
          'totalCollected', total_collected,
          'outstanding', total_expected - total_collected,
          'collectionRate', CASE 
            WHEN total_expected > 0 
            THEN ROUND((total_collected / total_expected * 100)::numeric, 2)
            ELSE 0 
          END
        ) ORDER BY collection_type
      ), '[]'::json)
      FROM collection_breakdown
    ),
    'recentPayments', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'date', payment_date,
          'amount', payment_amount,
          'flatNumber', fn.flat_number,
          'collectionType', collection_type,
          'source', payment_source
        ) ORDER BY payment_date DESC
      ), '[]'::json)
      FROM (
        SELECT 
          ps.payment_date,
          ps.payment_amount,
          ps.flat_id,
          ps.collection_type,
          ps.payment_source
        FROM payment_submissions ps
        WHERE ps.apartment_id = p_apartment_id
        AND ps.status = 'Approved'
        AND ps.payment_date BETWEEN p_start_date AND p_end_date
        ORDER BY ps.payment_date DESC
        LIMIT 10
      ) recent
      JOIN flat_numbers fn ON recent.flat_id = fn.id
    ),
    'topDefaulters', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'flatNumber', flat_number,
          'outstandingAmount', outstanding,
          'collectionTypes', collection_types,
          'lastPaymentDate', last_payment
        )
      ), '[]'::json)
      FROM (
        WITH flat_expected AS (
          SELECT 
            fn.id as flat_id,
            fn.flat_number,
            COALESCE(SUM(ec.amount_due), 0) as expected_amount,
            array_agg(DISTINCT ec.collection_type ORDER BY ec.collection_type) as collection_types
          FROM flat_numbers fn
          JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
          LEFT JOIN expected_collections ec ON ec.apartment_id = p_apartment_id
            AND ec.is_active = true
            AND ec.due_date BETWEEN p_start_date AND p_end_date
          WHERE bbp.apartment_id = p_apartment_id
          GROUP BY fn.id, fn.flat_number
        )
        SELECT 
          fe.flat_number,
          fe.expected_amount - COALESCE(SUM(ps.payment_amount), 0) as outstanding,
          fe.collection_types,
          MAX(ps.payment_date) as last_payment
        FROM flat_expected fe
        LEFT JOIN payment_submissions ps ON ps.flat_id = fe.flat_id
          AND ps.apartment_id = p_apartment_id
          AND ps.status = 'Approved'
          AND ps.payment_date BETWEEN p_start_date AND p_end_date
        GROUP BY fe.flat_id, fe.flat_number, fe.expected_amount, fe.collection_types
        HAVING fe.expected_amount - COALESCE(SUM(ps.payment_amount), 0) > 0
        ORDER BY outstanding DESC
        LIMIT 10
      ) defaulters_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_executive_summary(uuid, date, date) TO authenticated;

-- =====================================================================
-- 2. Enhanced Collection Performance with Collection Types
-- =====================================================================

DROP FUNCTION IF EXISTS get_collection_performance(uuid, date, date);

CREATE OR REPLACE FUNCTION get_collection_performance(
  p_apartment_id uuid,
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '12 months')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_is_super_admin boolean;
  v_is_apartment_admin boolean;
  v_flat_count integer;
BEGIN
  -- Auth check
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

  -- Get flat count
  SELECT COUNT(*) INTO v_flat_count
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  WHERE bbp.apartment_id = p_apartment_id;

  SELECT json_build_object(
    'flatCount', v_flat_count,
    'totalExpected', (
      SELECT COALESCE(SUM(amount_due * v_flat_count), 0)
      FROM expected_collections
      WHERE apartment_id = p_apartment_id
      AND due_date BETWEEN p_start_date AND p_end_date
      AND is_active = true
    ),
    'totalCollected', (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM payment_submissions
      WHERE apartment_id = p_apartment_id
      AND status = 'Approved'
      AND payment_date BETWEEN p_start_date AND p_end_date
    ),
    'totalOutstanding', (
      SELECT COALESCE(SUM(amount_due * v_flat_count), 0) - COALESCE(
        (SELECT SUM(payment_amount) FROM payment_submissions 
         WHERE apartment_id = p_apartment_id 
         AND status = 'Approved'
         AND payment_date BETWEEN p_start_date AND p_end_date), 0
      )
      FROM expected_collections
      WHERE apartment_id = p_apartment_id
      AND due_date BETWEEN p_start_date AND p_end_date
      AND is_active = true
    ),
    'collectionRate', (
      WITH totals AS (
        SELECT 
          COALESCE(SUM(amount_due * v_flat_count), 0) as expected,
          COALESCE((SELECT SUM(payment_amount) FROM payment_submissions 
                    WHERE apartment_id = p_apartment_id 
                    AND status = 'Approved'
                    AND payment_date BETWEEN p_start_date AND p_end_date), 0) as collected
        FROM expected_collections
        WHERE apartment_id = p_apartment_id
        AND due_date BETWEEN p_start_date AND p_end_date
        AND is_active = true
      )
      SELECT CASE 
        WHEN expected > 0 THEN ROUND((collected / expected * 100)::numeric, 2)
        ELSE 0 
      END
      FROM totals
    ),
    'collectionTypePerformance', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'type', collection_type,
          'expected', expected,
          'collected', collected,
          'rate', rate,
          'flatCount', v_flat_count
        ) ORDER BY collection_type
      ), '[]'::json)
      FROM (
        SELECT 
          ec.collection_type,
          SUM(ec.amount_due * v_flat_count) as expected,
          COALESCE((
            SELECT SUM(ps.payment_amount)
            FROM payment_submissions ps
            WHERE ps.apartment_id = p_apartment_id
            AND ps.collection_type = ec.collection_type
            AND ps.status = 'Approved'
            AND ps.payment_date BETWEEN p_start_date AND p_end_date
          ), 0) as collected,
          CASE 
            WHEN SUM(ec.amount_due * v_flat_count) > 0
            THEN ROUND((COALESCE((
              SELECT SUM(ps.payment_amount)
              FROM payment_submissions ps
              WHERE ps.apartment_id = p_apartment_id
              AND ps.collection_type = ec.collection_type
              AND ps.status = 'Approved'
              AND ps.payment_date BETWEEN p_start_date AND p_end_date
            ), 0) / SUM(ec.amount_due * v_flat_count) * 100)::numeric, 2)
            ELSE 0
          END as rate
        FROM expected_collections ec
        WHERE ec.apartment_id = p_apartment_id
        AND ec.is_active = true
        AND ec.due_date BETWEEN p_start_date AND p_end_date
        GROUP BY ec.collection_type
      ) type_data
    ),
    'monthlyTrends', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'month', TO_CHAR(month_date, 'Mon YYYY'),
          'expected', COALESCE(expected_amt, 0),
          'collected', COALESCE(collected_amt, 0),
          'rate', CASE 
            WHEN COALESCE(expected_amt, 0) > 0 
            THEN ROUND((COALESCE(collected_amt, 0) / expected_amt * 100)::numeric, 2)
            ELSE 0 
          END
        ) ORDER BY month_date
      ), '[]'::json)
      FROM (
        SELECT 
          DATE_TRUNC('month', generate_series)::date AS month_date,
          (SELECT COALESCE(SUM(amount_due * v_flat_count), 0) 
           FROM expected_collections 
           WHERE apartment_id = p_apartment_id 
           AND is_active = true
           AND DATE_TRUNC('month', due_date) = DATE_TRUNC('month', generate_series)
          ) AS expected_amt,
          (SELECT COALESCE(SUM(payment_amount), 0)
           FROM payment_submissions 
           WHERE apartment_id = p_apartment_id 
           AND status = 'Approved'
           AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', generate_series)
          ) AS collected_amt
        FROM generate_series(p_start_date::timestamp, p_end_date::timestamp, '1 month'::interval)
      ) monthly_data
    ),
    'paymentMethodDistribution', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'method', COALESCE(payment_source, 'Not Specified'),
          'count', count,
          'amount', amount
        ) ORDER BY amount DESC
      ), '[]'::json)
      FROM (
        SELECT 
          payment_source,
          COUNT(*) as count,
          COALESCE(SUM(payment_amount), 0) as amount
        FROM payment_submissions
        WHERE apartment_id = p_apartment_id
        AND status = 'Approved'
        AND payment_date BETWEEN p_start_date AND p_end_date
        GROUP BY payment_source
      ) pm_data
    ),
    'topDefaulters', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'flatNumber', flat_number,
          'outstandingAmount', outstanding,
          'paymentsCount', payments_count,
          'lastPaymentDate', last_payment
        )
      ), '[]'::json)
      FROM (
        WITH per_flat_expected AS (
          SELECT 
            COALESCE(SUM(amount_due), 0) as expected_per_flat
          FROM expected_collections
          WHERE apartment_id = p_apartment_id
          AND is_active = true
          AND due_date BETWEEN p_start_date AND p_end_date
        )
        SELECT 
          fn.flat_number,
          pfe.expected_per_flat - COALESCE(SUM(ps.payment_amount), 0) as outstanding,
          COUNT(ps.id) as payments_count,
          MAX(ps.payment_date) as last_payment
        FROM flat_numbers fn
        JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
        CROSS JOIN per_flat_expected pfe
        LEFT JOIN payment_submissions ps ON ps.flat_id = fn.id 
          AND ps.apartment_id = p_apartment_id
          AND ps.status = 'Approved'
          AND ps.payment_date BETWEEN p_start_date AND p_end_date
        WHERE bbp.apartment_id = p_apartment_id
        GROUP BY fn.id, fn.flat_number, pfe.expected_per_flat
        HAVING pfe.expected_per_flat - COALESCE(SUM(ps.payment_amount), 0) > 0
        ORDER BY outstanding DESC
        LIMIT 10
      ) defaulters_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_collection_performance(uuid, date, date) TO authenticated;

-- =====================================================================
-- 3. Enhanced Collection Efficiency with Collection Types
-- =====================================================================

DROP FUNCTION IF EXISTS get_collection_efficiency(uuid, date, date);

CREATE OR REPLACE FUNCTION get_collection_efficiency(
  p_apartment_id uuid,
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '12 months')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_is_super_admin boolean;
  v_is_apartment_admin boolean;
  v_flat_count integer;
BEGIN
  -- Auth check
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

  -- Get flat count
  SELECT COUNT(*) INTO v_flat_count
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  WHERE bbp.apartment_id = p_apartment_id;

  WITH payment_timing AS (
    SELECT 
      ps.*,
      ec.due_date,
      ec.collection_type,
      (ps.payment_date - ec.due_date) as days_difference
    FROM payment_submissions ps
    LEFT JOIN expected_collections ec ON ec.apartment_id = ps.apartment_id
      AND ec.collection_type = ps.collection_type
      AND ec.is_active = true
    WHERE ps.apartment_id = p_apartment_id
    AND ps.status = 'Approved'
    AND ps.payment_date BETWEEN p_start_date AND p_end_date
  )
  SELECT json_build_object(
    'flatCount', v_flat_count,
    'onTimePayments', (SELECT COUNT(*) FROM payment_timing WHERE days_difference <= 0),
    'withinGracePeriod', (SELECT COUNT(*) FROM payment_timing WHERE days_difference BETWEEN 1 AND 7),
    'latePayments', (SELECT COUNT(*) FROM payment_timing WHERE days_difference BETWEEN 8 AND 30),
    'veryLatePayments', (SELECT COUNT(*) FROM payment_timing WHERE days_difference > 30),
    'averageDelay', (SELECT ROUND(AVG(GREATEST(days_difference, 0))::numeric, 1) FROM payment_timing),
    'onTimeRate', (
      SELECT CASE 
        WHEN COUNT(*) > 0 
        THEN ROUND((COUNT(*) FILTER (WHERE days_difference <= 0)::numeric / COUNT(*) * 100), 2)
        ELSE 0 
      END
      FROM payment_timing
    ),
    'collectionTypeEfficiency', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'type', collection_type,
          'totalPayments', total_payments,
          'onTimePayments', on_time,
          'onTimeRate', CASE 
            WHEN total_payments > 0 
            THEN ROUND((on_time::numeric / total_payments * 100), 2)
            ELSE 0 
          END
        ) ORDER BY collection_type
      ), '[]'::json)
      FROM (
        SELECT 
          collection_type,
          COUNT(*) as total_payments,
          COUNT(*) FILTER (WHERE days_difference <= 0) as on_time
        FROM payment_timing
        WHERE collection_type IS NOT NULL
        GROUP BY collection_type
      ) type_efficiency
    ),
    'collectionRateByQuarter', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'quarter', quarter_num,
          'year', year_num,
          'expected', expected,
          'collected', collected,
          'rate', CASE 
            WHEN expected > 0 THEN ROUND((collected / expected * 100)::numeric, 2)
            ELSE 0 
          END
        ) ORDER BY year_num, quarter_num
      ), '[]'::json)
      FROM (
        SELECT 
          EXTRACT(QUARTER FROM ec.due_date)::integer as quarter_num,
          EXTRACT(YEAR FROM ec.due_date)::integer as year_num,
          COALESCE(SUM(ec.amount_due * v_flat_count), 0) as expected,
          COALESCE((
            SELECT SUM(ps.payment_amount)
            FROM payment_submissions ps
            WHERE ps.apartment_id = p_apartment_id
            AND ps.status = 'Approved'
            AND EXTRACT(QUARTER FROM ps.payment_date) = EXTRACT(QUARTER FROM ec.due_date)
            AND EXTRACT(YEAR FROM ps.payment_date) = EXTRACT(YEAR FROM ec.due_date)
          ), 0) as collected
        FROM expected_collections ec
        WHERE ec.apartment_id = p_apartment_id
        AND ec.is_active = true
        AND ec.due_date BETWEEN p_start_date AND p_end_date
        GROUP BY EXTRACT(QUARTER FROM ec.due_date), EXTRACT(YEAR FROM ec.due_date)
      ) quarterly_data
    )
  ) INTO v_result
  FROM payment_timing
  LIMIT 1;

  -- Handle case with no payments
  IF v_result IS NULL THEN
    v_result := json_build_object(
      'flatCount', v_flat_count,
      'onTimePayments', 0,
      'withinGracePeriod', 0,
      'latePayments', 0,
      'veryLatePayments', 0,
      'averageDelay', 0,
      'onTimeRate', 0,
      'collectionTypeEfficiency', '[]'::json,
      'collectionRateByQuarter', '[]'::json
    );
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_collection_efficiency(uuid, date, date) TO authenticated;
