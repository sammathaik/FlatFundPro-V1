/*
  # Remove Flat-Level Collection Mode Selection

  1. Changes
    - Remove `maintenance_collection_mode` column from flat_numbers table
    - Flats will inherit apartment's `default_collection_mode` via join
    - Mode-specific fields (built_up_area, flat_type) remain for data storage
    - No flat-level policy deviation allowed

  2. Rationale
    - Enforce apartment-level policy strictly
    - Simplify flat management interface
    - Ensure policy compliance at database level
    - Reduce configuration complexity

  3. Important Notes
    - Flats automatically use apartment's default_collection_mode
    - Mode-specific fields visible based on apartment policy
    - No individual flat mode override possible
*/

-- Step 1: Drop the maintenance_collection_mode column from flat_numbers
ALTER TABLE flat_numbers 
DROP COLUMN IF EXISTS maintenance_collection_mode;

-- Step 2: Drop related check constraints that reference the dropped column
ALTER TABLE flat_numbers 
DROP CONSTRAINT IF EXISTS flat_mode_b_requires_area;

ALTER TABLE flat_numbers 
DROP CONSTRAINT IF EXISTS flat_mode_c_requires_type;

-- Step 3: Drop the index on maintenance_collection_mode
DROP INDEX IF EXISTS idx_flat_numbers_maintenance_mode;

-- Step 4: Add comments for clarity
COMMENT ON COLUMN flat_numbers.built_up_area IS 'Built-up area in square feet. Required when apartment uses Mode B (Area-Based) collection';
COMMENT ON COLUMN flat_numbers.flat_type IS 'Flat category (1BHK, 2BHK, 3BHK, etc.). Required when apartment uses Mode C (Type-Based) collection';

-- Step 5: Create a helper view for flats with their apartment's collection mode
CREATE OR REPLACE VIEW flat_numbers_with_mode AS
SELECT 
  fn.*,
  bbp.apartment_id,
  bbp.block_name,
  a.apartment_name,
  a.default_collection_mode as collection_mode
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
JOIN apartments a ON a.id = bbp.apartment_id;

-- Step 6: Grant access to the view
GRANT SELECT ON flat_numbers_with_mode TO authenticated;

COMMENT ON VIEW flat_numbers_with_mode IS 'Flats with their apartment collection mode inherited from apartment policy';
