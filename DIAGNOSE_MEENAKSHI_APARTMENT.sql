-- ============================================
-- COMPREHENSIVE DIAGNOSTIC: Meenakshi Apartment Payment Status
-- ============================================
-- This query will help identify why all payments show as unpaid

-- ============================================================================
-- TEST 1: Basic Data Check - Verify Meenakshi Apartment Exists
-- ============================================================================
SELECT 
  'TEST 1: Apartment Check' as test_name,
  a.id as apartment_id,
  a.apartment_name,
  a.status,
  COUNT(DISTINCT bbp.id) as block_count,
  COUNT(DISTINCT fn.id) as flat_count
FROM apartments a
LEFT JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.id
LEFT JOIN flat_numbers fn ON fn.block_id = bbp.id
WHERE a.apartment_name ILIKE '%meenakshi%'
GROUP BY a.id, a.apartment_name, a.status;

-- ============================================================================
-- TEST 2: Check All Payments for Meenakshi Apartment
-- ============================================================================
SELECT 
  'TEST 2: All Payments' as test_name,
  ps.id,
  ps.name as resident_name,
  fn.flat_number,
  bbp.block_name,
  ps.payment_amount,
  ps.payment_type,
  ps.payment_quarter,
  ps.payment_date,
  ps.created_at,
  ps.status,
  CASE 
    WHEN ps.payment_quarter IS NULL THEN '❌ NULL QUARTER'
    WHEN ps.payment_type IS NULL THEN '❌ NULL TYPE'
    ELSE '✓ HAS DATA'
  END as data_quality
FROM payment_submissions ps
JOIN apartments a ON ps.apartment_id = a.id
JOIN flat_numbers fn ON ps.flat_id = fn.id
JOIN buildings_blocks_phases bbp ON ps.block_id = bbp.id
WHERE a.apartment_name ILIKE '%meenakshi%'
ORDER BY ps.created_at DESC;

-- ============================================================================
-- TEST 3: Check Expected Collections for Meenakshi Apartment
-- ============================================================================
SELECT 
  'TEST 3: Expected Collections' as test_name,
  ec.id,
  ec.payment_type,
  ec.quarter,
  ec.financial_year,
  ec.quarter_basis,
  ec.amount_due,
  ec.due_date,
  ec.daily_fine,
  CASE 
    WHEN ec.payment_type IS NULL THEN '❌ NULL TYPE'
    WHEN ec.quarter IS NULL THEN '❌ NULL QUARTER'
    WHEN ec.financial_year IS NULL THEN '❌ NULL YEAR'
    ELSE '✓ HAS DATA'
  END as data_quality
FROM expected_collections ec
JOIN apartments a ON ec.apartment_id = a.id
WHERE a.apartment_name ILIKE '%meenakshi%'
ORDER BY ec.due_date DESC;

