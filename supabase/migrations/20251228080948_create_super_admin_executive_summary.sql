/*
  # Super Admin Executive Summary - Platform-Wide Analytics

  1. Purpose
    - Provide comprehensive platform-wide metrics for Super Admin/Product Owner
    - Aggregate data across ALL apartments for business intelligence
    - Show growth trends, performance indicators, and system health

  2. Key Metrics
    - Total apartments, buildings, blocks, flats managed
    - Platform-wide financial performance
    - Growth indicators and trends
    - Top performing and underperforming apartments
    - Recent activity summary
    - User engagement metrics

  3. Security
    - Only accessible to Super Admins
    - Uses SECURITY DEFINER for cross-apartment access
*/

DROP FUNCTION IF EXISTS get_super_admin_executive_summary(date, date);

CREATE OR REPLACE FUNCTION get_super_admin_executive_summary(
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
BEGIN
  -- Auth check - Only super admins can access
  SELECT EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = auth.uid() AND status = 'active'
  ) INTO v_is_super_admin;

  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Access denied - Super Admin only';
  END IF;

  -- Build comprehensive executive summary
  WITH platform_stats AS (
    SELECT
      COUNT(DISTINCT a.id) as total_apartments,
      COUNT(DISTINCT bbp.id) as total_buildings_blocks,
      COUNT(DISTINCT fn.id) as total_flats,
      COUNT(DISTINCT adm.id) as total_admins,
      COUNT(DISTINCT fem.id) as total_occupants
    FROM apartments a
    LEFT JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.id
    LEFT JOIN flat_numbers fn ON fn.block_id = bbp.id
    LEFT JOIN admins adm ON adm.apartment_id = a.id AND adm.status = 'active'
    LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id
  ),
  financial_overview AS (
    SELECT
      -- Total expected across all apartments
      COALESCE(SUM(ec.amount_due * (
        SELECT COUNT(*) FROM flat_numbers fn2
        JOIN buildings_blocks_phases bbp2 ON fn2.block_id = bbp2.id
        WHERE bbp2.apartment_id = ec.apartment_id
      )), 0) as total_expected,
      -- Total collected
      COALESCE((
        SELECT SUM(payment_amount)
        FROM payment_submissions
        WHERE status = 'Approved'
        AND payment_date BETWEEN p_start_date AND p_end_date
      ), 0) as total_collected,
      -- Total payments count
      COALESCE((
        SELECT COUNT(*)
        FROM payment_submissions
        WHERE status = 'Approved'
        AND payment_date BETWEEN p_start_date AND p_end_date
      ), 0) as total_payments_count,
      -- Pending approvals
      COALESCE((
        SELECT COUNT(*)
        FROM payment_submissions
        WHERE status = 'Pending'
      ), 0) as pending_approvals
    FROM expected_collections ec
    WHERE ec.is_active = true
    AND ec.due_date BETWEEN p_start_date AND p_end_date
  ),
  growth_metrics AS (
    SELECT
      -- New apartments (last 30 days)
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_apartments_30d,
      -- New apartments (last 90 days)
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '90 days') as new_apartments_90d,
      -- Total active
      COUNT(*) FILTER (WHERE status = 'active') as active_apartments
    FROM apartments
  ),
  monthly_trends AS (
    SELECT
      DATE_TRUNC('month', payment_date)::date as month_start,
      TO_CHAR(DATE_TRUNC('month', payment_date), 'Mon YYYY') as month_label,
      COUNT(*) as payment_count,
      SUM(payment_amount) as total_amount
    FROM payment_submissions
    WHERE status = 'Approved'
    AND payment_date BETWEEN p_start_date AND p_end_date
    GROUP BY DATE_TRUNC('month', payment_date)
    ORDER BY month_start
  ),
  apartment_performance AS (
    SELECT
      a.id as apartment_id,
      a.apartment_name,
      a.city,
      a.country,
      COUNT(DISTINCT fn.id) as flat_count,
      -- Expected for this apartment
      COALESCE(SUM(DISTINCT ec.amount_due * (
        SELECT COUNT(*) FROM flat_numbers fn2
        JOIN buildings_blocks_phases bbp2 ON fn2.block_id = bbp2.id
        WHERE bbp2.apartment_id = a.id
      )), 0) as expected_amount,
      -- Collected for this apartment
      COALESCE((
        SELECT SUM(ps.payment_amount)
        FROM payment_submissions ps
        WHERE ps.apartment_id = a.id
        AND ps.status = 'Approved'
        AND ps.payment_date BETWEEN p_start_date AND p_end_date
      ), 0) as collected_amount,
      -- Payment count
      COALESCE((
        SELECT COUNT(*)
        FROM payment_submissions ps
        WHERE ps.apartment_id = a.id
        AND ps.status = 'Approved'
        AND ps.payment_date BETWEEN p_start_date AND p_end_date
      ), 0) as payment_count,
      -- Last payment date
      (
        SELECT MAX(ps.payment_date)
        FROM payment_submissions ps
        WHERE ps.apartment_id = a.id
        AND ps.status = 'Approved'
      ) as last_payment_date
    FROM apartments a
    LEFT JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.id
    LEFT JOIN flat_numbers fn ON fn.block_id = bbp.id
    LEFT JOIN expected_collections ec ON ec.apartment_id = a.id
      AND ec.is_active = true
      AND ec.due_date BETWEEN p_start_date AND p_end_date
    WHERE a.status = 'active'
    GROUP BY a.id, a.apartment_name, a.city, a.country
  ),
  top_performers AS (
    SELECT
      apartment_name,
      city,
      flat_count,
      collected_amount,
      expected_amount,
      CASE
        WHEN expected_amount > 0
        THEN ROUND((collected_amount / expected_amount * 100)::numeric, 2)
        ELSE 0
      END as collection_rate,
      payment_count
    FROM apartment_performance
    WHERE expected_amount > 0
    ORDER BY collection_rate DESC, collected_amount DESC
    LIMIT 10
  ),
  underperformers AS (
    SELECT
      apartment_name,
      city,
      flat_count,
      collected_amount,
      expected_amount,
      expected_amount - collected_amount as outstanding,
      CASE
        WHEN expected_amount > 0
        THEN ROUND((collected_amount / expected_amount * 100)::numeric, 2)
        ELSE 0
      END as collection_rate,
      last_payment_date
    FROM apartment_performance
    WHERE expected_amount > 0
    ORDER BY collection_rate ASC, outstanding DESC
    LIMIT 10
  ),
  recent_payments AS (
    SELECT
      ps.payment_date,
      ps.payment_amount,
      ps.payment_source,
      a.apartment_name,
      bbp.block_name,
      fn.flat_number,
      ec.collection_name
    FROM payment_submissions ps
    JOIN apartments a ON ps.apartment_id = a.id
    LEFT JOIN flat_numbers fn ON ps.flat_id = fn.id
    LEFT JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
    LEFT JOIN expected_collections ec ON ps.expected_collection_id = ec.id
    WHERE ps.status = 'Approved'
    AND ps.payment_date BETWEEN p_start_date AND p_end_date
    ORDER BY ps.payment_date DESC, ps.created_at DESC
    LIMIT 20
  ),
  payment_source_distribution AS (
    SELECT
      COALESCE(payment_source, 'Not Specified') as source,
      COUNT(*) as count,
      SUM(payment_amount) as total_amount
    FROM payment_submissions
    WHERE status = 'Approved'
    AND payment_date BETWEEN p_start_date AND p_end_date
    GROUP BY payment_source
    ORDER BY total_amount DESC
  ),
  fraud_detection_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE fraud_detected = true) as total_fraud_detected,
      COUNT(*) FILTER (WHERE status = 'Flagged') as flagged_payments,
      COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_payments
    FROM payment_submissions
    WHERE created_at >= p_start_date
  )
  SELECT json_build_object(
    'dateRange', json_build_object(
      'start', p_start_date,
      'end', p_end_date
    ),
    'platformStats', (
      SELECT json_build_object(
        'totalApartments', total_apartments,
        'totalBuildingsBlocks', total_buildings_blocks,
        'totalFlats', total_flats,
        'totalAdmins', total_admins,
        'totalOccupants', total_occupants
      )
      FROM platform_stats
    ),
    'financialOverview', (
      SELECT json_build_object(
        'totalExpected', ROUND(total_expected, 2),
        'totalCollected', ROUND(total_collected, 2),
        'totalOutstanding', ROUND(GREATEST(0, total_expected - total_collected), 2),
        'collectionRate', CASE
          WHEN total_expected > 0
          THEN ROUND((total_collected / total_expected * 100)::numeric, 2)
          ELSE 0
        END,
        'totalPaymentsCount', total_payments_count,
        'pendingApprovals', pending_approvals,
        'averagePaymentAmount', CASE
          WHEN total_payments_count > 0
          THEN ROUND((total_collected / total_payments_count)::numeric, 2)
          ELSE 0
        END
      )
      FROM financial_overview
    ),
    'growthMetrics', (
      SELECT json_build_object(
        'newApartments30Days', new_apartments_30d,
        'newApartments90Days', new_apartments_90d,
        'activeApartments', active_apartments
      )
      FROM growth_metrics
    ),
    'monthlyTrends', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'month', month_label,
          'monthStart', month_start,
          'paymentCount', payment_count,
          'totalAmount', ROUND(total_amount, 2)
        ) ORDER BY month_start
      ), '[]'::json)
      FROM monthly_trends
    ),
    'topPerformers', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'apartmentName', apartment_name,
          'city', city,
          'flatCount', flat_count,
          'collectedAmount', ROUND(collected_amount, 2),
          'expectedAmount', ROUND(expected_amount, 2),
          'collectionRate', collection_rate,
          'paymentCount', payment_count
        )
      ), '[]'::json)
      FROM top_performers
    ),
    'underperformers', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'apartmentName', apartment_name,
          'city', city,
          'flatCount', flat_count,
          'collectedAmount', ROUND(collected_amount, 2),
          'expectedAmount', ROUND(expected_amount, 2),
          'outstanding', ROUND(outstanding, 2),
          'collectionRate', collection_rate,
          'lastPaymentDate', last_payment_date
        )
      ), '[]'::json)
      FROM underperformers
    ),
    'recentPayments', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'paymentDate', payment_date,
          'amount', ROUND(payment_amount, 2),
          'source', payment_source,
          'apartmentName', apartment_name,
          'blockName', block_name,
          'flatNumber', flat_number,
          'collectionName', collection_name
        )
      ), '[]'::json)
      FROM recent_payments
    ),
    'paymentSourceDistribution', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'source', source,
          'count', count,
          'totalAmount', ROUND(total_amount, 2),
          'percentage', CASE
            WHEN (SELECT SUM(total_amount) FROM payment_source_distribution) > 0
            THEN ROUND((total_amount / (SELECT SUM(total_amount) FROM payment_source_distribution) * 100)::numeric, 2)
            ELSE 0
          END
        ) ORDER BY total_amount DESC
      ), '[]'::json)
      FROM payment_source_distribution
    ),
    'fraudDetectionStats', (
      SELECT json_build_object(
        'totalFraudDetected', total_fraud_detected,
        'flaggedPayments', flagged_payments,
        'rejectedPayments', rejected_payments
      )
      FROM fraud_detection_stats
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_super_admin_executive_summary(date, date) TO authenticated;

COMMENT ON FUNCTION get_super_admin_executive_summary IS
'Generates comprehensive platform-wide executive summary for Super Admin with business intelligence metrics across all apartments';