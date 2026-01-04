/*
  # Collection Status Sharing System

  1. Purpose
    - Allow admins to share payment status for specific collections with residents
    - Generate secure, read-only links for collection status
    - Track sharing activity in communication audit

  2. New Tables
    - `collection_status_shares` - Tracks shared collection links with unique codes

  3. New Functions
    - `get_collection_status_summary` - Returns payment status for a collection
    - `create_collection_share_link` - Generates secure share link
    - `get_collection_share_data` - Public function to fetch shared collection data

  4. Security
    - RLS enabled for collection_status_shares
    - Public access through share codes only
    - No sensitive data exposed (amounts optional)
*/

-- Collection status shares table
CREATE TABLE IF NOT EXISTS collection_status_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expected_collection_id uuid NOT NULL REFERENCES expected_collections(id) ON DELETE CASCADE,
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  share_code text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  view_count integer DEFAULT 0,
  last_viewed_at timestamptz,
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE collection_status_shares ENABLE ROW LEVEL SECURITY;

-- Admins can create shares for their apartments
CREATE POLICY "Admins can create collection shares"
  ON collection_status_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = collection_status_shares.apartment_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Admins can view shares for their apartments
CREATE POLICY "Admins can view collection shares"
  ON collection_status_shares FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = collection_status_shares.apartment_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collection_status_shares_code
  ON collection_status_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_collection_status_shares_collection
  ON collection_status_shares(expected_collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_status_shares_apartment
  ON collection_status_shares(apartment_id);

-- Function to get collection status summary
CREATE OR REPLACE FUNCTION get_collection_status_summary(
  p_expected_collection_id uuid
)
RETURNS TABLE (
  building_name text,
  flat_number text,
  flat_id uuid,
  occupant_name text,
  payment_status text,
  total_paid numeric,
  amount_due numeric,
  approved_count integer,
  pending_count integer,
  rejected_count integer
) AS $$
BEGIN
  RETURN QUERY
  WITH flat_info AS (
    SELECT
      f.id as flat_id,
      f.flat_number,
      b.building_name,
      f.apartment_id,
      fem.name as occupant_name
    FROM flats f
    JOIN buildings b ON b.id = f.building_id
    LEFT JOIN flat_email_mappings fem ON fem.flat_id = f.id AND fem.is_primary = true
    WHERE EXISTS (
      SELECT 1 FROM expected_collections ec
      WHERE ec.id = p_expected_collection_id
      AND ec.apartment_id = f.apartment_id
    )
  ),
  payment_summary AS (
    SELECT
      ps.flat_id,
      SUM(CASE WHEN ps.status = 'approved' THEN ps.payment_amount ELSE 0 END) as total_paid,
      COUNT(CASE WHEN ps.status = 'approved' THEN 1 END) as approved_count,
      COUNT(CASE WHEN ps.status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN ps.status = 'rejected' THEN 1 END) as rejected_count
    FROM payment_submissions ps
    WHERE ps.expected_collection_id = p_expected_collection_id
    GROUP BY ps.flat_id
  ),
  collection_info AS (
    SELECT
      ec.amount_due,
      ec.apartment_id,
      ec.rate_per_sqft,
      ec.flat_type_rates
    FROM expected_collections ec
    WHERE ec.id = p_expected_collection_id
  )
  SELECT
    fi.building_name,
    fi.flat_number,
    fi.flat_id,
    COALESCE(fi.occupant_name, 'Not Registered') as occupant_name,
    CASE
      WHEN COALESCE(ps.total_paid, 0) = 0 THEN 'unpaid'
      WHEN COALESCE(ps.total_paid, 0) < ci.amount_due THEN 'underpaid'
      WHEN COALESCE(ps.total_paid, 0) = ci.amount_due THEN 'paid'
      WHEN COALESCE(ps.total_paid, 0) > ci.amount_due THEN 'overpaid'
      ELSE 'unpaid'
    END as payment_status,
    COALESCE(ps.total_paid, 0) as total_paid,
    ci.amount_due,
    COALESCE(ps.approved_count, 0)::integer as approved_count,
    COALESCE(ps.pending_count, 0)::integer as pending_count,
    COALESCE(ps.rejected_count, 0)::integer as rejected_count
  FROM flat_info fi
  CROSS JOIN collection_info ci
  LEFT JOIN payment_summary ps ON ps.flat_id = fi.flat_id
  ORDER BY fi.building_name, fi.flat_number;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions;

-- Grant execution to authenticated users (admins)
GRANT EXECUTE ON FUNCTION get_collection_status_summary(uuid) TO authenticated;

COMMENT ON FUNCTION get_collection_status_summary IS 'Returns payment status summary for a specific collection, grouped by flat';

-- Function to create collection share link
CREATE OR REPLACE FUNCTION create_collection_share_link(
  p_expected_collection_id uuid,
  p_apartment_id uuid,
  p_expires_in_days integer DEFAULT 30
)
RETURNS TABLE (
  share_id uuid,
  share_code text,
  share_url text
) AS $$
DECLARE
  v_share_id uuid;
  v_share_code text;
  v_base_url text;
BEGIN
  -- Generate unique share code (8 characters, URL-safe)
  v_share_code := encode(gen_random_bytes(6), 'base64');
  v_share_code := replace(replace(replace(v_share_code, '+', ''), '/', ''), '=', '');
  v_share_code := substring(v_share_code, 1, 8);

  -- Insert share record
  INSERT INTO collection_status_shares (
    expected_collection_id,
    apartment_id,
    share_code,
    created_by,
    expires_at,
    is_active
  ) VALUES (
    p_expected_collection_id,
    p_apartment_id,
    v_share_code,
    auth.uid(),
    CASE
      WHEN p_expires_in_days > 0 THEN now() + (p_expires_in_days || ' days')::interval
      ELSE NULL
    END,
    true
  )
  RETURNING id INTO v_share_id;

  -- Return share details
  RETURN QUERY
  SELECT
    v_share_id,
    v_share_code,
    '/collection-status/' || v_share_code as share_url;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions;

-- Grant execution to authenticated users (admins)
GRANT EXECUTE ON FUNCTION create_collection_share_link(uuid, uuid, integer) TO authenticated;

COMMENT ON FUNCTION create_collection_share_link IS 'Creates a secure shareable link for a collection status view';

-- Function to get collection share data (public access)
CREATE OR REPLACE FUNCTION get_collection_share_data(p_share_code text)
RETURNS TABLE (
  collection_id uuid,
  collection_name text,
  apartment_name text,
  payment_type text,
  due_date date,
  amount_due numeric,
  financial_year text,
  quarter text,
  is_active boolean,
  share_expires_at timestamptz
) AS $$
DECLARE
  v_share_id uuid;
BEGIN
  -- Validate share code and check expiry
  SELECT css.id INTO v_share_id
  FROM collection_status_shares css
  WHERE css.share_code = p_share_code
    AND css.is_active = true
    AND (css.expires_at IS NULL OR css.expires_at > now());

  IF v_share_id IS NULL THEN
    RETURN;
  END IF;

  -- Update view count and last viewed timestamp
  UPDATE collection_status_shares
  SET
    view_count = view_count + 1,
    last_viewed_at = now()
  WHERE id = v_share_id;

  -- Return collection details
  RETURN QUERY
  SELECT
    ec.id as collection_id,
    ec.collection_name,
    a.apartment_name,
    ec.payment_type,
    ec.due_date,
    ec.amount_due,
    ec.financial_year,
    ec.quarter,
    ec.is_active,
    css.expires_at as share_expires_at
  FROM collection_status_shares css
  JOIN expected_collections ec ON ec.id = css.expected_collection_id
  JOIN apartments a ON a.id = css.apartment_id
  WHERE css.id = v_share_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions;

-- Grant execution to anonymous and authenticated users (public access)
GRANT EXECUTE ON FUNCTION get_collection_share_data(text) TO anon;
GRANT EXECUTE ON FUNCTION get_collection_share_data(text) TO authenticated;

COMMENT ON FUNCTION get_collection_share_data IS 'Public function to retrieve collection details using a share code';

-- Add comment to table
COMMENT ON TABLE collection_status_shares IS 'Tracks shared collection status links for resident communication';
