/*
  # Fix Collection Status Summary - Remove is_primary Reference
  
  1. Problem
    - Function references non-existent column `is_primary`
    - flat_email_mappings doesn't have this column
    
  2. Changes
    - Remove is_primary filter
    - Use DISTINCT ON to get one occupant name per flat
*/

DROP FUNCTION IF EXISTS get_collection_status_summary(uuid);

CREATE OR REPLACE FUNCTION get_collection_status_summary(
  p_expected_collection_id uuid
)
RETURNS TABLE (
  building_name text,
  flat_number text,
  flat_id uuid,
  occupant_name text,
  payment_status text,
  total_paid numeric,
  amount_due numeric,
  approved_count integer,
  pending_count integer,
  rejected_count integer
) AS $$
BEGIN
  RETURN QUERY
  WITH flat_info AS (
    SELECT DISTINCT ON (fn.id)
      fn.id as flat_id,
      fn.flat_number,
      bbp.block_name as building_name,
      bbp.apartment_id,
      fem.name as occupant_name
    FROM flat_numbers fn
    JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
    LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id
    WHERE EXISTS (
      SELECT 1 FROM expected_collections ec
      WHERE ec.id = p_expected_collection_id
      AND ec.apartment_id = bbp.apartment_id
    )
    ORDER BY fn.id, fem.created_at DESC
  ),
  payment_summary AS (
    SELECT
      ps.flat_id,
      SUM(CASE WHEN ps.status = 'approved' THEN ps.payment_amount ELSE 0 END) as total_paid,
      COUNT(CASE WHEN ps.status = 'approved' THEN 1 END) as approved_count,
      COUNT(CASE WHEN ps.status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN ps.status = 'rejected' THEN 1 END) as rejected_count
    FROM payment_submissions ps
    WHERE ps.expected_collection_id = p_expected_collection_id
    GROUP BY ps.flat_id
  ),
  collection_info AS (
    SELECT
      ec.amount_due,
      ec.apartment_id,
      ec.rate_per_sqft,
      ec.flat_type_rates
    FROM expected_collections ec
    WHERE ec.id = p_expected_collection_id
  )
  SELECT
    fi.building_name,
    fi.flat_number,
    fi.flat_id,
    COALESCE(fi.occupant_name, 'Not Registered') as occupant_name,
    CASE
      WHEN COALESCE(ps.total_paid, 0) = 0 THEN 'unpaid'
      WHEN COALESCE(ps.total_paid, 0) < ci.amount_due THEN 'underpaid'
      WHEN COALESCE(ps.total_paid, 0) = ci.amount_due THEN 'paid'
      WHEN COALESCE(ps.total_paid, 0) > ci.amount_due THEN 'overpaid'
      ELSE 'unpaid'
    END as payment_status,
    COALESCE(ps.total_paid, 0) as total_paid,
    ci.amount_due,
    COALESCE(ps.approved_count, 0)::integer as approved_count,
    COALESCE(ps.pending_count, 0)::integer as pending_count,
    COALESCE(ps.rejected_count, 0)::integer as rejected_count
  FROM flat_info fi
  CROSS JOIN collection_info ci
  LEFT JOIN payment_summary ps ON ps.flat_id = fi.flat_id
  ORDER BY fi.building_name, fi.flat_number;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION get_collection_status_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_status_summary(uuid) TO anon;

COMMENT ON FUNCTION get_collection_status_summary IS 'Returns payment status summary for a specific collection, grouped by flat. Accessible to authenticated and anonymous users.';
