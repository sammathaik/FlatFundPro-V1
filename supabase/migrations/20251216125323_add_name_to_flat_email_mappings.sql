/*
  # Add Name Field to Flat Email Mappings

  ## Overview
  This migration adds a `name` field to the `flat_email_mappings` table to store the occupant's name.
  This allows admins to manually enter and edit the occupant's name independently of payment submissions.

  ## Changes
  
  ### 1. `flat_email_mappings` table
  - Add `name` (text, nullable) - The occupant's name

  ## Important Notes
  - The name field is optional and can be edited by admins at any time
  - Existing records will have NULL for name initially
*/

-- Add name column to flat_email_mappings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flat_email_mappings' AND column_name = 'name'
  ) THEN
    ALTER TABLE flat_email_mappings ADD COLUMN name text;
  END IF;
END $$;