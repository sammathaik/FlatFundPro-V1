-- ============================================
-- DEBUG: Payment Status Calculation
-- ============================================
-- This query shows exactly how payment status is calculated
-- Run this to see why payments show as "partially paid" instead of "paid"

WITH apartment_data AS (
  SELECT a.id as apartment_id, a.apartment_name
  FROM apartments a
  WHERE a.apartment_name ILIKE '%meenakshi%'
  LIMIT 1
),
expected_with_fine AS (
  SELECT 
    ec.id as expected_id,
    ec.payment_type,
    ec.quarter,
    ec.financial_year,
    ec.amount_due,
    ec.due_date,
    ec.daily_fine,
    -- Calculate expected amount with late fine
    ec.amount_due + 
    CASE 
      WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
      THEN (CURRENT_DATE - ec.due_date)::integer * ec.daily_fine
      ELSE 0
    END as expected_with_fine,
    -- Show fine calculation details
    CASE 
      WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
      THEN (CURRENT_DATE - ec.due_date)::integer
      ELSE 0
    END as days_late,
    CASE 
      WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
      THEN (CURRENT_DATE - ec.due_date)::integer * ec.daily_fine
      ELSE 0
    END as fine_amount
  FROM expected_collections ec
  JOIN apartment_data ad ON ec.apartment_id = ad.apartment_id
),
flat_payments AS (
  SELECT 
    ps.flat_id,
    fn.flat_number,
    bbp.block_name,
    ps.payment_amount,
    ps.payment_type,
    ps.payment_quarter,
    ec.id as expected_id,
    -- Match check
    CASE 
      WHEN LOWER(ps.payment_type) = LOWER(ec.payment_type)
           AND ps.payment_quarter ILIKE '%' || ec.quarter || '%'
           AND (
             (ec.financial_year ILIKE 'FY%' AND ps.payment_quarter ILIKE '%' || SUBSTRING(ec.financial_year FROM 3) || '%')
             OR (ps.payment_quarter ILIKE '%' || ec.financial_year || '%')
           )
      THEN true
      ELSE false
    END as matches
  FROM payment_submissions ps
  JOIN apartment_data ad ON ps.apartment_id = ad.apartment_id
  JOIN flat_numbers fn ON ps.flat_id = fn.id
  JOIN buildings_blocks_phases bbp ON ps.block_id = bbp.id
  CROSS JOIN expected_collections ec
  WHERE ec.apartment_id = ad.apartment_id
)
SELECT 
  'CALCULATION DETAILS' as section,
  fp.flat_number,
  fp.block_name,
  ewf.payment_type,
  ewf.quarter,
  ewf.financial_year,
  -- Expected amounts
  ewf.amount_due as base_amount_due,
  ewf.days_late,
  ewf.daily_fine,
  ewf.fine_amount,
  ewf.expected_with_fine as total_expected,
  -- Paid amounts
  COALESCE(SUM(CASE WHEN fp.matches THEN fp.payment_amount ELSE 0 END), 0) as total_paid,
  COUNT(CASE WHEN fp.matches THEN 1 END) as matching_payment_count,
  -- Show all payments for this flat/collection
  STRING_AGG(
    CASE WHEN fp.matches THEN 
      fp.payment_amount::text || ' (' || fp.payment_quarter || ')'
    END, 
    ', '
  ) FILTER (WHERE fp.matches) as matched_payments,
  STRING_AGG(
    CASE WHEN NOT fp.matches THEN 
      fp.payment_amount::text || ' (' || fp.payment_quarter || ' - NOT MATCHED)'
    END, 
    ', '
  ) FILTER (WHERE NOT fp.matches) as unmatched_payments,
  -- Status calculation
  CASE 
    WHEN ewf.expected_with_fine > 0 
         AND COALESCE(SUM(CASE WHEN fp.matches THEN fp.payment_amount ELSE 0 END), 0) >= ewf.expected_with_fine 
    THEN '✓ PAID'
    WHEN COALESCE(SUM(CASE WHEN fp.matches THEN fp.payment_amount ELSE 0 END), 0) > 0 
    THEN '⚠ PARTIAL'
    ELSE '❌ UNPAID'
  END as calculated_status,
  -- Show the comparison
  COALESCE(SUM(CASE WHEN fp.matches THEN fp.payment_amount ELSE 0 END), 0)::text || 
    ' >= ' || ewf.expected_with_fine::text || '? ' ||
    CASE 
      WHEN COALESCE(SUM(CASE WHEN fp.matches THEN fp.payment_amount ELSE 0 END), 0) >= ewf.expected_with_fine 
      THEN 'YES → PAID'
      ELSE 'NO → PARTIAL/UNPAID'
    END as comparison_logic
