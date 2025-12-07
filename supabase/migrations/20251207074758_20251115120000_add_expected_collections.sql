/*
  # Expected Collections & Guest Payment Status Access

  - Adds `public_access_code` to apartments for guest-friendly links
  - Creates `expected_collections` to track quarterly dues
  - Links payment submissions to expected collections
  - Adds RLS policies for secure access (admins + limited public read)
*/

-- Add public access code for apartments (slug for guest URLs)
ALTER TABLE apartments
  ADD COLUMN IF NOT EXISTS public_access_code text UNIQUE;

-- Auto-populate missing access codes using slugified apartment names
UPDATE apartments
SET public_access_code = regexp_replace(lower(apartment_name), '[^a-z0-9]+', '-', 'g')
WHERE public_access_code IS NULL;

-- Add expected collections table
CREATE TABLE IF NOT EXISTS expected_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  payment_type text NOT NULL CHECK (payment_type IN ('maintenance', 'contingency', 'emergency')),
  financial_year text NOT NULL,
  quarter text NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  due_date date NOT NULL,
  amount_due numeric(10,2) NOT NULL,
  daily_fine numeric(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (apartment_id, payment_type, financial_year, quarter)
);

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION update_expected_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expected_collections_updated_at ON expected_collections;
CREATE TRIGGER trg_expected_collections_updated_at
  BEFORE UPDATE ON expected_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_expected_collections_updated_at();

-- Link payments to expected collections (optional)
ALTER TABLE payment_submissions
  ADD COLUMN IF NOT EXISTS expected_collection_id uuid REFERENCES expected_collections(id) ON DELETE SET NULL;

-- RLS for expected collections
ALTER TABLE expected_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view expected collections for their apartment"
  ON expected_collections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = expected_collections.apartment_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Admins can manage expected collections for their apartment"
  ON expected_collections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = expected_collections.apartment_id
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
      AND admins.apartment_id = expected_collections.apartment_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Public can view expected collections for active apartments"
  ON expected_collections FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM apartments
      WHERE apartments.id = expected_collections.apartment_id
      AND apartments.status = 'active'
    )
  );

-- Helper function to expose payment data for guests (aggregated, read-only)
CREATE OR REPLACE FUNCTION public.get_payment_status_data(access_code text)
RETURNS TABLE (
  apartment_id uuid,
  flat_id uuid,
  expected_collection_id uuid,
  payment_amount numeric,
  payment_type text,
  payment_quarter text,
  payment_date date,
  created_at timestamptz
) AS $$
DECLARE
  target_apartment_id uuid;
BEGIN
  SELECT id INTO target_apartment_id
  FROM apartments
  WHERE public_access_code = access_code
    AND status = 'active';

  IF target_apartment_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      ps.apartment_id,
      ps.flat_id,
      ps.expected_collection_id,
      ps.payment_amount,
      ps.payment_type,
      ps.payment_quarter,
      ps.payment_date,
      ps.created_at
    FROM payment_submissions ps
    WHERE ps.apartment_id = target_apartment_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions;

GRANT EXECUTE ON FUNCTION public.get_payment_status_data(text) TO anon;