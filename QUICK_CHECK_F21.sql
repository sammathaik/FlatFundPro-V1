-- ============================================
-- QUICK CHECK: Why is Flat F21 showing as unpaid?
-- ============================================
-- Run this in Supabase SQL Editor to diagnose F21 payment status

-- Step 1: Find F21 flat details
SELECT 
  'F21 FLAT INFO' as check_type,
  fn.id as flat_id,
  fn.flat_number,
  bbp.block_name,
  a.apartment_name
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
JOIN apartments a ON bbp.apartment_id = a.id
WHERE fn.flat_number ILIKE '%F21%'
LIMIT 1;

-- Step 2: Check all payments for F21
SELECT 
  'F21 PAYMENTS' as check_type,
  ps.payment_amount,
  ps.payment_type,
  ps.payment_quarter,
  ps.payment_date,
  ps.created_at,
  ps.status
FROM payment_submissions ps
JOIN flat_numbers fn ON ps.flat_id = fn.id
WHERE fn.flat_number ILIKE '%F21%'
ORDER BY ps.created_at DESC;

-- Step 3: Check expected collections for F21's apartment
SELECT 
  'EXPECTED COLLECTIONS' as check_type,
  ec.payment_type,
  ec.quarter,
  ec.financial_year,
  ec.amount_due,
  ec.due_date,
  ec.daily_fine,
  a.apartment_name
FROM expected_collections ec
JOIN apartments a ON ec.apartment_id = a.id
WHERE a.id IN (
  SELECT DISTINCT bbp.apartment_id 
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  WHERE fn.flat_number ILIKE '%F21%'
)
ORDER BY ec.due_date DESC;

-- Step 4: Match check - see if payments match expected collections
WITH f21_data AS (
  SELECT 
    fn.id as flat_id,
    fn.flat_number,
    bbp.id as block_id,
    a.id as apartment_id,
    a.apartment_name
  FROM flat_numbers fn
  JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
  JOIN apartments a ON bbp.apartment_id = a.id
  WHERE fn.flat_number ILIKE '%F21%'
  LIMIT 1
)
SELECT 
  'MATCHING ANALYSIS' as check_type,
  ec.payment_type as expected_type,
  ec.quarter as expected_quarter,
  ec.financial_year,
  ec.amount_due,
  ps.payment_type as payment_type,
  ps.payment_quarter,
  ps.payment_amount,
  -- Match checks
  CASE WHEN LOWER(ps.payment_type) = LOWER(ec.payment_type) THEN '✓ TYPE MATCH' ELSE '✗ TYPE MISMATCH' END as type_check,
  CASE 
    WHEN ps.payment_quarter IS NULL THEN '✗ NO QUARTER'
    WHEN ps.payment_quarter ILIKE '%' || ec.quarter || '%' THEN '✓ QUARTER FOUND'
    ELSE '✗ QUARTER NOT FOUND'
  END as quarter_check,
  CASE 
    WHEN ps.payment_quarter IS NULL THEN '✗ NO QUARTER'
    WHEN ec.financial_year ILIKE 'FY%' AND ps.payment_quarter ILIKE '%' || SUBSTRING(ec.financial_year FROM 3) || '%' THEN '✓ YEAR MATCH (FY format)'
    WHEN ps.payment_quarter ILIKE '%' || ec.financial_year || '%' THEN '✓ YEAR MATCH'
    ELSE '✗ YEAR MISMATCH'
  END as year_check
FROM f21_data f
CROSS JOIN expected_collections ec
LEFT JOIN payment_submissions ps ON ps.flat_id = f.flat_id
WHERE ec.apartment_id = f.apartment_id
ORDER BY ec.due_date DESC, ps.created_at DESC;


