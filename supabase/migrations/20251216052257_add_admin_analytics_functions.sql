/*
  # Admin Analytics Functions
  
  1. Functions Created
    - `get_collection_performance(p_building_id, p_start_date, p_end_date)` - Collection rates and trends
    - `get_fraud_analytics(p_building_id, p_start_date, p_end_date)` - Fraud detection statistics
    - `get_flat_payment_history(p_building_id)` - Detailed payment history per flat
    - `get_collection_efficiency(p_building_id, p_start_date, p_end_date)` - Efficiency metrics
    - `get_time_based_analytics(p_building_id, p_start_date, p_end_date)` - Time distribution patterns
    - `get_executive_summary(p_building_id)` - High-level KPIs
    
  2. Security
    - All functions check apartment admin permissions
    - RLS policies applied through function security
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_collection_performance(uuid, date, date);
DROP FUNCTION IF EXISTS get_fraud_analytics(uuid, date, date);
DROP FUNCTION IF EXISTS get_flat_payment_history(uuid);
DROP FUNCTION IF EXISTS get_collection_efficiency(uuid, date, date);
DROP FUNCTION IF EXISTS get_time_based_analytics(uuid, date, date);
DROP FUNCTION IF EXISTS get_executive_summary(uuid);

-- 1. Collection Performance Dashboard
CREATE OR REPLACE FUNCTION get_collection_performance(
  p_building_id uuid,
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '12 months')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_admin_id uuid;
  v_user_role text;
BEGIN
  -- Get current user role and admin_id
  SELECT role, id INTO v_user_role, v_admin_id
  FROM admins
  WHERE user_id = auth.uid();
  
  -- Check permissions
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Super admin can access any building, apartment admin only their building
  IF v_user_role = 'apartment_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admins 
      WHERE id = v_admin_id AND building_id = p_building_id
    ) THEN
      RAISE EXCEPTION 'Access denied to this building';
    END IF;
  END IF;

  SELECT json_build_object(
    'totalExpected', COALESCE(SUM(ec.amount), 0),
    'totalCollected', COALESCE(SUM(ps.amount), 0),
    'totalOutstanding', COALESCE(SUM(ec.amount), 0) - COALESCE(SUM(ps.amount), 0),
    'collectionRate', 
      CASE 
        WHEN COALESCE(SUM(ec.amount), 0) > 0 
        THEN ROUND((COALESCE(SUM(ps.amount), 0) / SUM(ec.amount) * 100)::numeric, 2)
        ELSE 0 
      END,
    'monthlyTrends', (
      SELECT json_agg(
        json_build_object(
          'month', TO_CHAR(month_date, 'Mon YYYY'),
          'expected', COALESCE(expected_amt, 0),
          'collected', COALESCE(collected_amt, 0),
          'rate', COALESCE(
            CASE WHEN expected_amt > 0 
            THEN ROUND((collected_amt / expected_amt * 100)::numeric, 2)
            ELSE 0 END, 0
          )
        ) ORDER BY month_date
      )
      FROM (
        SELECT 
          DATE_TRUNC('month', generate_series) AS month_date,
          (SELECT COALESCE(SUM(amount), 0) 
           FROM expected_collections 
           WHERE building_id = p_building_id 
           AND DATE_TRUNC('month', due_date) = DATE_TRUNC('month', generate_series)
          ) AS expected_amt,
          (SELECT COALESCE(SUM(amount), 0)
           FROM payment_submissions 
           WHERE building_id = p_building_id 
           AND verification_status = 'verified'
           AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', generate_series)
          ) AS collected_amt
        FROM generate_series(p_start_date::timestamp, p_end_date::timestamp, '1 month'::interval)
      ) monthly_data
    ),
    'paymentMethodDistribution', (
      SELECT json_agg(
        json_build_object(
          'method', COALESCE(payment_source, 'Unknown'),
          'count', count,
          'amount', amount
        )
      )
      FROM (
        SELECT 
          payment_source,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as amount
        FROM payment_submissions
        WHERE building_id = p_building_id
        AND verification_status = 'verified'
        AND payment_date BETWEEN p_start_date AND p_end_date
        GROUP BY payment_source
        ORDER BY amount DESC
      ) pm_data
    ),
    'topDefaulters', (
      SELECT json_agg(
        json_build_object(
          'flatNumber', flat_number,
          'outstandingAmount', outstanding,
          'paymentsCount', payments_count,
          'lastPaymentDate', last_payment
        )
      )
      FROM (
        SELECT 
          f.flat_number,
          COALESCE(SUM(ec.amount), 0) - COALESCE(SUM(ps.amount), 0) as outstanding,
          COUNT(ps.id) as payments_count,
          MAX(ps.payment_date) as last_payment
        FROM flats f
        LEFT JOIN expected_collections ec ON f.id = ec.flat_id 
          AND ec.due_date BETWEEN p_start_date AND p_end_date
        LEFT JOIN payment_submissions ps ON f.id = ps.flat_id 
          AND ps.verification_status = 'verified'
          AND ps.payment_date BETWEEN p_start_date AND p_end_date
        WHERE f.building_id = p_building_id
        GROUP BY f.id, f.flat_number
        HAVING COALESCE(SUM(ec.amount), 0) - COALESCE(SUM(ps.amount), 0) > 0
        ORDER BY outstanding DESC
        LIMIT 10
      ) defaulters_data
    )
  ) INTO v_result
  FROM expected_collections ec
  LEFT JOIN payment_submissions ps 
    ON ec.flat_id = ps.flat_id 
    AND ec.collection_type = ps.collection_type
    AND ps.verification_status = 'verified'
    AND ps.payment_date BETWEEN p_start_date AND p_end_date
  WHERE ec.building_id = p_building_id
  AND ec.due_date BETWEEN p_start_date AND p_end_date;

  RETURN v_result;
END;
$$;

-- 2. Fraud Pattern Analysis
CREATE OR REPLACE FUNCTION get_fraud_analytics(
  p_building_id uuid,
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '6 months')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_admin_id uuid;
  v_user_role text;
BEGIN
  SELECT role, id INTO v_user_role, v_admin_id
  FROM admins WHERE user_id = auth.uid();
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  IF v_user_role = 'apartment_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admins 
      WHERE id = v_admin_id AND building_id = p_building_id
    ) THEN
      RAISE EXCEPTION 'Access denied to this building';
    END IF;
  END IF;

  SELECT json_build_object(
    'totalSubmissions', COUNT(*),
    'flaggedCount', COUNT(*) FILTER (WHERE fraud_detection_status IN ('flagged', 'high_risk')),
    'verifiedCount', COUNT(*) FILTER (WHERE verification_status = 'verified'),
    'rejectedCount', COUNT(*) FILTER (WHERE verification_status = 'rejected'),
    'fraudRate', ROUND(
      (COUNT(*) FILTER (WHERE fraud_detection_status IN ('flagged', 'high_risk'))::numeric / 
       NULLIF(COUNT(*), 0) * 100), 2
    ),
    'fraudByType', (
      SELECT json_agg(
        json_build_object(
          'type', fraud_type,
          'count', count
        )
      )
      FROM (
        SELECT 
          CASE 
            WHEN fraud_detection_status = 'flagged' THEN 'Flagged'
            WHEN fraud_detection_status = 'high_risk' THEN 'High Risk'
            WHEN fraud_detection_status = 'clear' THEN 'Clear'
            ELSE 'Unknown'
          END as fraud_type,
          COUNT(*) as count
        FROM payment_submissions
        WHERE building_id = p_building_id
        AND payment_date BETWEEN p_start_date AND p_end_date
        GROUP BY fraud_detection_status
      ) fraud_types
    ),
    'monthlyTrend', (
      SELECT json_agg(
        json_build_object(
          'month', TO_CHAR(month, 'Mon YYYY'),
          'total', total,
          'flagged', flagged,
          'rate', CASE WHEN total > 0 THEN ROUND((flagged::numeric / total * 100), 2) ELSE 0 END
        ) ORDER BY month
      )
      FROM (
        SELECT 
          DATE_TRUNC('month', payment_date) as month,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE fraud_detection_status IN ('flagged', 'high_risk')) as flagged
        FROM payment_submissions
        WHERE building_id = p_building_id
        AND payment_date BETWEEN p_start_date AND p_end_date
        GROUP BY DATE_TRUNC('month', payment_date)
      ) monthly
    ),
    'recentIncidents', (
      SELECT json_agg(
        json_build_object(
          'id', ps.id,
          'flatNumber', f.flat_number,
          'amount', ps.amount,
          'date', ps.payment_date,
          'status', ps.fraud_detection_status,
          'reason', ps.fraud_detection_reason
        )
      )
      FROM (
        SELECT * FROM payment_submissions
        WHERE building_id = p_building_id
        AND fraud_detection_status IN ('flagged', 'high_risk')
        AND payment_date BETWEEN p_start_date AND p_end_date
        ORDER BY created_at DESC
        LIMIT 10
      ) ps
      JOIN flats f ON ps.flat_id = f.id
    )
  ) INTO v_result
  FROM payment_submissions
  WHERE building_id = p_building_id
  AND payment_date BETWEEN p_start_date AND p_end_date;

  RETURN v_result;
END;
$$;

-- 3. Flat-wise Payment History
CREATE OR REPLACE FUNCTION get_flat_payment_history(p_building_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_admin_id uuid;
  v_user_role text;
BEGIN
  SELECT role, id INTO v_user_role, v_admin_id
  FROM admins WHERE user_id = auth.uid();
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  IF v_user_role = 'apartment_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admins 
      WHERE id = v_admin_id AND building_id = p_building_id
    ) THEN
      RAISE EXCEPTION 'Access denied to this building';
    END IF;
  END IF;

  SELECT json_agg(
    json_build_object(
      'flatId', f.id,
      'flatNumber', f.flat_number,
      'ownerName', f.owner_name,
      'occupantType', f.occupant_type,
      'totalExpected', COALESCE(expected.total, 0),
      'totalPaid', COALESCE(paid.total, 0),
      'outstanding', COALESCE(expected.total, 0) - COALESCE(paid.total, 0),
      'paymentCount', COALESCE(paid.count, 0),
      'avgPaymentDelay', COALESCE(paid.avg_delay, 0),
      'lastPaymentDate', paid.last_payment,
      'consistencyScore', CASE 
        WHEN COALESCE(expected.total, 0) > 0 
        THEN ROUND((COALESCE(paid.total, 0) / expected.total * 100)::numeric, 2)
        ELSE 100 
      END,
      'preferredMethod', paid.preferred_method
    )
  ) INTO v_result
  FROM flats f
  LEFT JOIN (
    SELECT 
      flat_id,
      SUM(amount) as total
    FROM expected_collections
    WHERE building_id = p_building_id
    GROUP BY flat_id
  ) expected ON f.id = expected.flat_id
  LEFT JOIN (
    SELECT 
      flat_id,
      SUM(amount) as total,
      COUNT(*) as count,
      MAX(payment_date) as last_payment,
      ROUND(AVG(EXTRACT(DAY FROM (payment_date - created_at)))::numeric, 1) as avg_delay,
      MODE() WITHIN GROUP (ORDER BY payment_source) as preferred_method
    FROM payment_submissions
    WHERE building_id = p_building_id
    AND verification_status = 'verified'
    GROUP BY flat_id
  ) paid ON f.id = paid.flat_id
  WHERE f.building_id = p_building_id
  ORDER BY f.flat_number;

  RETURN v_result;
END;
$$;

-- 4. Collection Efficiency Metrics
CREATE OR REPLACE FUNCTION get_collection_efficiency(
  p_building_id uuid,
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '12 months')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_admin_id uuid;
  v_user_role text;
BEGIN
  SELECT role, id INTO v_user_role, v_admin_id
  FROM admins WHERE user_id = auth.uid();
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  IF v_user_role = 'apartment_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admins 
      WHERE id = v_admin_id AND building_id = p_building_id
    ) THEN
      RAISE EXCEPTION 'Access denied to this building';
    END IF;
  END IF;

  WITH payment_timing AS (
    SELECT 
      ps.*,
      ec.due_date,
      (ps.payment_date - ec.due_date) as days_difference
    FROM payment_submissions ps
    JOIN expected_collections ec ON ps.flat_id = ec.flat_id 
      AND ps.collection_type = ec.collection_type
    WHERE ps.building_id = p_building_id
    AND ps.verification_status = 'verified'
    AND ps.payment_date BETWEEN p_start_date AND p_end_date
  )
  SELECT json_build_object(
    'onTimePayments', COUNT(*) FILTER (WHERE days_difference = 0),
    'withinGracePeriod', COUNT(*) FILTER (WHERE days_difference BETWEEN 1 AND 7),
    'latePayments', COUNT(*) FILTER (WHERE days_difference BETWEEN 8 AND 30),
    'veryLatePayments', COUNT(*) FILTER (WHERE days_difference > 30),
    'averageDelay', ROUND(AVG(GREATEST(days_difference, 0))::numeric, 1),
    'onTimeRate', ROUND(
      (COUNT(*) FILTER (WHERE days_difference = 0)::numeric / NULLIF(COUNT(*), 0) * 100), 2
    ),
    'collectionRateByQuarter', (
      SELECT json_agg(
        json_build_object(
          'quarter', quarter,
          'year', year,
          'expected', expected,
          'collected', collected,
          'rate', CASE WHEN expected > 0 THEN ROUND((collected / expected * 100)::numeric, 2) ELSE 0 END
        ) ORDER BY year, quarter
      )
      FROM (
        SELECT 
          EXTRACT(QUARTER FROM ec.due_date)::int as quarter,
          EXTRACT(YEAR FROM ec.due_date)::int as year,
          COALESCE(SUM(ec.amount), 0) as expected,
          COALESCE(SUM(ps.amount), 0) as collected
        FROM expected_collections ec
        LEFT JOIN payment_submissions ps ON ec.flat_id = ps.flat_id 
          AND ec.collection_type = ps.collection_type
          AND ps.verification_status = 'verified'
        WHERE ec.building_id = p_building_id
        AND ec.due_date BETWEEN p_start_date AND p_end_date
        GROUP BY EXTRACT(QUARTER FROM ec.due_date), EXTRACT(YEAR FROM ec.due_date)
      ) quarterly
    )
  ) INTO v_result
  FROM payment_timing;

  RETURN v_result;
END;
$$;

-- 5. Time-based Analytics
CREATE OR REPLACE FUNCTION get_time_based_analytics(
  p_building_id uuid,
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '12 months')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_admin_id uuid;
  v_user_role text;
BEGIN
  SELECT role, id INTO v_user_role, v_admin_id
  FROM admins WHERE user_id = auth.uid();
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  IF v_user_role = 'apartment_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admins 
      WHERE id = v_admin_id AND building_id = p_building_id
    ) THEN
      RAISE EXCEPTION 'Access denied to this building';
    END IF;
  END IF;

  SELECT json_build_object(
    'paymentsByDayOfWeek', (
      SELECT json_agg(
        json_build_object(
          'day', day_name,
          'count', count,
          'amount', amount
        )
      )
      FROM (
        SELECT 
          TO_CHAR(payment_date, 'Day') as day_name,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as amount
        FROM payment_submissions
        WHERE building_id = p_building_id
        AND verification_status = 'verified'
        AND payment_date BETWEEN p_start_date AND p_end_date
        GROUP BY TO_CHAR(payment_date, 'Day'), EXTRACT(DOW FROM payment_date)
        ORDER BY EXTRACT(DOW FROM payment_date)
      ) dow
    ),
    'paymentsByHourOfDay', (
      SELECT json_agg(
        json_build_object(
          'hour', hour,
          'count', count
        ) ORDER BY hour
      )
      FROM (
        SELECT 
          EXTRACT(HOUR FROM created_at)::int as hour,
          COUNT(*) as count
        FROM payment_submissions
        WHERE building_id = p_building_id
        AND payment_date BETWEEN p_start_date AND p_end_date
        GROUP BY EXTRACT(HOUR FROM created_at)
      ) hod
    ),
    'bestCollectionMonth', (
      SELECT json_build_object(
        'month', TO_CHAR(payment_date, 'Mon YYYY'),
        'amount', total_amount
      )
      FROM (
        SELECT 
          DATE_TRUNC('month', payment_date) as payment_date,
          SUM(amount) as total_amount
        FROM payment_submissions
        WHERE building_id = p_building_id
        AND verification_status = 'verified'
        AND payment_date BETWEEN p_start_date AND p_end_date
        GROUP BY DATE_TRUNC('month', payment_date)
        ORDER BY total_amount DESC
        LIMIT 1
      ) best_month
    ),
    'worstCollectionMonth', (
      SELECT json_build_object(
        'month', TO_CHAR(payment_date, 'Mon YYYY'),
        'amount', total_amount
      )
      FROM (
        SELECT 
          DATE_TRUNC('month', payment_date) as payment_date,
          SUM(amount) as total_amount
        FROM payment_submissions
        WHERE building_id = p_building_id
        AND verification_status = 'verified'
        AND payment_date BETWEEN p_start_date AND p_end_date
        GROUP BY DATE_TRUNC('month', payment_date)
        ORDER BY total_amount ASC
        LIMIT 1
      ) worst_month
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 6. Executive Summary
CREATE OR REPLACE FUNCTION get_executive_summary(p_building_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_admin_id uuid;
  v_user_role text;
BEGIN
  SELECT role, id INTO v_user_role, v_admin_id
  FROM admins WHERE user_id = auth.uid();
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  IF v_user_role = 'apartment_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admins 
      WHERE id = v_admin_id AND building_id = p_building_id
    ) THEN
      RAISE EXCEPTION 'Access denied to this building';
    END IF;
  END IF;

  WITH current_month AS (
    SELECT DATE_TRUNC('month', CURRENT_DATE) as month_start
  ),
  last_month AS (
    SELECT DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') as month_start
  )
  SELECT json_build_object(
    'totalFlats', (SELECT COUNT(*) FROM flats WHERE building_id = p_building_id),
    'activeFlats', (SELECT COUNT(*) FROM flats WHERE building_id = p_building_id AND is_active = true),
    'currentMonthCollection', (
      SELECT COALESCE(SUM(amount), 0)
      FROM payment_submissions
      WHERE building_id = p_building_id
      AND verification_status = 'verified'
      AND DATE_TRUNC('month', payment_date) = (SELECT month_start FROM current_month)
    ),
    'lastMonthCollection', (
      SELECT COALESCE(SUM(amount), 0)
      FROM payment_submissions
      WHERE building_id = p_building_id
      AND verification_status = 'verified'
      AND DATE_TRUNC('month', payment_date) = (SELECT month_start FROM last_month)
    ),
    'totalOutstanding', (
      SELECT COALESCE(SUM(ec.amount), 0) - COALESCE(SUM(ps.amount), 0)
      FROM expected_collections ec
      LEFT JOIN payment_submissions ps ON ec.flat_id = ps.flat_id 
        AND ec.collection_type = ps.collection_type
        AND ps.verification_status = 'verified'
      WHERE ec.building_id = p_building_id
    ),
    'pendingVerifications', (
      SELECT COUNT(*) 
      FROM payment_submissions
      WHERE building_id = p_building_id
      AND verification_status = 'pending'
    ),
    'fraudAlerts', (
      SELECT COUNT(*)
      FROM payment_submissions
      WHERE building_id = p_building_id
      AND fraud_detection_status IN ('flagged', 'high_risk')
      AND created_at > CURRENT_DATE - INTERVAL '30 days'
    ),
    'collectionRate', (
      SELECT CASE 
        WHEN COALESCE(SUM(ec.amount), 0) > 0 
        THEN ROUND((COALESCE(SUM(ps.amount), 0) / SUM(ec.amount) * 100)::numeric, 2)
        ELSE 0 
      END
      FROM expected_collections ec
      LEFT JOIN payment_submissions ps ON ec.flat_id = ps.flat_id 
        AND ec.collection_type = ps.collection_type
        AND ps.verification_status = 'verified'
      WHERE ec.building_id = p_building_id
    ),
    'avgPaymentDelay', (
      SELECT ROUND(AVG(EXTRACT(DAY FROM (ps.payment_date - ec.due_date)))::numeric, 1)
      FROM payment_submissions ps
      JOIN expected_collections ec ON ps.flat_id = ec.flat_id 
        AND ps.collection_type = ec.collection_type
      WHERE ps.building_id = p_building_id
      AND ps.verification_status = 'verified'
      AND ps.payment_date >= ec.due_date
    ),
    'digitalAdoptionRate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE payment_source IN ('mobile', 'web', 'qr_code'))::numeric / 
         NULLIF(COUNT(*), 0) * 100), 2
      )
      FROM payment_submissions
      WHERE building_id = p_building_id
      AND verification_status = 'verified'
      AND created_at > CURRENT_DATE - INTERVAL '90 days'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_collection_performance(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fraud_analytics(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_flat_payment_history(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_efficiency(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_time_based_analytics(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_executive_summary(uuid) TO authenticated;