-- ============================================================================
-- TEST 4: Detailed Matching Analysis - Why Payments Don't Match
-- ============================================================================
WITH meenakshi_data AS (
  SELECT a.id as apartment_id, a.apartment_name
  FROM apartments a
  WHERE a.apartment_name ILIKE '%meenakshi%'
  LIMIT 1
),
all_payments AS (
  SELECT 
    ps.id,
    ps.flat_id,
    fn.flat_number,
    bbp.block_name,
    ps.payment_amount,
    ps.payment_type,
    ps.payment_quarter,
    ps.payment_date,
    ps.created_at
  FROM payment_submissions ps
  JOIN meenakshi_data m ON ps.apartment_id = m.apartment_id
  JOIN flat_numbers fn ON ps.flat_id = fn.id
  JOIN buildings_blocks_phases bbp ON ps.block_id = bbp.id
),
all_expected AS (
  SELECT 
    ec.id as expected_id,
    ec.payment_type as expected_type,
    ec.quarter as expected_quarter,
    ec.financial_year,
    ec.amount_due,
    ec.due_date,
    ec.daily_fine
  FROM expected_collections ec
  JOIN meenakshi_data m ON ec.apartment_id = m.apartment_id
)
SELECT 
  'TEST 4: Matching Analysis' as test_name,
  ap.flat_number,
  ap.block_name,
  ap.payment_type,
  ap.payment_quarter,
  ap.payment_amount,
  ae.expected_type,
  ae.expected_quarter,
  ae.financial_year,
  ae.amount_due,
  -- Type matching
  CASE 
    WHEN ap.payment_type IS NULL THEN '❌ Payment type is NULL'
    WHEN ae.expected_type IS NULL THEN '❌ Expected type is NULL'
    WHEN LOWER(ap.payment_type) = LOWER(ae.expected_type) THEN '✓ TYPE MATCHES'
    ELSE '❌ TYPE MISMATCH: ' || ap.payment_type || ' vs ' || ae.expected_type
  END as type_match,
  -- Quarter matching
  CASE 
    WHEN ap.payment_quarter IS NULL THEN '❌ Payment quarter is NULL'
    WHEN ae.expected_quarter IS NULL THEN '❌ Expected quarter is NULL'
    WHEN ap.payment_quarter ILIKE '%' || ae.expected_quarter || '%' THEN '✓ QUARTER FOUND'
    ELSE '❌ QUARTER NOT FOUND: ' || ap.payment_quarter || ' vs ' || ae.expected_quarter
  END as quarter_match,
  -- Year matching - detailed
  CASE 
    WHEN ap.payment_quarter IS NULL THEN '❌ Payment quarter is NULL'
    WHEN ae.financial_year IS NULL THEN '❌ Financial year is NULL'
    WHEN ae.financial_year ILIKE 'FY%' THEN 
      CASE 
        WHEN ap.payment_quarter ILIKE '%' || SUBSTRING(ae.financial_year FROM 3) || '%' 
        THEN '✓ YEAR MATCH (FY format): ' || SUBSTRING(ae.financial_year FROM 3) || ' found in ' || ap.payment_quarter
        ELSE '❌ YEAR MISMATCH (FY format): Looking for ' || SUBSTRING(ae.financial_year FROM 3) || ' in ' || ap.payment_quarter
      END
    WHEN ap.payment_quarter ILIKE '%' || ae.financial_year || '%' THEN '✓ YEAR MATCH'
    ELSE '❌ YEAR MISMATCH: Looking for ' || ae.financial_year || ' in ' || ap.payment_quarter
  END as year_match,
  -- Overall match status
  CASE 
    WHEN ap.payment_type IS NULL OR ae.expected_type IS NULL THEN '❌ CANNOT MATCH - Missing type'
    WHEN ap.payment_quarter IS NULL OR ae.expected_quarter IS NULL THEN '❌ CANNOT MATCH - Missing quarter'
    WHEN LOWER(ap.payment_type) = LOWER(ae.expected_type)
         AND ap.payment_quarter ILIKE '%' || ae.expected_quarter || '%'
         AND (
           (ae.financial_year ILIKE 'FY%' AND ap.payment_quarter ILIKE '%' || SUBSTRING(ae.financial_year FROM 3) || '%')
           OR (ap.payment_quarter ILIKE '%' || ae.financial_year || '%')
         )
    THEN '✓ SHOULD MATCH'
    ELSE '❌ DOES NOT MATCH'
  END as overall_match
FROM all_payments ap
CROSS JOIN all_expected ae
ORDER BY ap.flat_number, ap.payment_quarter, ae.expected_quarter;

-- ============================================================================
-- TEST 5: Payment Status Calculation Simulation
-- ============================================================================
WITH meenakshi_data AS (
  SELECT a.id as apartment_id, a.apartment_name
  FROM apartments a
  WHERE a.apartment_name ILIKE '%meenakshi%'
  LIMIT 1
),
flat_expected AS (
  SELECT 
    fn.id as flat_id,
    fn.flat_number,
    bbp.block_name,
    ec.id as expected_id,
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
  JOIN meenakshi_data m ON ec.apartment_id = m.apartment_id
  CROSS JOIN flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  WHERE bbp.apartment_id = m.apartment_id
),
flat_payments AS (
  SELECT 
    ps.flat_id,
    ps.payment_amount,
    ps.payment_type,
    ps.payment_quarter,
    ec.id as expected_id
  FROM payment_submissions ps
  JOIN meenakshi_data m ON ps.apartment_id = m.apartment_id
  LEFT JOIN expected_collections ec ON ec.apartment_id = m.apartment_id
    AND LOWER(ps.payment_type) = LOWER(ec.payment_type)
    AND ps.payment_quarter ILIKE '%' || ec.quarter || '%'
    AND (
      (ec.financial_year ILIKE 'FY%' AND ps.payment_quarter ILIKE '%' || SUBSTRING(ec.financial_year FROM 3) || '%')
      OR (ps.payment_quarter ILIKE '%' || ec.financial_year || '%')
    )
)
SELECT 
  'TEST 5: Status Calculation' as test_name,
  fe.flat_number,
  fe.block_name,
  fe.payment_type,
  fe.quarter,
  fe.financial_year,
  fe.amount_due,
  fe.expected_with_fine,
  COALESCE(SUM(fp.payment_amount), 0) as total_paid,
  COUNT(fp.payment_amount) as payment_count,
  CASE 
    WHEN fe.expected_with_fine > 0 AND COALESCE(SUM(fp.payment_amount), 0) >= fe.expected_with_fine THEN '✓ PAID'
    WHEN COALESCE(SUM(fp.payment_amount), 0) > 0 THEN '⚠ PARTIAL'
    ELSE '❌ UNPAID'
  END as calculated_status,
  CASE 
    WHEN COUNT(fp.payment_amount) = 0 THEN '❌ NO MATCHING PAYMENTS FOUND'
    ELSE '✓ ' || COUNT(fp.payment_amount) || ' payment(s) matched'
  END as match_info
