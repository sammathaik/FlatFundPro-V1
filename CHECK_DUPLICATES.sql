-- ============================================
-- CHECK FOR DUPLICATE PAYMENT SUBMISSIONS
-- ============================================
-- This query helps identify duplicate payment submissions
-- Duplicates are defined as: same block_id, flat_id, and payment_quarter

-- 1. Check for Meenakshi Residency specifically
SELECT 
  a.apartment_name,
  bbp.block_name,
  fn.flat_number,
  ps.payment_quarter,
  ps.payment_type,
  ps.name as resident_name,
  ps.email,
  ps.payment_date,
  ps.created_at,
  ps.status,
  COUNT(*) OVER (PARTITION BY ps.block_id, ps.flat_id, ps.payment_quarter) as duplicate_count
FROM payment_submissions ps
JOIN apartments a ON ps.apartment_id = a.id
JOIN buildings_blocks_phases bbp ON ps.block_id = bbp.id
JOIN flat_numbers fn ON ps.flat_id = fn.id
WHERE a.apartment_name ILIKE '%meenakshi%'
ORDER BY ps.block_id, ps.flat_id, ps.payment_quarter, ps.created_at DESC;

-- 2. Find all duplicates across all apartments
SELECT 
  a.apartment_name,
  bbp.block_name,
  fn.flat_number,
  ps.payment_quarter,
  COUNT(*) as submission_count,
  STRING_AGG(DISTINCT ps.payment_type, ', ') as payment_types,
  STRING_AGG(ps.name || ' (' || ps.email || ')', '; ') as residents,
  MIN(ps.created_at) as first_submission,
  MAX(ps.created_at) as last_submission
FROM payment_submissions ps
JOIN apartments a ON ps.apartment_id = a.id
JOIN buildings_blocks_phases bbp ON ps.block_id = bbp.id
JOIN flat_numbers fn ON ps.flat_id = fn.id
WHERE ps.payment_quarter IS NOT NULL
GROUP BY a.apartment_name, bbp.block_name, fn.flat_number, ps.payment_quarter, ps.block_id, ps.flat_id
HAVING COUNT(*) > 1
ORDER BY submission_count DESC, a.apartment_name, bbp.block_name, fn.flat_number;

-- 3. Check if payment_quarter is NULL for any records (these need to be calculated)
SELECT 
  COUNT(*) as records_without_quarter,
  a.apartment_name
FROM payment_submissions ps
JOIN apartments a ON ps.apartment_id = a.id
WHERE ps.payment_quarter IS NULL
GROUP BY a.apartment_name
ORDER BY records_without_quarter DESC;

-- 4. Update NULL payment_quarter values (run this if needed)
-- UPDATE payment_submissions
-- SET payment_quarter = calculate_payment_quarter(payment_date, created_at)
-- WHERE payment_quarter IS NULL;

-- 5. Verify the duplicate check function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'check_payment_duplicate';


