/*
  # Add Collection Mode Support to Expected Collections

  1. New Columns
    - `rate_per_sqft` (numeric) - Rate per square foot for Mode B (Area-Based)
    - `flat_type_rates` (jsonb) - JSON object storing rates for different flat types for Mode C (Type-Based)
      Example: {"1BHK": 3000, "2BHK": 5000, "3BHK": 7000}
  
  2. Changes
    - Modified `amount_due` to be nullable since it's only used for Mode A
    - Mode A uses: `amount_due` (flat rate for all flats)
    - Mode B uses: `rate_per_sqft` (multiplied by flat's built_up_area)
    - Mode C uses: `flat_type_rates` (looked up by flat's flat_type)
  
  3. Validation
    - At least one of (amount_due, rate_per_sqft, flat_type_rates) must be set
    - Ensures collection has valid pricing configuration
  
  4. Important Notes
    - Existing collections with amount_due will continue to work (Mode A)
    - New collections can specify Mode B or Mode C pricing
    - Apartment's default_collection_mode determines which field should be used
*/

-- Step 1: Make amount_due nullable since it's only for Mode A
ALTER TABLE expected_collections 
ALTER COLUMN amount_due DROP NOT NULL;

-- Step 2: Add rate_per_sqft column for Mode B (Area-Based)
ALTER TABLE expected_collections
ADD COLUMN IF NOT EXISTS rate_per_sqft NUMERIC(10, 2);

-- Step 3: Add flat_type_rates column for Mode C (Type-Based)
ALTER TABLE expected_collections
ADD COLUMN IF NOT EXISTS flat_type_rates JSONB;

-- Step 4: Add check constraint to ensure at least one pricing method is set
ALTER TABLE expected_collections
ADD CONSTRAINT at_least_one_pricing_method 
CHECK (
  amount_due IS NOT NULL OR 
  rate_per_sqft IS NOT NULL OR 
  flat_type_rates IS NOT NULL
);

-- Step 5: Add comments for clarity
COMMENT ON COLUMN expected_collections.amount_due IS 'Mode A (Flat Rate): Fixed amount per flat regardless of size or type';
COMMENT ON COLUMN expected_collections.rate_per_sqft IS 'Mode B (Area-Based): Rate per square foot, multiplied by flat built_up_area';
COMMENT ON COLUMN expected_collections.flat_type_rates IS 'Mode C (Type-Based): JSON object with rates for each flat type, e.g., {"1BHK": 3000, "2BHK": 5000}';

-- Step 6: Create index on flat_type_rates for faster lookups
CREATE INDEX IF NOT EXISTS idx_expected_collections_flat_type_rates 
ON expected_collections USING gin (flat_type_rates);
