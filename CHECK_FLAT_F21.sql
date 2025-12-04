-- ============================================
-- DIAGNOSTIC QUERY: Check Flat F21 Payment Status
-- ============================================
-- This query helps identify why flat F21 is showing as unpaid

-- 1. Find flat F21 and its details
SELECT 
  fn.id as flat_id,
  fn.flat_number,
  bbp.id as block_id,
  bbp.block_name,
  a.id as apartment_id,
  a.apartment_name
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
JOIN apartments a ON bbp.apartment_id = a.id
WHERE fn.flat_number ILIKE '%F21%' OR fn.flat_number = 'F21'
ORDER BY a.apartment_name, bbp.block_name, fn.flat_number;

-- 2. Check all payments for flat F21
SELECT 
  ps.id,
  ps.name as resident_name,
  ps.email,
  ps.payment_amount,
  ps.payment_date,
  ps.payment_quarter,
  ps.payment_type,
  ps.created_at,
  ps.status,
  fn.flat_number,
  bbp.block_name,
  a.apartment_name,
  ec.id as expected_collection_id,
  ec.payment_type as expected_payment_type,
  ec.quarter as expected_quarter,
  ec.financial_year as expected_financial_year,
  ec.amount_due as expected_amount,
  ec.due_date as expected_due_date
FROM payment_submissions ps
JOIN flat_numbers fn ON ps.flat_id = fn.id
JOIN buildings_blocks_phases bbp ON ps.block_id = bbp.id
JOIN apartments a ON ps.apartment_id = a.id
LEFT JOIN expected_collections ec ON ps.expected_collection_id = ec.id
WHERE fn.flat_number ILIKE '%F21%' OR fn.flat_number = 'F21'
ORDER BY ps.created_at DESC;

-- 3. Check expected collections for the apartment containing F21
SELECT 
  ec.id,
  ec.payment_type,
  ec.quarter,
  ec.financial_year,
  ec.quarter_basis,
  ec.amount_due,
  ec.due_date,
  ec.daily_fine,
  a.apartment_name,
  COUNT(DISTINCT fn.id) as total_flats,
  COUNT(DISTINCT CASE WHEN fn.flat_number ILIKE '%F21%' THEN fn.id END) as has_f21
FROM expected_collections ec
JOIN apartments a ON ec.apartment_id = a.id
LEFT JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.id
LEFT JOIN flat_numbers fn ON fn.block_id = bbp.id
WHERE EXISTS (
  SELECT 1 FROM flat_numbers fn2
  JOIN buildings_blocks_phases bbp2 ON fn2.block_id = bbp2.id
  WHERE (fn2.flat_number ILIKE '%F21%' OR fn2.flat_number = 'F21')
    AND bbp2.apartment_id = a.id
)
GROUP BY ec.id, ec.payment_type, ec.quarter, ec.financial_year, ec.quarter_basis, 
         ec.amount_due, ec.due_date, ec.daily_fine, a.apartment_name
ORDER BY ec.due_date DESC;