FROM expected_with_fine ewf
CROSS JOIN flat_numbers fn
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
JOIN apartment_data ad ON bbp.apartment_id = ad.apartment_id
LEFT JOIN flat_payments fp ON fp.flat_id = fn.id AND fp.expected_id = ewf.expected_id
GROUP BY fp.flat_id, fp.flat_number, fp.block_name, ewf.expected_id, ewf.payment_type, 
         ewf.quarter, ewf.financial_year, ewf.amount_due, ewf.due_date, ewf.daily_fine,
         ewf.expected_with_fine, ewf.days_late, ewf.fine_amount
ORDER BY fp.block_name, fp.flat_number, ewf.payment_type, ewf.quarter;

-- ============================================
-- QUICK CHECK: Compare Expected vs Paid
-- ============================================
SELECT 
  'QUICK SUMMARY' as section,
  fn.flat_number,
  ec.payment_type,
  ec.quarter,
  ec.financial_year,
  ec.amount_due as base_expected,
  (ec.amount_due + 
   CASE 
     WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
     THEN (CURRENT_DATE - ec.due_date)::integer * ec.daily_fine
     ELSE 0
   END) as total_expected,
  COALESCE(SUM(ps.payment_amount), 0) as total_paid,
  CASE 
    WHEN (ec.amount_due + 
          CASE 
            WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
            THEN (CURRENT_DATE - ec.due_date)::integer * ec.daily_fine
            ELSE 0
          END) > 0 
         AND COALESCE(SUM(ps.payment_amount), 0) >= 
             (ec.amount_due + 
              CASE 
                WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
                THEN (CURRENT_DATE - ec.due_date)::integer * ec.daily_fine
                ELSE 0
              END)
    THEN 'PAID'
    WHEN COALESCE(SUM(ps.payment_amount), 0) > 0 THEN 'PARTIAL'
    ELSE 'UNPAID'
  END as status
FROM expected_collections ec
JOIN apartments a ON ec.apartment_id = a.id
CROSS JOIN flat_numbers fn
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
LEFT JOIN payment_submissions ps ON ps.flat_id = fn.id
  AND ps.apartment_id = a.id
  AND LOWER(ps.payment_type) = LOWER(ec.payment_type)
  AND ps.payment_quarter ILIKE '%' || ec.quarter || '%'
  AND (
    (ec.financial_year ILIKE 'FY%' AND ps.payment_quarter ILIKE '%' || SUBSTRING(ec.financial_year FROM 3) || '%')
    OR (ps.payment_quarter ILIKE '%' || ec.financial_year || '%')
  )
WHERE a.apartment_name ILIKE '%meenakshi%'
  AND bbp.apartment_id = a.id
GROUP BY fn.id, fn.flat_number, ec.id, ec.payment_type, ec.quarter, ec.financial_year, 
         ec.amount_due, ec.due_date, ec.daily_fine
HAVING COALESCE(SUM(ps.payment_amount), 0) > 0  -- Only show flats with payments
ORDER BY fn.flat_number, ec.payment_type, ec.quarter;


