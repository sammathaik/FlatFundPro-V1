-- ============================================
-- QUICK CHECK: Why are payments showing as "partially paid"?
-- ============================================
-- This shows the exact calculation for each flat

SELECT 
  fn.flat_number,
  bbp.block_name,
  ec.payment_type,
  ec.quarter,
  ec.financial_year,
  -- Expected amounts
  ec.amount_due as base_amount,
  ec.daily_fine,
  ec.due_date,
  CURRENT_DATE as today,
  (CURRENT_DATE - ec.due_date)::integer as days_late,
  CASE 
    WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
    THEN (CURRENT_DATE - ec.due_date)::integer * ec.daily_fine
    ELSE 0
  END as fine_amount,
  ec.amount_due + 
  CASE 
    WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
    THEN (CURRENT_DATE - ec.due_date)::integer * ec.daily_fine
    ELSE 0
  END as total_expected,
  -- Paid amounts
  COALESCE(SUM(ps.payment_amount), 0) as total_paid,
  COUNT(ps.id) as payment_count,
  -- Comparison
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
  END as status,
  -- Show the difference
  (ec.amount_due + 
   CASE 
     WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
     THEN (CURRENT_DATE - ec.due_date)::integer * ec.daily_fine
     ELSE 0
   END) - COALESCE(SUM(ps.payment_amount), 0) as amount_difference
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
GROUP BY fn.id, fn.flat_number, bbp.block_name, ec.id, ec.payment_type, ec.quarter, 
         ec.financial_year, ec.amount_due, ec.due_date, ec.daily_fine
HAVING COALESCE(SUM(ps.payment_amount), 0) > 0  -- Only show flats with payments
ORDER BY fn.flat_number, ec.payment_type, ec.quarter;