-- 4. Check payment matching logic for F21
-- This simulates what the frontend does to match payments to expected collections
WITH flat_f21 AS (
  SELECT fn.id as flat_id, fn.flat_number, bbp.id as block_id, bbp.block_name, a.id as apartment_id, a.apartment_name
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  JOIN apartments a ON bbp.apartment_id = a.id
  WHERE fn.flat_number ILIKE '%F21%' OR fn.flat_number = 'F21'
  LIMIT 1
),
payments_for_f21 AS (
  SELECT 
    ps.flat_id,
    ps.payment_amount,
    ps.payment_type,
    ps.payment_quarter,
    ps.payment_date,
    ps.created_at
  FROM payment_submissions ps
  JOIN flat_f21 f ON ps.flat_id = f.flat_id
),
expected_collections_for_f21 AS (
  SELECT 
    ec.id,
    ec.payment_type,
    ec.quarter,
    ec.financial_year,
    ec.amount_due,
    ec.due_date,
    ec.daily_fine,
    ec.quarter_basis
  FROM expected_collections ec
  JOIN flat_f21 f ON ec.apartment_id = f.apartment_id
)
SELECT 
  f.flat_number,
  f.block_name,
  f.apartment_name,
  ec.payment_type as expected_type,
  ec.quarter as expected_quarter,
  ec.financial_year,
  ec.amount_due as expected_amount,
  ec.due_date,
  -- Calculate late fine
  -- Note: CURRENT_DATE - ec.due_date returns integer (number of days), not an interval
  CASE 
    WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
    THEN ec.amount_due + ((CURRENT_DATE - ec.due_date)::integer * ec.daily_fine)
    ELSE ec.amount_due
  END as expected_with_fine,
  -- Check payments
  COALESCE(SUM(ps.payment_amount), 0) as total_paid,
  COUNT(ps.payment_amount) as payment_count,
  STRING_AGG(DISTINCT ps.payment_type, ', ') as payment_types_found,
  STRING_AGG(DISTINCT ps.payment_quarter, ', ') as payment_quarters_found,
  -- Match logic check
  CASE 
    WHEN ps.payment_type IS NULL THEN 'NO PAYMENTS'
    WHEN LOWER(ps.payment_type) = LOWER(ec.payment_type) THEN 'TYPE MATCHES'
    ELSE 'TYPE MISMATCH'
  END as type_match_status,
  CASE 
    WHEN ps.payment_quarter IS NULL THEN 'NO QUARTER'
    WHEN ps.payment_quarter ILIKE '%' || ec.quarter || '%' 
         AND ps.payment_quarter ILIKE '%' || ec.financial_year || '%' THEN 'QUARTER MATCHES'
    ELSE 'QUARTER MISMATCH'
  END as quarter_match_status,
  -- Status calculation
  -- Note: CURRENT_DATE - ec.due_date returns integer (number of days), not an interval
  CASE 
    WHEN COALESCE(SUM(ps.payment_amount), 0) >= 
         (ec.amount_due + CASE WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
                               THEN (CURRENT_DATE - ec.due_date)::integer * ec.daily_fine 
                               ELSE 0 END)
         AND (ec.amount_due + CASE WHEN ec.daily_fine > 0 AND ec.due_date < CURRENT_DATE 
                                   THEN (CURRENT_DATE - ec.due_date)::integer * ec.daily_fine 
                                   ELSE 0 END) > 0
    THEN 'PAID'
    WHEN COALESCE(SUM(ps.payment_amount), 0) > 0 THEN 'PARTIAL'
    ELSE 'PENDING'
  END as calculated_status
FROM flat_f21 f
CROSS JOIN expected_collections_for_f21 ec
LEFT JOIN payments_for_f21 ps ON 
  ps.flat_id = f.flat_id
  AND LOWER(ps.payment_type) = LOWER(ec.payment_type)
  AND (
    ps.payment_quarter ILIKE '%' || ec.quarter || '%'
    AND ps.payment_quarter ILIKE '%' || ec.financial_year || '%'
  )
GROUP BY f.flat_number, f.block_name, f.apartment_name, 
         ec.id, ec.payment_type, ec.quarter, ec.financial_year, 
         ec.amount_due, ec.due_date, ec.daily_fine, ec.quarter_basis,
         ps.payment_type, ps.payment_quarter
ORDER BY ec.due_date DESC;

-- 5. Check if there are any payments that should match but don't
SELECT 
  ps.id,
  ps.name,
  ps.payment_amount,
  ps.payment_type,
  ps.payment_quarter,
  ps.payment_date,
  fn.flat_number,
  ec.id as expected_collection_id,
  ec.payment_type as expected_type,
  ec.quarter as expected_quarter,
  ec.financial_year,
  CASE 
    WHEN ps.payment_type IS NULL OR ec.payment_type IS NULL THEN 'MISSING TYPE'
    WHEN LOWER(ps.payment_type) != LOWER(ec.payment_type) THEN 'TYPE MISMATCH: ' || ps.payment_type || ' vs ' || ec.payment_type
    WHEN ps.payment_quarter IS NULL THEN 'MISSING QUARTER'
    WHEN ps.payment_quarter NOT ILIKE '%' || ec.quarter || '%' THEN 'QUARTER MISMATCH: ' || ps.payment_quarter || ' vs ' || ec.quarter
    WHEN ps.payment_quarter NOT ILIKE '%' || ec.financial_year || '%' THEN 'YEAR MISMATCH: ' || ps.payment_quarter || ' vs ' || ec.financial_year
    ELSE 'SHOULD MATCH'
  END as match_issue
FROM payment_submissions ps
JOIN flat_numbers fn ON ps.flat_id = fn.id
JOIN buildings_blocks_phases bbp ON ps.block_id = bbp.id
JOIN apartments a ON ps.apartment_id = a.id
CROSS JOIN expected_collections ec
WHERE (fn.flat_number ILIKE '%F21%' OR fn.flat_number = 'F21')
  AND ec.apartment_id = a.id
  AND (
    LOWER(ps.payment_type) != LOWER(ec.payment_type)
    OR ps.payment_quarter NOT ILIKE '%' || ec.quarter || '%'
    OR ps.payment_quarter NOT ILIKE '%' || ec.financial_year || '%'
  )
ORDER BY ps.created_at DESC;

