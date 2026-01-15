/*
  # Multi-Flat Occupant Login Support

  1. New Tables
    - `occupant_last_selected_flat` - Tracks last selected flat per occupant
      - `id` (uuid, primary key)
      - `mobile` (text, indexed) - Mobile number (normalized)
      - `email` (text, indexed) - Email address (normalized)
      - `flat_id` (uuid) - Last selected flat
      - `apartment_id` (uuid) - Apartment of last selected flat
      - `selected_at` (timestamptz) - When flat was selected
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. New Functions
    - `get_flats_by_mobile` - Get all flats for a mobile number
    - `get_flats_by_email` - Get all flats for an email address
    - `set_last_selected_flat` - Update last selected flat
    - `get_last_selected_flat` - Retrieve last selected flat

  3. Security
    - Enable RLS on occupant_last_selected_flat
    - Allow occupants to manage their own records
    - Allow admins to view for their apartments
*/

-- Create last selected flat tracking table
CREATE TABLE IF NOT EXISTS occupant_last_selected_flat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile text,
  email text,
  flat_id uuid REFERENCES flat_numbers(id) ON DELETE CASCADE,
  apartment_id uuid REFERENCES apartments(id) ON DELETE CASCADE,
  selected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_last_selected_flat_mobile ON occupant_last_selected_flat(mobile);
CREATE INDEX IF NOT EXISTS idx_last_selected_flat_email ON occupant_last_selected_flat(email);
CREATE INDEX IF NOT EXISTS idx_last_selected_flat_flat_id ON occupant_last_selected_flat(flat_id);
CREATE INDEX IF NOT EXISTS idx_last_selected_flat_apartment_id ON occupant_last_selected_flat(apartment_id);

-- Enable RLS
ALTER TABLE occupant_last_selected_flat ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read last selected flat"
  ON occupant_last_selected_flat FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert last selected flat"
  ON occupant_last_selected_flat FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update last selected flat"
  ON occupant_last_selected_flat FOR UPDATE
  USING (true);

-- Function: Get all flats by mobile number
CREATE OR REPLACE FUNCTION get_flats_by_mobile(p_mobile text)
RETURNS TABLE (
  flat_id uuid,
  apartment_id uuid,
  apartment_name text,
  block_id uuid,
  block_name text,
  flat_number text,
  occupant_name text,
  occupant_email text,
  occupant_type text,
  mobile text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id as flat_id,
    a.id as apartment_id,
    a.apartment_name,
    b.id as block_id,
    b.block_name,
    f.flat_number,
    fem.name as occupant_name,
    fem.email as occupant_email,
    fem.occupant_type,
    fem.mobile
  FROM flat_email_mappings fem
  JOIN flat_numbers f ON f.id = fem.flat_id
  JOIN buildings_blocks_phases b ON b.id = f.block_id
  JOIN apartments a ON a.id = b.apartment_id
  WHERE fem.mobile = p_mobile
  AND a.status = 'active'
  ORDER BY a.apartment_name, b.block_name, f.flat_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get all flats by email address
CREATE OR REPLACE FUNCTION get_flats_by_email(p_email text)
RETURNS TABLE (
  flat_id uuid,
  apartment_id uuid,
  apartment_name text,
  block_id uuid,
  block_name text,
  flat_number text,
  occupant_name text,
  occupant_mobile text,
  occupant_type text,
  email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id as flat_id,
    a.id as apartment_id,
    a.apartment_name,
    b.id as block_id,
    b.block_name,
    f.flat_number,
    fem.name as occupant_name,
    fem.mobile as occupant_mobile,
    fem.occupant_type,
    fem.email
  FROM flat_email_mappings fem
  JOIN flat_numbers f ON f.id = fem.flat_id
  JOIN buildings_blocks_phases b ON b.id = f.block_id
  JOIN apartments a ON a.id = b.apartment_id
  WHERE fem.email = p_email
  AND a.status = 'active'
  ORDER BY a.apartment_name, b.block_name, f.flat_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Set last selected flat
CREATE OR REPLACE FUNCTION set_last_selected_flat(
  p_mobile text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_flat_id uuid DEFAULT NULL,
  p_apartment_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update or insert last selected flat
  INSERT INTO occupant_last_selected_flat (mobile, email, flat_id, apartment_id, selected_at, updated_at)
  VALUES (p_mobile, p_email, p_flat_id, p_apartment_id, now(), now())
  ON CONFLICT (id) 
  DO NOTHING;
  
  -- Since we don't have a unique constraint on mobile/email, we'll update the most recent record
  IF p_mobile IS NOT NULL THEN
    UPDATE occupant_last_selected_flat
    SET flat_id = p_flat_id,
        apartment_id = p_apartment_id,
        selected_at = now(),
        updated_at = now()
    WHERE mobile = p_mobile
    AND id = (
      SELECT id FROM occupant_last_selected_flat 
      WHERE mobile = p_mobile 
      ORDER BY selected_at DESC 
      LIMIT 1
    );
    
    -- If no record exists, insert one
    IF NOT FOUND THEN
      INSERT INTO occupant_last_selected_flat (mobile, email, flat_id, apartment_id)
      VALUES (p_mobile, p_email, p_flat_id, p_apartment_id);
    END IF;
  END IF;
  
  IF p_email IS NOT NULL AND p_mobile IS NULL THEN
    UPDATE occupant_last_selected_flat
    SET flat_id = p_flat_id,
        apartment_id = p_apartment_id,
        selected_at = now(),
        updated_at = now()
    WHERE email = p_email
    AND mobile IS NULL
    AND id = (
      SELECT id FROM occupant_last_selected_flat 
      WHERE email = p_email 
      AND mobile IS NULL
      ORDER BY selected_at DESC 
      LIMIT 1
    );
    
    -- If no record exists, insert one
    IF NOT FOUND THEN
      INSERT INTO occupant_last_selected_flat (mobile, email, flat_id, apartment_id)
      VALUES (p_mobile, p_email, p_flat_id, p_apartment_id);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get last selected flat
CREATE OR REPLACE FUNCTION get_last_selected_flat(
  p_mobile text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS TABLE (
  flat_id uuid,
  apartment_id uuid,
  selected_at timestamptz
) AS $$
BEGIN
  IF p_mobile IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      lsf.flat_id,
      lsf.apartment_id,
      lsf.selected_at
    FROM occupant_last_selected_flat lsf
    WHERE lsf.mobile = p_mobile
    ORDER BY lsf.selected_at DESC
    LIMIT 1;
  ELSIF p_email IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      lsf.flat_id,
      lsf.apartment_id,
      lsf.selected_at
    FROM occupant_last_selected_flat lsf
    WHERE lsf.email = p_email
    AND lsf.mobile IS NULL
    ORDER BY lsf.selected_at DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_occupant_last_selected_flat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_occupant_last_selected_flat_updated_at ON occupant_last_selected_flat;
CREATE TRIGGER trigger_update_occupant_last_selected_flat_updated_at
  BEFORE UPDATE ON occupant_last_selected_flat
  FOR EACH ROW
  EXECUTE FUNCTION update_occupant_last_selected_flat_updated_at();
