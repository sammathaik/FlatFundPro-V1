/*
  # Fix Collection Performance - Correct GROUP BY Clause
  
  1. Changes
    - Fixed "topDefaulters" query to include proper GROUP BY clause
    - Added fn.id to GROUP BY to avoid SQL aggregation error
    - Simplified the per-flat expected calculation
    - Improved query efficiency and correctness
  
  2. Business Logic
    - Expected collections are at apartment level
    - Divide total expected by total flats to get per-flat expected
    - Calculate outstanding = per-flat expected - actual payments by flat
*/

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
BEGIN
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

  SELECT json_build_object(
    'totalExpected', (
      SELECT COALESCE(SUM(amount_due), 0)
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
      SELECT COALESCE(SUM(amount_due), 0) - COALESCE(
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
          COALESCE(SUM(amount_due), 0) as expected,
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
          (SELECT COALESCE(SUM(amount_due), 0) 
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
        WITH apartment_totals AS (
          SELECT 
            COALESCE(SUM(amount_due), 0) as total_expected,
            (SELECT COUNT(*) FROM flat_numbers fn2 
             JOIN buildings_blocks_phases bbp2 ON fn2.block_id = bbp2.id 
             WHERE bbp2.apartment_id = p_apartment_id) as total_flats
          FROM expected_collections
          WHERE apartment_id = p_apartment_id
          AND is_active = true
          AND due_date BETWEEN p_start_date AND p_end_date
        )
        SELECT 
          fn.flat_number,
          CASE 
            WHEN apartment_totals.total_flats > 0 
            THEN (apartment_totals.total_expected / apartment_totals.total_flats) - COALESCE(SUM(ps.payment_amount), 0)
            ELSE 0
          END as outstanding,
          COUNT(ps.id) as payments_count,
          MAX(ps.payment_date) as last_payment
        FROM flat_numbers fn
        JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
        CROSS JOIN apartment_totals
        LEFT JOIN payment_submissions ps ON ps.flat_id = fn.id 
          AND ps.apartment_id = p_apartment_id
          AND ps.status = 'Approved'
          AND ps.payment_date BETWEEN p_start_date AND p_end_date
        WHERE bbp.apartment_id = p_apartment_id
        GROUP BY fn.id, fn.flat_number, apartment_totals.total_expected, apartment_totals.total_flats
        HAVING CASE 
          WHEN apartment_totals.total_flats > 0 
          THEN (apartment_totals.total_expected / apartment_totals.total_flats) - COALESCE(SUM(ps.payment_amount), 0)
          ELSE 0
        END > 0
        ORDER BY outstanding DESC
        LIMIT 10
      ) defaulters_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_collection_performance(uuid, date, date) TO authenticated;
