/*
  # Fix Collection Modes Constraint
  
  1. Overview
    - Fixes the constraint to properly prevent empty collection modes arrays
    - array_length() returns NULL for empty arrays, so we use cardinality() instead
  
  2. Changes
    - Fix any apartments with empty arrays first
    - Drop old constraint
    - Add new constraint using cardinality() which returns 0 for empty arrays
*/

-- First, fix any apartments that have empty arrays
UPDATE apartments 
SET allowed_collection_modes = ARRAY['A', 'B', 'C']::collection_mode_enum[]
WHERE cardinality(allowed_collection_modes) = 0 OR allowed_collection_modes IS NULL;

-- Drop the old constraint
ALTER TABLE apartments
DROP CONSTRAINT IF EXISTS apartments_at_least_one_collection_mode;

-- Add the corrected constraint using cardinality()
ALTER TABLE apartments
ADD CONSTRAINT apartments_at_least_one_collection_mode 
CHECK (cardinality(allowed_collection_modes) >= 1);

COMMENT ON CONSTRAINT apartments_at_least_one_collection_mode ON apartments IS 
'Ensures at least one collection mode is always enabled for the apartment';
