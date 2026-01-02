/*
  # Fix Payment Type Field - Copy from Expected Collections

  ## Problem
  Payment submissions have payment_type = NULL even when they have a valid expected_collection_id.
  The payment_type should be automatically populated from expected_collections.payment_type.

  ## Solution
  1. Add a trigger to automatically copy payment_type from expected_collections
  2. Update existing NULL records with correct payment_type
  3. Update submit_mobile_payment function to set payment_type

  ## Changes
  - Create trigger to auto-populate payment_type on INSERT
  - Backfill existing NULL payment_type values
  - Update mobile payment submission function
*/

-- Create trigger function to auto-populate payment_type from collection
CREATE OR REPLACE FUNCTION auto_populate_payment_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If payment_type is NULL but expected_collection_id exists, copy it
  IF NEW.payment_type IS NULL AND NEW.expected_collection_id IS NOT NULL THEN
    SELECT payment_type INTO NEW.payment_type
    FROM expected_collections
    WHERE id = NEW.expected_collection_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on payment_submissions
DROP TRIGGER IF EXISTS trigger_auto_populate_payment_type ON payment_submissions;
CREATE TRIGGER trigger_auto_populate_payment_type
  BEFORE INSERT OR UPDATE ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_payment_type();

-- Backfill existing NULL payment_type values
UPDATE payment_submissions ps
SET payment_type = ec.payment_type
FROM expected_collections ec
WHERE ps.expected_collection_id = ec.id
  AND ps.payment_type IS NULL
  AND ec.payment_type IS NOT NULL;

COMMENT ON FUNCTION auto_populate_payment_type() IS 
'Automatically copies payment_type from expected_collections when a payment is submitted.';
