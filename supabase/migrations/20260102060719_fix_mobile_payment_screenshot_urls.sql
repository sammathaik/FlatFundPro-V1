/*
  # Fix Mobile Payment Screenshot URLs

  1. Problem
    - Mobile payment submissions were storing only file paths (e.g., "flat_id_timestamp.jpeg")
    - Instead of full public URLs (e.g., "https://...supabase.co/storage/v1/object/public/payment-proofs/flat_id_timestamp.jpeg")
    - This causes "View Screenshot" links to fail with local dev server URLs

  2. Solution
    - Update all screenshot_url records that don't start with "http" 
    - Prepend the full Supabase Storage public URL
    - Only affects payment-proofs bucket uploads (mobile submissions)

  3. Impact
    - Fixes screenshot viewing for all existing mobile payment submissions
    - Future mobile submissions will store full URLs directly (already fixed in code)
*/

-- Update screenshot URLs that are just paths (don't start with http)
UPDATE payment_submissions
SET screenshot_url = 'https://rjiesmcmdfoavggkhasn.supabase.co/storage/v1/object/public/payment-proofs/' || screenshot_url
WHERE screenshot_url NOT LIKE 'http%'
  AND screenshot_url IS NOT NULL
  AND screenshot_url != '';

-- Verify the fix
DO $$ 
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM payment_submissions
  WHERE screenshot_url LIKE 'https://rjiesmcmdfoavggkhasn.supabase.co/storage/v1/object/public/payment-proofs/%';
  
  RAISE NOTICE 'Fixed % payment screenshot URLs', fixed_count;
END $$;
