/*
  # Add Flat-Level Maintenance Collection Mode Support

  1. Changes to Apartments Table
    - Rename `collection_mode` to `default_collection_mode` for clarity
    - This represents the primary/recommended mode for the apartment

  2. New Flat Number Attributes
    - `maintenance_collection_mode` (collection_mode_enum) - Field indicating which mode applies to this flat
    - `built_up_area` (numeric) - For Mode B (Area-Based) calculations
    - `flat_type` (text) - For Mode C (Flat-Type Based) calculations
    - `owner_name` (text) - For better record keeping
    - `occupant_type` (text) - 'owner' or 'tenant'
    - `updated_at` (timestamptz) - Track changes
  
  3. Data Migration Strategy
    - Add fields WITHOUT constraints first
    - Migrate existing data
    - Set default values where needed
  
  4. Security
    - Update RLS policies on flat_numbers table
*/

-- Step 1: Rename collection_mode to default_collection_mode in apartments table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'apartments' AND column_name = 'collection_mode'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'apartments' AND column_name = 'default_collection_mode'
  ) THEN
    ALTER TABLE apartments 
    RENAME COLUMN collection_mode TO default_collection_mode;
  END IF;
END $$;

-- Step 2: Add new columns to flat_numbers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_numbers' AND column_name = 'maintenance_collection_mode'
  ) THEN
    ALTER TABLE flat_numbers 
    ADD COLUMN maintenance_collection_mode collection_mode_enum;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_numbers' AND column_name = 'built_up_area'
  ) THEN
    ALTER TABLE flat_numbers 
    ADD COLUMN built_up_area NUMERIC(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_numbers' AND column_name = 'flat_type'
  ) THEN
    ALTER TABLE flat_numbers 
    ADD COLUMN flat_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_numbers' AND column_name = 'owner_name'
  ) THEN
    ALTER TABLE flat_numbers 
    ADD COLUMN owner_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_numbers' AND column_name = 'occupant_type'
  ) THEN
    ALTER TABLE flat_numbers 
    ADD COLUMN occupant_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_numbers' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE flat_numbers 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Step 3: Migrate existing flat data to inherit apartment's default_collection_mode
UPDATE flat_numbers fn
SET maintenance_collection_mode = COALESCE(
  (
    SELECT a.default_collection_mode
    FROM buildings_blocks_phases bbp
    JOIN apartments a ON a.id = bbp.apartment_id
    WHERE bbp.id = fn.block_id
  ),
  'A'::collection_mode_enum
)
WHERE maintenance_collection_mode IS NULL;

-- Step 4: Set default flat_type for Mode C flats that don't have one
UPDATE flat_numbers
SET flat_type = '2BHK'
WHERE maintenance_collection_mode = 'C' AND (flat_type IS NULL OR flat_type = '');

-- Step 5: Set default built_up_area for Mode B flats that don't have one
UPDATE flat_numbers
SET built_up_area = 1000.00
WHERE maintenance_collection_mode = 'B' AND (built_up_area IS NULL OR built_up_area = 0);

-- Step 6: Make maintenance_collection_mode NOT NULL with default
DO $$
BEGIN
  -- Set default first
  EXECUTE 'ALTER TABLE flat_numbers ALTER COLUMN maintenance_collection_mode SET DEFAULT ''A''::collection_mode_enum';
  
  -- Then make it NOT NULL if not already
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_numbers' 
    AND column_name = 'maintenance_collection_mode'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE flat_numbers ALTER COLUMN maintenance_collection_mode SET NOT NULL;
  END IF;
END $$;

-- Step 7: Add check constraint for occupant_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'flat_occupant_type_check'
  ) THEN
    ALTER TABLE flat_numbers
    ADD CONSTRAINT flat_occupant_type_check
    CHECK (occupant_type IN ('owner', 'tenant') OR occupant_type IS NULL);
  END IF;
END $$;

-- Step 8: Create or replace trigger for updated_at
CREATE OR REPLACE FUNCTION update_flat_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS flat_numbers_updated_at_trigger ON flat_numbers;

CREATE TRIGGER flat_numbers_updated_at_trigger
  BEFORE UPDATE ON flat_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_flat_numbers_updated_at();

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flat_numbers_maintenance_mode 
ON flat_numbers(maintenance_collection_mode);

CREATE INDEX IF NOT EXISTS idx_flat_numbers_flat_type 
ON flat_numbers(flat_type) 
WHERE flat_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_flat_numbers_block_id 
ON flat_numbers(block_id);

-- Step 10: Update RLS policies for flat_numbers
DROP POLICY IF EXISTS "Admins can view flats in their apartment" ON flat_numbers;
DROP POLICY IF EXISTS "Admins can create flats in their apartment" ON flat_numbers;
DROP POLICY IF EXISTS "Admins can update flats in their apartment" ON flat_numbers;
DROP POLICY IF EXISTS "Admins can delete flats in their apartment" ON flat_numbers;
DROP POLICY IF EXISTS "Super admins can view all flats" ON flat_numbers;

-- Admins can view flats
CREATE POLICY "Admins can view flats in their apartment"
  ON flat_numbers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.apartment_id
      WHERE bbp.id = flat_numbers.block_id
        AND a.user_id = auth.uid()
        AND a.status = 'active'
    )
  );

-- Admins can create flats
CREATE POLICY "Admins can create flats in their apartment"
  ON flat_numbers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.apartment_id
      WHERE bbp.id = flat_numbers.block_id
        AND a.user_id = auth.uid()
        AND a.status = 'active'
    )
  );

-- Admins can update flats
CREATE POLICY "Admins can update flats in their apartment"
  ON flat_numbers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.apartment_id
      WHERE bbp.id = flat_numbers.block_id
        AND a.user_id = auth.uid()
        AND a.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.apartment_id
      WHERE bbp.id = flat_numbers.block_id
        AND a.user_id = auth.uid()
        AND a.status = 'active'
    )
  );

-- Admins can delete flats
CREATE POLICY "Admins can delete flats in their apartment"
  ON flat_numbers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.apartment_id
      WHERE bbp.id = flat_numbers.block_id
        AND a.user_id = auth.uid()
        AND a.status = 'active'
    )
  );

-- Super admins can view all flats
CREATE POLICY "Super admins can view all flats"
  ON flat_numbers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN super_admins sa ON sa.user_id = a.user_id
      WHERE a.user_id = auth.uid()
        AND a.status = 'active'
    )
  );

-- Step 11: Add comments for documentation
COMMENT ON COLUMN flat_numbers.maintenance_collection_mode IS 'Defines how maintenance is calculated for this flat. Must align with apartment policy. A=Equal Rate, B=Area-Based, C=Type-Based';
COMMENT ON COLUMN flat_numbers.built_up_area IS 'Built-up area in square feet. Required for Mode B (Area-Based) flats';
COMMENT ON COLUMN flat_numbers.flat_type IS 'Flat category (1BHK, 2BHK, 3BHK, 4BHK, Studio, Penthouse, etc.). Required for Mode C (Type-Based) flats';
COMMENT ON COLUMN flat_numbers.owner_name IS 'Name of the flat owner for record keeping';
COMMENT ON COLUMN flat_numbers.occupant_type IS 'Whether the flat is occupied by owner or tenant';
