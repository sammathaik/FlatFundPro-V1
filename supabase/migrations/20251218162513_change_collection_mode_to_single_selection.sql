/*
  # Change Collection Mode to Single Selection
  
  1. Overview
    - Changes allowed_collection_modes from array to single enum value
    - An apartment can only have ONE collection mode configured
    - Renamed field to collection_mode (singular) for clarity
  
  2. Changes to apartments table
    - Remove allowed_collection_modes array column
    - Add collection_mode as single enum value
    - Default: Mode A (Equal/Flat Rate)
    - NOT NULL constraint ensures a mode is always set
  
  3. Data Migration
    - Existing apartments with array ['A', 'B', 'C'] will be set to 'A'
    - Apartments with other combinations will use the first mode in their array
  
  4. Security
    - No RLS changes needed
*/

-- Add new collection_mode column (single value)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'apartments' AND column_name = 'collection_mode'
  ) THEN
    ALTER TABLE apartments 
    ADD COLUMN collection_mode collection_mode_enum DEFAULT 'A' NOT NULL;
  END IF;
END $$;

-- Migrate data: take the first mode from the existing array
UPDATE apartments
SET collection_mode = allowed_collection_modes[1]
WHERE allowed_collection_modes IS NOT NULL 
  AND cardinality(allowed_collection_modes) > 0;

-- Drop the old constraint and column
ALTER TABLE apartments
DROP CONSTRAINT IF EXISTS apartments_at_least_one_collection_mode;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'apartments' AND column_name = 'allowed_collection_modes'
  ) THEN
    ALTER TABLE apartments DROP COLUMN allowed_collection_modes;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN apartments.collection_mode IS 
'The maintenance collection mode for this apartment: A=Equal/Flat Rate, B=Area-Based, C=Flat-Type Based. Only one mode can be active per apartment.';
