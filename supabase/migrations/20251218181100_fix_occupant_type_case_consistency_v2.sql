/*
  # Fix Occupant Type Case Consistency

  1. Changes
    - Standardize occupant_type values to title case ("Owner" and "Tenant")
    - Update flat_numbers table to use consistent casing with flat_email_mappings
    - Update constraints to enforce title case
  
  2. Important Notes
    - Existing data in flat_numbers uses lowercase ("owner", "tenant")
    - Existing data in flat_email_mappings uses title case ("Owner", "Tenant")
    - This migration standardizes everything to title case for consistency
    - This fixes the issue where BuildingManagement and OccupantManagement use different casing
*/

-- Step 1: Drop the existing constraint that enforces lowercase
ALTER TABLE flat_numbers DROP CONSTRAINT IF EXISTS flat_occupant_type_check;

-- Step 2: Update existing lowercase values in flat_numbers to title case
UPDATE flat_numbers
SET occupant_type = 'Owner'
WHERE LOWER(occupant_type) = 'owner';

UPDATE flat_numbers
SET occupant_type = 'Tenant'
WHERE LOWER(occupant_type) = 'tenant';

-- Step 3: Add new constraint with title case values (allows NULL since occupant_type is optional)
ALTER TABLE flat_numbers
ADD CONSTRAINT flat_occupant_type_check
CHECK (occupant_type IN ('Owner', 'Tenant') OR occupant_type IS NULL);

-- Step 4: Add helpful comments
COMMENT ON COLUMN flat_numbers.occupant_type IS 'Resident type: Owner or Tenant (stored in flat record for reference)';
COMMENT ON COLUMN flat_email_mappings.occupant_type IS 'Resident type: Owner or Tenant (for residents with system access credentials)';
