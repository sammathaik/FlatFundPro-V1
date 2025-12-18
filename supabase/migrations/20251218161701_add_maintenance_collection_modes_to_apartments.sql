/*
  # Add Maintenance Collection Modes to Apartments
  
  1. Overview
    - Adds apartment-level policy configuration for maintenance collection modes
    - Allows Super Admin to enable one or more collection calculation methods
    - Applies to entire apartment (society level), not individual flats
  
  2. New Types
    - collection_mode_enum: ENUM with values 'A' (Equal/Flat Rate), 'B' (Area-Based), 'C' (Flat-Type Based)
  
  3. Changes to apartments table
    - allowed_collection_modes: ARRAY of collection_mode_enum
    - Default: All modes enabled ['A', 'B', 'C']
    - Constraint: At least one mode must be enabled
  
  4. Security
    - No RLS changes needed (apartments table already has proper RLS)
  
  5. Notes
    - This configuration only affects future billing cycles
    - Does not store rates, amounts, or flat-specific overrides
*/

-- Create ENUM type for collection modes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'collection_mode_enum') THEN
    CREATE TYPE collection_mode_enum AS ENUM ('A', 'B', 'C');
  END IF;
END $$;

-- Add allowed_collection_modes column to apartments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'apartments' AND column_name = 'allowed_collection_modes'
  ) THEN
    ALTER TABLE apartments 
    ADD COLUMN allowed_collection_modes collection_mode_enum[] DEFAULT ARRAY['A', 'B', 'C']::collection_mode_enum[];
  END IF;
END $$;

-- Add constraint to ensure at least one mode is always enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'apartments_at_least_one_collection_mode'
  ) THEN
    ALTER TABLE apartments
    ADD CONSTRAINT apartments_at_least_one_collection_mode 
    CHECK (array_length(allowed_collection_modes, 1) >= 1);
  END IF;
END $$;

-- Update existing apartments to have all modes enabled if null
UPDATE apartments 
SET allowed_collection_modes = ARRAY['A', 'B', 'C']::collection_mode_enum[]
WHERE allowed_collection_modes IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN apartments.allowed_collection_modes IS 
'Apartment-level policy defining which maintenance collection modes are allowed: A=Equal/Flat Rate, B=Area-Based, C=Flat-Type Based. At least one mode must be enabled.';
