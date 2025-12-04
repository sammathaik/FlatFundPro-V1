-- ============================================
-- SIMPLE TEST: Meenakshi Apartment Matching
-- ============================================
-- Run this first to quickly identify the issue

-- Step 1: Show all payments with their details
SELECT 
  'PAYMENTS' as data_type,
  fn.flat_number,
  ps.payment_type,
  ps.payment_quarter,
  ps.payment_amount,
  ps.payment_date
FROM payment_submissions ps
JOIN apartments a ON ps.apartment_id = a.id
JOIN flat_numbers fn ON ps.flat_id = fn.id
WHERE a.apartment_name ILIKE '%meenakshi%'
ORDER BY fn.flat_number, ps.payment_quarter;

-- Step 2: Show all expected collections
SELECT 
  'EXPECTED' as data_type,
  ec.payment_type,
  ec.quarter,
  ec.financial_year,
  ec.amount_due
FROM expected_collections ec
JOIN apartments a ON ec.apartment_id = a.id
WHERE a.apartment_name ILIKE '%meenakshi%'
ORDER BY ec.financial_year, ec.quarter, ec.payment_type;

-- Step 3: Try to match them manually
-- This shows what SHOULD match
SELECT 
  'MATCH TEST' as data_type,
  fn.flat_number,
  ps.payment_type as p_type,
  ps.payment_quarter as p_quarter,
  ec.payment_type as e_type,
  ec.quarter as e_quarter,
  ec.financial_year as e_year,
  -- Manual matching logic
  CASE 
    WHEN LOWER(ps.payment_type) = LOWER(ec.payment_type) THEN '✓ TYPE OK'
    ELSE '✗ TYPE WRONG'
  END as type_check,
  CASE 
    WHEN ps.payment_quarter ILIKE '%' || ec.quarter || '%' THEN '✓ QUARTER OK'
    ELSE '✗ QUARTER WRONG'
  END as quarter_check,
  CASE 
    WHEN ec.financial_year ILIKE 'FY%' AND ps.payment_quarter ILIKE '%' || SUBSTRING(ec.financial_year FROM 3) || '%' THEN '✓ YEAR OK (FY)'
    WHEN ps.payment_quarter ILIKE '%' || ec.financial_year || '%' THEN '✓ YEAR OK'
    ELSE '✗ YEAR WRONG'
  END as year_check
FROM payment_submissions ps
JOIN apartments a ON ps.apartment_id = a.id
JOIN flat_numbers fn ON ps.flat_id = fn.id
CROSS JOIN expected_collections ec
WHERE a.apartment_name ILIKE '%meenakshi%'
  AND ec.apartment_id = a.id
ORDER BY fn.flat_number, ps.payment_quarter;


