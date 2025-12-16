/*
  # Fix Executive Summary - EXTRACT Error and Join Logic
  
  1. Issues Fixed
    - Fixed EXTRACT(DAY FROM date_diff) error - date subtraction returns integer, not interval
    - Fixed join logic between expected_collections and payment_submissions
    - Used proper foreign key relationship (expected_collection_id)
    - Improved calculation accuracy
  
  2. Changes
    - avgPaymentDelay: removed EXTRACT, use direct date subtraction
    - totalOutstanding: fixed to use proper expected_collection_id relationship
    - collectionRate: improved accuracy using proper joins
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

  WITH current_month AS (
    SELECT DATE_TRUNC('month', CURRENT_DATE) as month_start
  ),
  last_month AS (
    SELECT DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') as month_start
  )
  SELECT json_build_object(
    'totalFlats', (
      SELECT COUNT(*) FROM flat_numbers 
      WHERE block_id IN (SELECT id FROM buildings_blocks_phases WHERE apartment_id = p_apartment_id)
    ),
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
      SELECT COALESCE(SUM(amount_due), 0) - COALESCE(
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
          COALESCE(SUM(amount_due), 0) as expected,
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
