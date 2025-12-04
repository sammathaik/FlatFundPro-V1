-- ============================================
-- DEBUG: Why are all payments showing as PARTIAL?
-- ============================================
-- This will show the exact calculation for each flat

WITH apartment_data AS (
  SELECT a.id as apartment_id, a.apartment_name
  FROM apartments a
  WHERE a.apartment_name ILIKE '%meenakshi%'
  LIMIT 1
),
expected_collections_data AS (
  SELECT 
    ec.id,
    ec.payment_type,
    ec.quarter,
    ec.financial_year,
    ec.amount_due,
    ec.due_date,
    ec.daily_fine,
    -- Calculate expected with fine
    ec.amount_due + 
    CASE 
      WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
      THEN (CURRENT_DATE - ec.due_date)::integer * ec.daily_fine
      ELSE 0
    END as expected_with_fine
  FROM expected_collections ec
  JOIN apartment_data ad ON ec.apartment_id = ad.apartment_id
),
flat_payments_summary AS (
  SELECT 
    ps.flat_id,
    fn.flat_number,
    bbp.block_name,
    ec.id as expected_id,
    ec.payment_type,
    ec.quarter,
    ec.financial_year,
    -- Sum matching payments
    COALESCE(SUM(ps.payment_amount), 0) as total_paid,
    COUNT(ps.id) as payment_count,
    -- Show individual payments
    STRING_AGG(ps.payment_amount::text || ' (' || ps.payment_quarter || ')', ', ') as payment_details
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  JOIN apartment_data ad ON bbp.apartment_id = ad.apartment_id
  CROSS JOIN expected_collections_data ec
  LEFT JOIN payment_submissions ps ON ps.flat_id = fn.id
    AND ps.apartment_id = ad.apartment_id
    AND LOWER(ps.payment_type) = LOWER(ec.payment_type)
    AND ps.payment_quarter ILIKE '%' || ec.quarter || '%'
    AND (
      (ec.financial_year ILIKE 'FY%' AND ps.payment_quarter ILIKE '%' || SUBSTRING(ec.financial_year FROM 3) || '%')
      OR (ps.payment_quarter ILIKE '%' || ec.financial_year || '%')
    )
  GROUP BY ps.flat_id, fn.id, fn.flat_number, bbp.block_name, ec.id, 
           ec.payment_type, ec.quarter, ec.financial_year
)
SELECT 
  'DETAILED CALCULATION' as section,
  fps.flat_number,
  fps.block_name,
  fps.payment_type,
  fps.quarter,
  fps.financial_year,
  ec.amount_due as base_expected,
  ec.due_date,
  ec.daily_fine,
  (CURRENT_DATE - ec.due_date)::integer as days_late,
  CASE 
    WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
    THEN (CURRENT_DATE - ec.due_date)::integer * ec.daily_fine
    ELSE 0
  END as fine_amount,
  ec.expected_with_fine as total_expected,
  fps.total_paid,
  fps.payment_count,
  fps.payment_details,
  -- Status calculation
  CASE 
    WHEN ec.expected_with_fine > 0 AND fps.total_paid >= ec.expected_with_fine 
    THEN 'PAID'
    WHEN fps.total_paid > 0 
    THEN 'PARTIAL'
    ELSE 'UNPAID'
  END as calculated_status,
  -- Show the comparison
  fps.total_paid::text || ' >= ' || ec.expected_with_fine::text || '? ' ||
  CASE 
    WHEN fps.total_paid >= ec.expected_with_fine THEN 'YES → PAID'
    ELSE 'NO → PARTIAL (needs ' || (ec.expected_with_fine - fps.total_paid)::text || ' more)'
  END as comparison,
  -- Debug info
  CASE 
    WHEN fps.payment_count = 0 THEN '❌ NO PAYMENTS MATCHED'
    WHEN fps.total_paid < ec.expected_with_fine THEN 
      '⚠ SHORT BY ₹' || (ec.expected_with_fine - fps.total_paid)::text
    ELSE '✓ MEETS REQUIREMENT'
  END as debug_info
FROM flat_payments_summary fps
JOIN expected_collections_data ec ON fps.expected_id = ec.id
WHERE fps.total_paid > 0  -- Only show flats with payments
ORDER BY fps.flat_number, fps.payment_type, fps.quarter;

-- ============================================
-- QUICK CHECK: Are payments being matched?
-- ============================================
SELECT 
  'MATCHING CHECK' as section,
  fn.flat_number,
  ps.payment_amount,
  ps.payment_type as payment_type,
  ps.payment_quarter,
  ec.payment_type as expected_type,
  ec.quarter as expected_quarter,
  ec.financial_year,
  ec.amount_due,
  CASE 
    WHEN LOWER(ps.payment_type) = LOWER(ec.payment_type) THEN '✓ TYPE MATCH'
    ELSE '✗ TYPE MISMATCH'
  END as type_check,
  CASE 
    WHEN ps.payment_quarter ILIKE '%' || ec.quarter || '%' THEN '✓ QUARTER MATCH'
    ELSE '✗ QUARTER MISMATCH'
  END as quarter_check,
  CASE 
    WHEN (ec.financial_year ILIKE 'FY%' AND ps.payment_quarter ILIKE '%' || SUBSTRING(ec.financial_year FROM 3) || '%')
         OR (ps.payment_quarter ILIKE '%' || ec.financial_year || '%')
    THEN '✓ YEAR MATCH'
    ELSE '✗ YEAR MISMATCH'
  END as year_check
FROM payment_submissions ps
JOIN apartments a ON ps.apartment_id = a.id
JOIN flat_numbers fn ON ps.flat_id = fn.id
CROSS JOIN expected_collections ec
WHERE a.apartment_name ILIKE '%meenakshi%'
  AND ec.apartment_id = a.id
ORDER BY fn.flat_number, ps.created_at DESC
LIMIT 20;


