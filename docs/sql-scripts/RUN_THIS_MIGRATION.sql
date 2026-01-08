-- ============================================
-- QUICK FIX: Add quarter_basis column
-- ============================================
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- This will fix the "Could not find the 'quarter_basis' column" error

ALTER TABLE expected_collections
  ADD COLUMN IF NOT EXISTS quarter_basis text NOT NULL DEFAULT 'financial'
  CHECK (quarter_basis IN ('financial', 'yearly'));

-- Verify it worked (should return 1 row)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'expected_collections'
  AND column_name = 'quarter_basis';

-- Update existing records to have the default value (if any exist without it)
UPDATE expected_collections
SET quarter_basis = 'financial'
WHERE quarter_basis IS NULL;


