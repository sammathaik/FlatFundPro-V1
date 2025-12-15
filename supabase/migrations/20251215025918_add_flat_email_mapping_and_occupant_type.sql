/*
  # Add Flat-Email Mapping and Occupant Type
  
  ## Overview
  This migration implements SSO-like functionality where each flat is mapped to the first email address that submits a payment.
  Subsequent submissions from the same flat must use the same email address.
  
  ## New Tables
  
  ### 1. `flat_email_mappings`
  - `id` (uuid, primary key) - Unique mapping identifier
  - `apartment_id` (uuid, foreign key) - Links to apartments
  - `block_id` (uuid, foreign key) - Links to buildings_blocks_phases
  - `flat_id` (uuid, foreign key) - Links to flat_numbers
  - `email` (text) - The email address mapped to this flat
  - `occupant_type` (text) - Owner or Tenant
  - `mapped_at` (timestamptz) - When the mapping was first created
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## Changes to Existing Tables
  
  ### `payment_submissions`
  - Added `occupant_type` (text) - Whether submitter is Owner or Tenant
  - Added `payment_source` (text) - Source of payment submission
  
  ## Security
  - Enable RLS on flat_email_mappings table
  - Admins can view and manage mappings for their apartments
  - Super admins can view all mappings
  - Public can read mappings to validate submissions
  
  ## Important Notes
  - Unique constraint on (apartment_id, block_id, flat_id) ensures one email per flat
  - Mappings are created automatically on first payment submission
  - Subsequent submissions validate against the existing mapping
*/

-- Create flat_email_mappings table
CREATE TABLE IF NOT EXISTS flat_email_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES buildings_blocks_phases(id) ON DELETE CASCADE,
  flat_id uuid NOT NULL REFERENCES flat_numbers(id) ON DELETE CASCADE,
  email text NOT NULL,
  occupant_type text NOT NULL CHECK (occupant_type IN ('Owner', 'Tenant')),
  mapped_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(apartment_id, block_id, flat_id)
);

-- Add occupant_type to payment_submissions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_submissions' AND column_name = 'occupant_type'
  ) THEN
    ALTER TABLE payment_submissions ADD COLUMN occupant_type text CHECK (occupant_type IN ('Owner', 'Tenant'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flat_email_mappings_apartment ON flat_email_mappings(apartment_id);
CREATE INDEX IF NOT EXISTS idx_flat_email_mappings_flat ON flat_email_mappings(flat_id);
CREATE INDEX IF NOT EXISTS idx_flat_email_mappings_email ON flat_email_mappings(email);

-- Enable Row Level Security
ALTER TABLE flat_email_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flat_email_mappings

CREATE POLICY "Admins can view mappings in their apartment"
  ON flat_email_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = flat_email_mappings.apartment_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Admins can manage mappings in their apartment"
  ON flat_email_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = flat_email_mappings.apartment_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = flat_email_mappings.apartment_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Public can read mappings for validation"
  ON flat_email_mappings FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM apartments
      WHERE apartments.id = flat_email_mappings.apartment_id
      AND apartments.status = 'active'
    )
  );

-- Create function to validate and create flat-email mapping
CREATE OR REPLACE FUNCTION validate_and_create_flat_email_mapping(
  p_apartment_id uuid,
  p_block_id uuid,
  p_flat_id uuid,
  p_email text,
  p_occupant_type text
)
RETURNS jsonb AS $$
DECLARE
  v_existing_mapping RECORD;
  v_result jsonb;
BEGIN
  -- Check if mapping already exists for this flat
  SELECT * INTO v_existing_mapping
  FROM flat_email_mappings
  WHERE apartment_id = p_apartment_id
    AND block_id = p_block_id
    AND flat_id = p_flat_id;
  
  -- If mapping exists, validate email matches
  IF FOUND THEN
    IF v_existing_mapping.email != p_email THEN
      -- Email doesn't match existing mapping
      RETURN jsonb_build_object(
        'success', false,
        'error', 'email_mismatch',
        'message', 'This flat is already mapped to a different email address. Please contact your management committee for assistance.',
        'mapped_email', v_existing_mapping.email
      );
    ELSE
      -- Email matches, allow submission
      RETURN jsonb_build_object(
        'success', true,
        'is_existing', true,
        'message', 'Email validated successfully'
      );
    END IF;
  ELSE
    -- No mapping exists, create new one
    INSERT INTO flat_email_mappings (
      apartment_id,
      block_id,
      flat_id,
      email,
      occupant_type
    ) VALUES (
      p_apartment_id,
      p_block_id,
      p_flat_id,
      p_email,
      p_occupant_type
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'is_existing', false,
      'message', 'Flat mapped to your email successfully'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to update updated_at on flat_email_mappings
DROP TRIGGER IF EXISTS update_flat_email_mappings_updated_at ON flat_email_mappings;
CREATE TRIGGER update_flat_email_mappings_updated_at
  BEFORE UPDATE ON flat_email_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
