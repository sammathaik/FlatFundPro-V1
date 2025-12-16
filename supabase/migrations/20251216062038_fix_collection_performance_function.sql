/*
  # Fix Collection Performance Analytics Function
  
  1. Issues Fixed
    - Changed `building_id` to `apartment_id` (correct column name)
    - Changed `verification_status` to `status` (correct column name)
    - Changed `amount` to `amount_due` for expected_collections
    - Changed `amount` to `payment_amount` for payment_submissions
    - Removed references to non-existent `collection_type` field
    - Fixed join logic to match actual schema
    - Changed 'verified' to 'Approved' (correct status value)
  
  2. Calculation Logic
    - Total Expected: Sum of amount_due from expected_collections
    - Total Collected: Sum of payment_amount from payment_submissions with status = 'Approved'
    - Outstanding: Expected - Collected
    - Collection Rate: (Collected / Expected) × 100
    - Monthly trends based on payment_date and due_date
    - Payment method distribution from payment_source field
    - Top defaulters calculated per flat
*/

-- Drop and recreate the function with correct column names
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
      WHERE id = v_admin_id AND apartment_id = p_apartment_id
    ) THEN
      RAISE EXCEPTION 'Access denied to this building';
    END IF;
  END IF;

  -- Build the result JSON
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
        SELECT 
          f.flat_number,
          COALESCE(
            (SELECT SUM(amount_due) FROM expected_collections 
             WHERE apartment_id = p_apartment_id 
             AND flat_id = f.id
             AND is_active = true
             AND due_date BETWEEN p_start_date AND p_end_date), 0
          ) - COALESCE(
            (SELECT SUM(payment_amount) FROM payment_submissions 
             WHERE apartment_id = p_apartment_id 
             AND flat_id = f.id
             AND status = 'Approved'
             AND payment_date BETWEEN p_start_date AND p_end_date), 0
          ) as outstanding,
          (SELECT COUNT(*) FROM payment_submissions 
           WHERE apartment_id = p_apartment_id 
           AND flat_id = f.id
           AND status = 'Approved'
           AND payment_date BETWEEN p_start_date AND p_end_date) as payments_count,
          (SELECT MAX(payment_date) FROM payment_submissions 
           WHERE apartment_id = p_apartment_id 
           AND flat_id = f.id
           AND status = 'Approved'
           AND payment_date BETWEEN p_start_date AND p_end_date) as last_payment
        FROM flats f
        WHERE f.apartment_id = p_apartment_id
        AND f.is_active = true
        HAVING COALESCE(
          (SELECT SUM(amount_due) FROM expected_collections 
           WHERE apartment_id = p_apartment_id 
           AND flat_id = f.id
           AND is_active = true
           AND due_date BETWEEN p_start_date AND p_end_date), 0
        ) - COALESCE(
          (SELECT SUM(payment_amount) FROM payment_submissions 
           WHERE apartment_id = p_apartment_id 
           AND flat_id = f.id
           AND status = 'Approved'
           AND payment_date BETWEEN p_start_date AND p_end_date), 0
        ) > 0
        ORDER BY outstanding DESC
        LIMIT 10
      ) defaulters_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_collection_performance(uuid, date, date) TO authenticated;
