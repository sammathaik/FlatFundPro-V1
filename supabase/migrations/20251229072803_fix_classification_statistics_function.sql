/*
  # Fix Classification Statistics Function
  
  1. Problem
    - The get_classification_statistics() function has broken SQL
    - Error: column "count" does not exist in jsonb_object_agg()
    - GROUP BY confidence_level causes multiple rows instead of single aggregate
    - This prevents the AI Classification analytics page from loading
  
  2. Solution
    - Rewrite function to properly aggregate all statistics in one query
    - Use subqueries for each aggregation type
    - Return single jsonb object with all statistics
  
  3. Impact
    - AI Classification analytics page will now load correctly
    - Statistics will display for all 2 existing classifications
    - Proper breakdown by confidence level and document type
*/

-- Drop and recreate the function with correct SQL
CREATE OR REPLACE FUNCTION get_classification_statistics(p_apartment_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Build comprehensive statistics object
  SELECT jsonb_build_object(
    'total_classifications', (
      SELECT COUNT(*)
      FROM payment_document_classifications pdc
      JOIN payment_submissions ps ON pdc.payment_submission_id = ps.id
      WHERE p_apartment_id IS NULL OR ps.apartment_id = p_apartment_id
    ),
    'by_confidence', (
      SELECT COALESCE(jsonb_object_agg(confidence_level, count), '{}'::jsonb)
      FROM (
        SELECT confidence_level, COUNT(*) as count
        FROM payment_document_classifications pdc
        JOIN payment_submissions ps ON pdc.payment_submission_id = ps.id
        WHERE p_apartment_id IS NULL OR ps.apartment_id = p_apartment_id
        GROUP BY confidence_level
      ) conf
    ),
    'by_document_type', (
      SELECT COALESCE(jsonb_object_agg(document_type, count), '{}'::jsonb)
      FROM (
        SELECT document_type, COUNT(*) as count
        FROM payment_document_classifications pdc
        JOIN payment_submissions ps ON pdc.payment_submission_id = ps.id
        WHERE p_apartment_id IS NULL OR ps.apartment_id = p_apartment_id
        GROUP BY document_type
        ORDER BY count DESC
      ) dt
    ),
    'total_cost_usd', (
      SELECT COALESCE(SUM(ai_cost_cents), 0) / 100.0
      FROM payment_document_classifications pdc
      JOIN payment_submissions ps ON pdc.payment_submission_id = ps.id
      WHERE p_apartment_id IS NULL OR ps.apartment_id = p_apartment_id
    ),
    'avg_processing_time_ms', (
      SELECT COALESCE(ROUND(AVG(ai_processing_time_ms)), 0)
      FROM payment_document_classifications pdc
      JOIN payment_submissions ps ON pdc.payment_submission_id = ps.id
      WHERE p_apartment_id IS NULL OR ps.apartment_id = p_apartment_id
    ),
    'last_30_days_count', (
      SELECT COUNT(*)
      FROM payment_document_classifications pdc
      JOIN payment_submissions ps ON pdc.payment_submission_id = ps.id
      WHERE (p_apartment_id IS NULL OR ps.apartment_id = p_apartment_id)
      AND pdc.classified_at >= NOW() - INTERVAL '30 days'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_classification_statistics IS 
  'Returns aggregated statistics for document classifications, optionally filtered by apartment_id. Returns a single jsonb object with all metrics.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_classification_statistics TO authenticated;
