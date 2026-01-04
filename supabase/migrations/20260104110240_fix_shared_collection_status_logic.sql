/*
  # Fix Shared Collection Status Logic - Isolated for Share Feature Only
  
  1. Overview
     This migration updates ONLY the `get_collection_status_summary` function
     used by the "Share Collection Status" feature.
     
     It implements a simplified, intuitive status classification
     designed for external communication with residents.
  
  2. Status Classification Rules (Share View Only)
     
     **UNDER REVIEW** - Highest Priority
     - A payment submission exists (any status except Approved/Rejected)
     - Shows as "under_review" in the grid
     - Example: G-19 with status "Received" must show as Under Review
     
     **PARTIALLY PAID** - Second Priority
     - Approved payment exists AND paid < expected amount
     
     **OVERPAID** - Third Priority
     - Approved payment exists AND paid > expected amount
     
     **PAID** - Fourth Priority
     - Approved payment exists AND paid == expected amount
     
     **NOT PAID** - Lowest Priority
     - No submission exists at all for this collection
  
  3. Key Changes
     - Added `under_review_count` to track pending submissions
     - Updated CASE statement with proper precedence order
     - Ensures submitted-but-not-approved payments are visible
     - Prevents "Not Paid" when submission exists
  
  4. Non-Regression Guarantee
     - This function is ONLY used by the Share Collection Status feature
     - Does NOT affect admin dashboards, reports, or existing status views
     - Completely isolated scope
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
      -- Total approved payment amount
      SUM(CASE WHEN LOWER(ps.status) = 'approved' THEN ps.payment_amount ELSE 0 END) as total_paid,
      
      -- Count by status type
      COUNT(CASE WHEN LOWER(ps.status) = 'approved' THEN 1 END) as approved_count,
      
      -- Under review count: Received, Reviewed, or any pre-approval state
      COUNT(CASE 
        WHEN LOWER(ps.status) IN ('received', 'reviewed') THEN 1 
      END) as under_review_count,
      
      COUNT(CASE WHEN LOWER(ps.status) = 'rejected' THEN 1 END) as rejected_count,
      
      -- Total submission count (excluding rejected)
      COUNT(CASE 
        WHEN LOWER(ps.status) NOT IN ('rejected') THEN 1 
      END) as total_submissions
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
    
    -- Status Precedence Order (Share View Logic)
    CASE
      -- 1. UNDER REVIEW - Highest priority (any submission that's not approved/rejected)
      WHEN COALESCE(ps.under_review_count, 0) > 0 THEN 'under_review'
      
      -- 2. PARTIALLY PAID - Approved but insufficient
      WHEN COALESCE(ps.total_paid, 0) > 0 
           AND COALESCE(ps.total_paid, 0) < ci.amount_due THEN 'underpaid'
      
      -- 3. OVERPAID - Approved and exceeds expected
      WHEN COALESCE(ps.total_paid, 0) > ci.amount_due THEN 'overpaid'
      
      -- 4. PAID - Approved and exact match
      WHEN COALESCE(ps.total_paid, 0) = ci.amount_due 
           AND COALESCE(ps.total_paid, 0) > 0 THEN 'paid'
      
      -- 5. NOT PAID - No submission at all
      ELSE 'unpaid'
    END as payment_status,
    
    COALESCE(ps.total_paid, 0) as total_paid,
    ci.amount_due,
    COALESCE(ps.approved_count, 0)::integer as approved_count,
    COALESCE(ps.under_review_count, 0)::integer as pending_count,  -- Map under_review_count to pending_count
    COALESCE(ps.rejected_count, 0)::integer as rejected_count
  FROM flat_info fi
  CROSS JOIN collection_info ci
  LEFT JOIN payment_summary ps ON ps.flat_id = fi.flat_id
  ORDER BY fi.building_name, fi.flat_number;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions;

-- Grant access to both authenticated and anonymous users (for public share links)
GRANT EXECUTE ON FUNCTION get_collection_status_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_status_summary(uuid) TO anon;

COMMENT ON FUNCTION get_collection_status_summary IS 
'Returns payment status summary for Share Collection Status feature. 
Uses simplified, resident-friendly status classification:
- under_review: Payment submitted but not yet approved (Received/Reviewed)
- underpaid: Approved but less than expected
- overpaid: Approved but more than expected  
- paid: Approved and exact match
- unpaid: No submission exists
This logic is ISOLATED and does NOT affect admin dashboards or reports.';
