-- ============================================
-- CHECK: Is payment_date being used correctly?
-- ============================================

-- 1. Check if payment_date is being saved
SELECT 
  'Payment Date Usage' as check_type,
  COUNT(*) FILTER (WHERE payment_date IS NOT NULL) as has_payment_date,
  COUNT(*) FILTER (WHERE payment_date IS NULL) as missing_payment_date,
  COUNT(*) as total_payments,
  ROUND(100.0 * COUNT(*) FILTER (WHERE payment_date IS NOT NULL) / COUNT(*), 2) as percent_with_date
FROM payment_submissions;

-- 2. Check if payment_quarter matches payment_date or created_at
SELECT 
  'Quarter Calculation Check' as check_type,
  ps.id,
  ps.name,
  ps.payment_date,
  ps.created_at,
  ps.payment_quarter,
  -- Calculate what quarter should be from payment_date
  CASE 
    WHEN ps.payment_date IS NOT NULL 
    THEN calculate_payment_quarter(ps.payment_date, ps.created_at)
    ELSE calculate_payment_quarter(NULL::date, ps.created_at)
  END as calculated_from_payment_date,
  -- Calculate what quarter would be from created_at only
  calculate_payment_quarter(NULL::date, ps.created_at) as calculated_from_created_at,
  -- Check if they match
  CASE 
    WHEN ps.payment_date IS NOT NULL 
         AND ps.payment_quarter = calculate_payment_quarter(ps.payment_date, ps.created_at)
    THEN '✓ CORRECT (using payment_date)'
    WHEN ps.payment_date IS NULL 
         AND ps.payment_quarter = calculate_payment_quarter(NULL::date, ps.created_at)
    THEN '✓ CORRECT (using created_at, no payment_date)'
    WHEN ps.payment_date IS NOT NULL 
         AND ps.payment_quarter = calculate_payment_quarter(NULL::date, ps.created_at)
    THEN '❌ WRONG (has payment_date but quarter is from created_at)'
    ELSE '❌ MISMATCH'
  END as status
FROM payment_submissions ps
ORDER BY ps.created_at DESC
LIMIT 20;

-- 3. Check Meenakshi apartment specifically
SELECT 
  'Meenakshi Payment Date Check' as check_type,
  ps.id,
  fn.flat_number,
  ps.payment_date,
  ps.created_at,
  ps.payment_quarter,
  CASE 
    WHEN ps.payment_date IS NOT NULL 
    THEN calculate_payment_quarter(ps.payment_date, ps.created_at)
    ELSE calculate_payment_quarter(NULL::date, ps.created_at)
  END as should_be_quarter,
  CASE 
    WHEN ps.payment_date IS NOT NULL 
         AND ps.payment_quarter != calculate_payment_quarter(ps.payment_date, ps.created_at)
    THEN '❌ NEEDS UPDATE'
    ELSE '✓ OK'
  END as needs_update
FROM payment_submissions ps
JOIN apartments a ON ps.apartment_id = a.id
JOIN flat_numbers fn ON ps.flat_id = fn.id
WHERE a.apartment_name ILIKE '%meenakshi%'
ORDER BY ps.created_at DESC;


