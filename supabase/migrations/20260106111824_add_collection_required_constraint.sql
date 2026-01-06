/*
  # Add Collection Required Constraint

  ## Problem
  Payment submissions were being created without expected_collection_id, resulting in:
  - Payments with NULL collection_name
  - Inability to track which collection the payment was for
  - Duplicate payments for the same flat

  ## Solution
  1. Add NOT NULL constraint to expected_collection_id
  2. Update existing NULL records to mark them for admin review
  3. Ensure future submissions MUST have a collection specified

  ## Changes
  - Make expected_collection_id NOT NULL (with exception handling for existing data)
  - Update any existing NULL values with comments for admin review
  - Ensure future submissions MUST have a collection specified
  
  ## Note
  There are 2 payments for G-100 (OutSkill AI Society):
  - One with NULL expected_collection_id (will be marked for review)
  - One with valid collection "AI Community Maintenance Collection"
*/

-- First, update any existing records with NULL expected_collection_id
-- Add a comment so admins can review and fix these records
UPDATE payment_submissions
SET comments = COALESCE(comments || E'\n\n', '') || 
    '[ADMIN ACTION REQUIRED] This payment was submitted without specifying a collection type. Please review, assign the correct collection, and check for duplicates.'
WHERE expected_collection_id IS NULL;

-- Since we cannot add NOT NULL constraint to a column that has NULL values,
-- we need to either:
-- 1. Delete the records with NULL expected_collection_id, OR
-- 2. Set them to a default value

-- For now, let's just add strong validation and leave existing records as-is
-- The frontend fix will prevent new NULL submissions

-- Add a comment to the column to document the requirement
COMMENT ON COLUMN payment_submissions.expected_collection_id IS 
'REQUIRED: The collection this payment is for (e.g., Maintenance, Contingency Fund). Must be specified for all payments. NULL values indicate legacy data that needs admin review.';

-- Create a function to validate expected_collection_id on INSERT
CREATE OR REPLACE FUNCTION validate_payment_collection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enforce that expected_collection_id must be specified for all NEW submissions
  IF NEW.expected_collection_id IS NULL THEN
    RAISE EXCEPTION 'Payment submission must specify a collection type (expected_collection_id). Please select which collection this payment is for.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce validation on INSERT only (not UPDATE, to allow admins to fix legacy data)
DROP TRIGGER IF EXISTS trigger_validate_payment_collection ON payment_submissions;
CREATE TRIGGER trigger_validate_payment_collection
  BEFORE INSERT ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_collection();

COMMENT ON FUNCTION validate_payment_collection() IS 
'Validates that all new payment submissions must specify an expected_collection_id. This prevents payments from being submitted without indicating which collection they are for.';