FROM flat_expected fe
LEFT JOIN flat_payments fp ON fe.flat_id = fp.flat_id AND fe.expected_id = fp.expected_id
GROUP BY fe.flat_id, fe.flat_number, fe.block_name, fe.payment_type, fe.quarter, 
         fe.financial_year, fe.amount_due, fe.expected_with_fine, fe.expected_id
ORDER BY fe.block_name, fe.flat_number, fe.payment_type, fe.quarter;

-- ============================================================================
-- TEST 6: Check for Common Data Issues
-- ============================================================================
SELECT 
  'TEST 6: Data Quality Issues' as test_name,
  'Payments with NULL payment_quarter' as issue_type,
  COUNT(*) as count
FROM payment_submissions ps
JOIN apartments a ON ps.apartment_id = a.id
WHERE a.apartment_name ILIKE '%meenakshi%'
  AND ps.payment_quarter IS NULL

UNION ALL

SELECT 
  'TEST 6: Data Quality Issues' as test_name,
  'Payments with NULL payment_type' as issue_type,
  COUNT(*) as count
FROM payment_submissions ps
JOIN apartments a ON ps.apartment_id = a.id
WHERE a.apartment_name ILIKE '%meenakshi%'
  AND ps.payment_type IS NULL

UNION ALL

SELECT 
  'TEST 6: Data Quality Issues' as test_name,
  'Expected collections with NULL quarter' as issue_type,
  COUNT(*) as count
FROM expected_collections ec
JOIN apartments a ON ec.apartment_id = a.id
WHERE a.apartment_name ILIKE '%meenakshi%'
  AND ec.quarter IS NULL

UNION ALL

SELECT 
  'TEST 6: Data Quality Issues' as test_name,
  'Expected collections with NULL financial_year' as issue_type,
  COUNT(*) as count
FROM expected_collections ec
JOIN apartments a ON ec.apartment_id = a.id
WHERE a.apartment_name ILIKE '%meenakshi%'
  AND ec.financial_year IS NULL;

-- ============================================================================
-- TEST 7: Sample Payment Quarter Formats
-- ============================================================================
SELECT 
  'TEST 7: Payment Quarter Format Analysis' as test_name,
  payment_quarter,
  COUNT(*) as count,
  STRING_AGG(DISTINCT payment_type, ', ') as payment_types,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM payment_submissions ps
JOIN apartments a ON ps.apartment_id = a.id
WHERE a.apartment_name ILIKE '%meenakshi%'
  AND payment_quarter IS NOT NULL
GROUP BY payment_quarter
ORDER BY payment_quarter;

-- ============================================================================
-- TEST 8: Sample Expected Collection Formats
-- ============================================================================
SELECT 
  'TEST 8: Expected Collection Format Analysis' as test_name,
  quarter,
  financial_year,
  payment_type,
  COUNT(*) as count,
  STRING_AGG(DISTINCT quarter_basis, ', ') as quarter_bases
FROM expected_collections ec
JOIN apartments a ON ec.apartment_id = a.id
WHERE a.apartment_name ILIKE '%meenakshi%'
GROUP BY quarter, financial_year, payment_type
ORDER BY financial_year, quarter, payment_type;


