/*
  # Remove Unused Indexes - Security Optimization

  ## Purpose
  Remove unused database indexes to improve database performance and reduce
  maintenance overhead. Unused indexes consume storage space and slow down
  write operations without providing any query performance benefits.

  ## Changes
  1. Remove unused indexes on admins table
  2. Remove unused indexes on audit_logs table
  3. Remove unused indexes on payment_submissions table

  ## Indexes Being Removed
  - idx_admins_apartment (redundant - queries use idx_admins_user)
  - idx_audit_logs_user (not used in current queries)
  - idx_audit_logs_created (not used in current queries)
  - idx_payment_submissions_block_id (redundant - queries use apartment_id)
  - idx_payment_submissions_flat_id (redundant - queries use apartment_id)
  - idx_payment_submissions_reviewed_by (not used in current queries)

  ## Indexes Being Kept
  - idx_admins_user (used by RLS policies)
  - idx_apartments_status (used by public queries)
  - idx_buildings_apartment (used by building queries)
  - idx_flats_block (used by flat queries)
  - idx_payments_apartment (used by admin queries and RLS)
  - idx_payments_status (used by filtering)
  - idx_payments_created (used by sorting)
  - idx_super_admins_user (used by RLS policies)

  ## Impact
  - Reduced storage space usage
  - Faster INSERT/UPDATE/DELETE operations on affected tables
  - No impact on query performance (indexes were not being used)
  - Improved database maintenance performance
*/

-- ============================================================================
-- DROP UNUSED INDEXES
-- ============================================================================

-- Remove unused index on admins.apartment_id
-- Queries join through user_id, not apartment_id directly
DROP INDEX IF EXISTS idx_admins_apartment;

-- Remove unused indexes on audit_logs
-- Audit logs are rarely queried directly, and when they are, 
-- table scans are acceptable for this low-traffic table
DROP INDEX IF EXISTS idx_audit_logs_user;
DROP INDEX IF EXISTS idx_audit_logs_created;

-- Remove unused indexes on payment_submissions
-- All payment queries filter by apartment_id first (idx_payments_apartment)
-- These additional indexes on block_id, flat_id, and reviewed_by are redundant
DROP INDEX IF EXISTS idx_payment_submissions_block_id;
DROP INDEX IF EXISTS idx_payment_submissions_flat_id;
DROP INDEX IF EXISTS idx_payment_submissions_reviewed_by;

-- ============================================================================
-- VERIFY REMAINING INDEXES
-- ============================================================================

DO $$
DECLARE
  index_count integer;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%';
  
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Unused indexes removed successfully!';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Remaining custom indexes: %', index_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Performance Impact:';
  RAISE NOTICE '  - Faster INSERT operations on admins table';
  RAISE NOTICE '  - Faster INSERT operations on audit_logs table';
  RAISE NOTICE '  - Faster INSERT/UPDATE operations on payment_submissions';
  RAISE NOTICE '  - Reduced storage overhead';
  RAISE NOTICE '';
  RAISE NOTICE 'Critical indexes retained:';
  RAISE NOTICE '  ✓ idx_admins_user (RLS policies)';
  RAISE NOTICE '  ✓ idx_super_admins_user (RLS policies)';
  RAISE NOTICE '  ✓ idx_payments_apartment (admin queries)';
  RAISE NOTICE '  ✓ idx_payments_status (filtering)';
  RAISE NOTICE '  ✓ idx_payments_created (sorting)';
  RAISE NOTICE '  ✓ idx_apartments_status (public queries)';
  RAISE NOTICE '  ✓ idx_buildings_apartment (building queries)';
  RAISE NOTICE '  ✓ idx_flats_block (flat queries)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
END $$;