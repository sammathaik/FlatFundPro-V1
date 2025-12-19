/*
  # Fix Executive Summary - Calculate Per-Flat Expected Amounts
  
  1. Issue
    - amount_due in expected_collections is stored as per-flat amount
    - Function was treating it as total amount
    - This caused incorrect expected and outstanding calculations
  
  2. Fix
    - Multiply amount_due by number of flats for each collection
    - Calculate total expected = SUM(amount_due * flat_count) across collections
    - Calculate total outstanding = total_expected - total_approved_payments
  
  3. Changes
    - totalOutstanding: now calculates per-flat expected amounts
    - collectionRate: now uses per-flat calculations
*/

DROP FUNCTION IF EXISTS get_executive_summary(uuid);

CREATE OR REPLACE FUNCTION get_executive_summary(p_apartment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_admin_apartment_id uuid;
  v_is_super_admin boolean;
  v_flat_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM super_admins 
    WHERE user_id = auth.uid() AND status = 'active'
  ) INTO v_is_super_admin;
  
  IF NOT v_is_super_admin THEN
    SELECT apartment_id INTO v_admin_apartment_id
    FROM admins WHERE user_id = auth.uid() AND status = 'active';
    
    IF v_admin_apartment_id IS NULL THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
    
    IF v_admin_apartment_id != p_apartment_id THEN
      RAISE EXCEPTION 'Access denied to this apartment';
    END IF;
  END IF;

  -- Get flat count for this apartment
  SELECT COUNT(*) INTO v_flat_count
  FROM flat_numbers
  WHERE block_id IN (
    SELECT id FROM buildings_blocks_phases WHERE apartment_id = p_apartment_id
  );

  WITH current_month AS (
    SELECT DATE_TRUNC('month', CURRENT_DATE) as month_start
  ),
  last_month AS (
    SELECT DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') as month_start
  )
  SELECT json_build_object(
    'totalFlats', v_flat_count,
    'activeFlats', (
      SELECT COUNT(DISTINCT flat_id) FROM flat_email_mappings
      WHERE apartment_id = p_apartment_id
    ),
    'currentMonthCollection', (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM payment_submissions
      WHERE apartment_id = p_apartment_id
      AND status = 'Approved'
      AND DATE_TRUNC('month', payment_date) = (SELECT month_start FROM current_month)
    ),
    'lastMonthCollection', (
      SELECT COALESCE(SUM(payment_amount), 0)
      FROM payment_submissions
      WHERE apartment_id = p_apartment_id
      AND status = 'Approved'
      AND DATE_TRUNC('month', payment_date) = (SELECT month_start FROM last_month)
    ),
    'totalOutstanding', (
      SELECT COALESCE(SUM(amount_due * v_flat_count), 0) - COALESCE(
        (SELECT SUM(payment_amount) 
         FROM payment_submissions 
         WHERE apartment_id = p_apartment_id 
         AND status = 'Approved'), 0
      )
      FROM expected_collections
      WHERE apartment_id = p_apartment_id
      AND is_active = true
    ),
    'pendingVerifications', (
      SELECT COUNT(*) 
      FROM payment_submissions
      WHERE apartment_id = p_apartment_id
      AND status = 'Received'
    ),
    'fraudAlerts', (
      SELECT COUNT(*)
      FROM payment_submissions
      WHERE apartment_id = p_apartment_id
      AND is_fraud_flagged = true
      AND created_at > CURRENT_DATE - INTERVAL '30 days'
    ),
    'collectionRate', (
      WITH totals AS (
        SELECT 
          COALESCE(SUM(amount_due * v_flat_count), 0) as expected,
          COALESCE((SELECT SUM(payment_amount) 
                    FROM payment_submissions 
                    WHERE apartment_id = p_apartment_id 
                    AND status = 'Approved'), 0) as collected
        FROM expected_collections
        WHERE apartment_id = p_apartment_id
        AND is_active = true
      )
      SELECT CASE 
        WHEN expected > 0 THEN ROUND((collected / expected * 100)::numeric, 2)
        ELSE 0 
      END
      FROM totals
    ),
    'avgPaymentDelay', (
      SELECT ROUND(AVG((ps.payment_date - ec.due_date))::numeric, 1)
      FROM payment_submissions ps
      JOIN expected_collections ec ON ps.expected_collection_id = ec.id
      WHERE ps.apartment_id = p_apartment_id
      AND ps.status = 'Approved'
      AND ps.payment_date >= ec.due_date
      AND ps.expected_collection_id IS NOT NULL
    ),
    'digitalAdoptionRate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE payment_source IN ('mobile', 'web', 'qr_code'))::numeric / 
        NULLIF(COUNT(*), 0) * 100), 2
      )
      FROM payment_submissions
      WHERE apartment_id = p_apartment_id
      AND status = 'Approved'
      AND created_at > CURRENT_DATE - INTERVAL '90 days'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_executive_summary(uuid) TO authenticated;
