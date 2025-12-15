/*
  # Add Payment Frequency and Activation to Expected Collections

  ## Overview
  This migration enhances the expected_collections table to support flexible payment frequencies
  and activation status for better fund collection management.

  ## Changes
  1. **New Fields**:
     - `payment_frequency`: Defines how often payments are collected
       - Options: 'one-time', 'monthly', 'quarterly', 'yearly'
       - Default: 'quarterly' (maintains backward compatibility)
     - `is_active`: Boolean flag to activate/deactivate collections
       - Default: false (collections are inactive by default)
     - `collection_name`: User-friendly name for the collection
       - Helps identify specific collections (e.g., "Annual Maintenance 2025")
     - `start_date`: When the collection period begins
     - `end_date`: When the collection period ends (optional, for one-time collections)
  
  2. **Data Migration**:
     - Existing records get payment_frequency = 'quarterly'
     - Existing records remain inactive (is_active = false)
     - Collection names are auto-generated from existing data
  
  3. **Unique Constraint Update**:
     - Updated to include payment_frequency instead of quarter
     - Allows multiple collections with same type but different frequencies

  ## Security
  - RLS policies remain unchanged
  - Only admins can create/modify collections
*/

-- Add new columns to expected_collections
ALTER TABLE expected_collections
  ADD COLUMN IF NOT EXISTS payment_frequency text NOT NULL DEFAULT 'quarterly' 
    CHECK (payment_frequency IN ('one-time', 'monthly', 'quarterly', 'yearly'));

ALTER TABLE expected_collections
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

ALTER TABLE expected_collections
  ADD COLUMN IF NOT EXISTS collection_name text;

ALTER TABLE expected_collections
  ADD COLUMN IF NOT EXISTS start_date date;

ALTER TABLE expected_collections
  ADD COLUMN IF NOT EXISTS end_date date;

-- Migrate existing data: set frequency to quarterly and generate names
UPDATE expected_collections
SET 
  payment_frequency = 'quarterly',
  is_active = false,
  collection_name = COALESCE(
    collection_name,
    INITCAP(payment_type) || ' - ' || quarter || ' ' || financial_year
  ),
  start_date = COALESCE(start_date, due_date - INTERVAL '90 days')
WHERE payment_frequency IS NULL OR collection_name IS NULL;

-- Drop the old unique constraint
ALTER TABLE expected_collections
  DROP CONSTRAINT IF EXISTS expected_collections_apartment_id_payment_type_financial_yea_key;

-- Add new unique constraint (allow same type/year but different frequency/period)
-- We'll use a combination of apartment, type, frequency, and start date for uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'expected_collections_unique_period'
  ) THEN
    ALTER TABLE expected_collections
      ADD CONSTRAINT expected_collections_unique_period
      UNIQUE (apartment_id, payment_type, payment_frequency, start_date);
  END IF;
END $$;

-- Create index for active collections (frequently queried)
CREATE INDEX IF NOT EXISTS idx_expected_collections_active 
  ON expected_collections(apartment_id, is_active) 
  WHERE is_active = true;

-- Create index for payment frequency queries
CREATE INDEX IF NOT EXISTS idx_expected_collections_frequency 
  ON expected_collections(apartment_id, payment_frequency, is_active);

-- Add helpful comment
COMMENT ON COLUMN expected_collections.payment_frequency IS 
  'Frequency of payment collection: one-time (special collections), monthly (recurring), quarterly (standard), yearly (annual)';

COMMENT ON COLUMN expected_collections.is_active IS 
  'Whether this collection is currently active and visible to residents for payment submission';

COMMENT ON COLUMN expected_collections.collection_name IS 
  'User-friendly name for the collection (e.g., "Annual Maintenance 2025", "Emergency Repair Fund")';
