/*
  # Fix All Analytics Functions - Per-Flat Expected Calculations
  
  1. Problem
    - amount_due in expected_collections is per-flat, not total
    - Functions were not multiplying by number of flats
    - This caused incorrect expected, outstanding, and rate calculations across all analytics
  
  2. Changes to get_collection_performance
    - Multiply amount_due by flat count for totalExpected
    - Fix totalOutstanding calculation
    - Fix monthlyTrends expected amounts
    - Fix topDefaulters per-flat expected calculation
  
  3. Changes to get_flat_payment_history
    - Calculate correct per-flat expected (NOT total apartment expected)
    - Each flat should see: SUM(all active collection amounts) for that flat
  
  4. Changes to get_collection_efficiency
    - Multiply amount_due by flat count in quarterly calculations
    - Fix expected collections per quarter
*/

-- =====================================================================
-- 1. Fix get_collection_performance
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

  -- Get flat count for this apartment
  SELECT COUNT(*) INTO v_flat_count
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  WHERE bbp.apartment_id = p_apartment_id;

  SELECT json_build_object(
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
          'method', COALESCE(payment_source, 'Unknown'),
          'count', count,
          'amount', amount
        )
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
        ORDER BY amount DESC
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
-- 2. Fix get_flat_payment_history
-- =====================================================================

DROP FUNCTION IF EXISTS get_flat_payment_history(uuid);

CREATE OR REPLACE FUNCTION get_flat_payment_history(p_apartment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_is_super_admin boolean;
  v_is_apartment_admin boolean;
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

  SELECT COALESCE(json_agg(
    json_build_object(
      'flatId', fn.id,
      'flatNumber', fn.flat_number,
      'ownerName', COALESCE(fem.name, fem.email, 'Not mapped'),
      'occupantType', COALESCE(fem.occupant_type, 'Unknown'),
      'totalExpected', per_flat_expected.expected,
      'totalPaid', COALESCE(paid.total, 0),
      'outstanding', per_flat_expected.expected - COALESCE(paid.total, 0),
      'paymentCount', COALESCE(paid.count, 0),
      'avgPaymentDelay', COALESCE(paid.avg_delay, 0),
      'lastPaymentDate', paid.last_payment,
      'consistencyScore', CASE 
        WHEN per_flat_expected.expected > 0 
        THEN ROUND((COALESCE(paid.total, 0) / per_flat_expected.expected * 100)::numeric, 2)
        ELSE 100 
      END,
      'preferredMethod', paid.preferred_method
    )
  ), '[]'::json) INTO v_result
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id AND fem.apartment_id = p_apartment_id
  CROSS JOIN LATERAL (
    SELECT COALESCE(SUM(amount_due), 0) as expected
    FROM expected_collections
    WHERE apartment_id = p_apartment_id
    AND is_active = true
  ) per_flat_expected
  LEFT JOIN LATERAL (
    SELECT 
      SUM(payment_amount) as total,
      COUNT(*) as count,
      ROUND(AVG(EXTRACT(DAY FROM (payment_date - 
        COALESCE((SELECT due_date FROM expected_collections ec2 
                  WHERE ec2.id = ps.expected_collection_id), payment_date)
      )))::numeric, 1) as avg_delay,
      MAX(payment_date) as last_payment,
      MODE() WITHIN GROUP (ORDER BY payment_source) as preferred_method
    FROM payment_submissions ps
    WHERE ps.flat_id = fn.id
    AND ps.apartment_id = p_apartment_id
    AND ps.status = 'Approved'
  ) paid ON true
  WHERE bbp.apartment_id = p_apartment_id
  ORDER BY fn.flat_number;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_flat_payment_history(uuid) TO authenticated;

-- =====================================================================
-- 3. Fix get_collection_efficiency
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
      (ps.payment_date - ec.due_date) as days_difference
    FROM payment_submissions ps
    JOIN expected_collections ec ON ps.expected_collection_id = ec.id
    WHERE ps.apartment_id = p_apartment_id
    AND ps.status = 'Approved'
    AND ps.payment_date BETWEEN p_start_date AND p_end_date
  )
  SELECT json_build_object(
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
      'onTimePayments', 0,
      'withinGracePeriod', 0,
      'latePayments', 0,
      'veryLatePayments', 0,
      'averageDelay', 0,
      'onTimeRate', 0,
      'collectionRateByQuarter', '[]'::json
    );
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_collection_efficiency(uuid, date, date) TO authenticated;
