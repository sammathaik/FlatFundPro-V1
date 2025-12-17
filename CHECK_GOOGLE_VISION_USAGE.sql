-- Check if Google Vision API is being used in production
-- Run this query in Supabase SQL Editor to see which OCR engine is processing payments

-- 1. Check recent payment submissions and which OCR method was used
SELECT
  id,
  name,
  validation_status,
  ocr_quality,
  ocr_confidence_score,
  ocr_attempts->0->>'method' as primary_ocr_method,
  ocr_attempts->0->>'textLength' as text_extracted_length,
  ocr_attempts->0->>'confidence' as ocr_confidence,
  extracted_amount,
  created_at
FROM payment_submissions
WHERE validation_performed_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Expected results:
-- If Google Vision is configured:
--   primary_ocr_method: "google_vision"
--   ocr_quality: "HIGH"
--   ocr_confidence_score: 85-95
--   text_extracted_length: 200-500
--
-- If Google Vision is NOT configured:
--   primary_ocr_method: "tesseract"
--   ocr_quality: "MEDIUM" or "LOW"
--   ocr_confidence_score: 30-60
--   text_extracted_length: 0-100


-- 2. Get statistics on OCR engine usage
SELECT
  ocr_attempts->0->>'method' as ocr_method,
  ocr_quality,
  COUNT(*) as count,
  ROUND(AVG(ocr_confidence_score::numeric), 2) as avg_confidence,
  ROUND(AVG((ocr_attempts->0->>'textLength')::numeric), 0) as avg_text_length,
  COUNT(CASE WHEN validation_status = 'AUTO_APPROVED' THEN 1 END) as auto_approved_count,
  COUNT(CASE WHEN validation_status = 'MANUAL_REVIEW' THEN 1 END) as manual_review_count
FROM payment_submissions
WHERE validation_performed_at > NOW() - INTERVAL '7 days'
GROUP BY ocr_attempts->0->>'method', ocr_quality
ORDER BY count DESC;

-- Expected results if Google Vision is working:
-- google_vision | HIGH   | 850 | 91.23 | 348 | 820 | 30
-- google_vision | MEDIUM | 45  | 62.15 | 124 | 20  | 25
-- tesseract     | LOW    | 95  | 38.45 | 42  | 0   | 95
-- tesseract     | FAILED | 10  | 0.00  | 0   | 0   | 10


-- 3. Check if there are any payment submissions at all
SELECT
  COUNT(*) as total_submissions,
  COUNT(CASE WHEN validation_performed_at IS NOT NULL THEN 1 END) as validated_count,
  COUNT(CASE WHEN ocr_attempts IS NOT NULL THEN 1 END) as ocr_attempted_count
FROM payment_submissions;


-- 4. Check edge function environment variables (indirect check)
-- Note: You cannot query environment variables directly from SQL
-- But you can check if the function is deployed and accessible
SELECT
  'validate-payment-proof' as function_name,
  'Check Supabase Dashboard → Settings → Edge Functions → Environment Variables' as check_location,
  'Look for: GOOGLE_VISION_API_KEY' as variable_name,
  'https://supabase.com/dashboard/project/rjiesmcmdfoavggkhasn/settings/functions' as dashboard_url;


-- 5. To manually trigger validation on existing submissions (if needed)
-- This will re-run validation with Google Vision if it's now configured
/*
UPDATE payment_submissions
SET validation_performed_at = NULL
WHERE validation_status = 'REJECTED'
  AND validation_reason LIKE '%OCR%'
  AND created_at > NOW() - INTERVAL '30 days'
LIMIT 10;

-- Then trigger the edge function manually for these submissions
*/
