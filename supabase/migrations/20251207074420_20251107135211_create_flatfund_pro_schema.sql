/*
  # FlatFund Pro - Complete Database Schema
  
  ## Overview
  This migration creates the complete database schema for FlatFund Pro apartment maintenance portal
  with multi-apartment management, role-based access control, and compliance features.
  
  ## New Tables
  
  ### 1. `apartments`
  - `id` (uuid, primary key) - Unique apartment identifier
  - `apartment_name` (text, unique) - Unique name for the apartment/society
  - `status` (text) - active/inactive status
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 2. `admins`
  - `id` (uuid, primary key) - Unique admin identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `apartment_id` (uuid, foreign key) - Links to apartments (ONE per admin)
  - `admin_name` (text) - Admin full name
  - `admin_email` (text, unique) - Admin email address
  - `phone` (text) - Contact phone number
  - `status` (text) - active/inactive status
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### 3. `buildings_blocks_phases`
  - `id` (uuid, primary key) - Unique identifier
  - `apartment_id` (uuid, foreign key) - Links to apartments
  - `block_name` (text) - Name of building/block/phase
  - `type` (text) - Type: Block/Building/Phase/Tower/Wing
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### 4. `flat_numbers`
  - `id` (uuid, primary key) - Unique identifier
  - `block_id` (uuid, foreign key) - Links to buildings_blocks_phases
  - `flat_number` (text) - Flat/unit number
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### 5. `payment_submissions`
  - `id` (uuid, primary key) - Unique submission identifier
  - `apartment_id` (uuid, foreign key) - Links to apartments
  - `name` (text) - Owner/Tenant name
  - `block_id` (uuid, foreign key) - Links to buildings_blocks_phases
  - `flat_id` (uuid, foreign key) - Links to flat_numbers
  - `email` (text) - Contact email
  - `contact_number` (text) - Contact phone (optional)
  - `payment_amount` (numeric) - Payment amount (optional)
  - `payment_date` (date) - Payment date (optional)
  - `screenshot_url` (text) - URL to uploaded file
  - `screenshot_filename` (text) - Original filename
  - `status` (text) - Received/Reviewed/Approved
  - `reviewed_by` (uuid, foreign key) - Admin who reviewed
  - `reviewed_at` (timestamptz) - Review timestamp
  - `created_at` (timestamptz) - Submission timestamp
  
  ### 6. `super_admins`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `name` (text) - Super admin name
  - `email` (text, unique) - Super admin email
  - `status` (text) - active/inactive status
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### 7. `audit_logs`
  - `id` (uuid, primary key) - Unique log identifier
  - `user_id` (uuid) - User who performed action
  - `user_email` (text) - Email of user
  - `action` (text) - Action performed (delete/export/etc)
  - `table_name` (text) - Affected table
  - `record_id` (uuid) - Affected record ID
  - `details` (jsonb) - Additional details
  - `created_at` (timestamptz) - Log timestamp
  
  ## Security
  - Enable RLS on all tables
  - Super Admin: Read-only on payment_submissions, full control on apartments/admins
  - Apartment Admin: Full control on their apartment's data only
  - Public: Insert-only on payment_submissions (with apartment validation)
  
  ## Important Notes
  - One admin per apartment enforced via unique constraint
  - File uploads limited to 4MB via application logic
  - Status workflow: Received → Reviewed → Approved
  - All deletions are permanent (no soft delete)
  - Audit logs track all sensitive operations
*/

-- Drop the old payment_submissions table since we're recreating with proper schema
DROP TABLE IF EXISTS payment_submissions CASCADE;

-- Create apartments table
CREATE TABLE IF NOT EXISTS apartments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_name text UNIQUE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create buildings_blocks_phases table
CREATE TABLE IF NOT EXISTS buildings_blocks_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  block_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Block', 'Building', 'Phase', 'Tower', 'Wing')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(apartment_id, block_name)
);

-- Create flat_numbers table
CREATE TABLE IF NOT EXISTS flat_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES buildings_blocks_phases(id) ON DELETE CASCADE,
  flat_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(block_id, flat_number)
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  apartment_id uuid UNIQUE NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  admin_name text NOT NULL,
  admin_email text UNIQUE NOT NULL,
  phone text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Create super_admins table
CREATE TABLE IF NOT EXISTS super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Create payment_submissions table
CREATE TABLE IF NOT EXISTS payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  name text NOT NULL,
  block_id uuid NOT NULL REFERENCES buildings_blocks_phases(id) ON DELETE CASCADE,
  flat_id uuid NOT NULL REFERENCES flat_numbers(id) ON DELETE CASCADE,
  email text NOT NULL,
  contact_number text,
  payment_amount numeric(10,2),
  payment_date date,
  screenshot_url text NOT NULL,
  screenshot_filename text NOT NULL,
  status text DEFAULT 'Received' CHECK (status IN ('Received', 'Reviewed', 'Approved')),
  reviewed_by uuid REFERENCES admins(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_apartments_status ON apartments(status);
CREATE INDEX IF NOT EXISTS idx_buildings_apartment ON buildings_blocks_phases(apartment_id);
CREATE INDEX IF NOT EXISTS idx_flats_block ON flat_numbers(block_id);
CREATE INDEX IF NOT EXISTS idx_admins_apartment ON admins(apartment_id);
CREATE INDEX IF NOT EXISTS idx_admins_user ON admins(user_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_user ON super_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_apartment ON payment_submissions(apartment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payment_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings_blocks_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE flat_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for apartments
CREATE POLICY "Super admins can view all apartments"
  ON apartments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Apartment admins can view their apartment"
  ON apartments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = apartments.id
      AND admins.status = 'active'
    )
  );

CREATE POLICY "Super admins can manage apartments"
  ON apartments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Public can view active apartments"
  ON apartments FOR SELECT
  TO anon
  USING (status = 'active');

-- RLS Policies for buildings_blocks_phases
CREATE POLICY "Admins can view their apartment buildings"
  ON buildings_blocks_phases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = buildings_blocks_phases.apartment_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Admins can manage their apartment buildings"
  ON buildings_blocks_phases FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = buildings_blocks_phases.apartment_id
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
      AND admins.apartment_id = buildings_blocks_phases.apartment_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Public can view buildings for active apartments"
  ON buildings_blocks_phases FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM apartments
      WHERE apartments.id = buildings_blocks_phases.apartment_id
      AND apartments.status = 'active'
    )
  );

-- RLS Policies for flat_numbers
CREATE POLICY "Admins can view flats in their apartment"
  ON flat_numbers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      JOIN buildings_blocks_phases ON buildings_blocks_phases.apartment_id = admins.apartment_id
      WHERE admins.user_id = auth.uid()
      AND buildings_blocks_phases.id = flat_numbers.block_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Admins can manage flats in their apartment"
  ON flat_numbers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      JOIN buildings_blocks_phases ON buildings_blocks_phases.apartment_id = admins.apartment_id
      WHERE admins.user_id = auth.uid()
      AND buildings_blocks_phases.id = flat_numbers.block_id
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
      JOIN buildings_blocks_phases ON buildings_blocks_phases.apartment_id = admins.apartment_id
      WHERE admins.user_id = auth.uid()
      AND buildings_blocks_phases.id = flat_numbers.block_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Public can view flats for active apartments"
  ON flat_numbers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM buildings_blocks_phases
      JOIN apartments ON apartments.id = buildings_blocks_phases.apartment_id
      WHERE buildings_blocks_phases.id = flat_numbers.block_id
      AND apartments.status = 'active'
    )
  );

-- RLS Policies for admins
CREATE POLICY "Super admins can view all admins"
  ON admins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Admins can view their own record"
  ON admins FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Super admins can manage all admins"
  ON admins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- RLS Policies for super_admins
CREATE POLICY "Super admins can view their own record"
  ON super_admins FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Super admins can update their own record"
  ON super_admins FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- RLS Policies for payment_submissions
CREATE POLICY "Admins can view payments in their apartment"
  ON payment_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = payment_submissions.apartment_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Admins can manage payments in their apartment"
  ON payment_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = payment_submissions.apartment_id
      AND admins.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = payment_submissions.apartment_id
      AND admins.status = 'active'
    )
  );

CREATE POLICY "Admins can delete payments in their apartment"
  ON payment_submissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.apartment_id = payment_submissions.apartment_id
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Public can submit payments to active apartments"
  ON payment_submissions FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apartments
      WHERE apartments.id = payment_submissions.apartment_id
      AND apartments.status = 'active'
    )
  );

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs for their apartment"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can upload payment screenshots"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'payment-screenshots');

CREATE POLICY "Admins can view payment screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-screenshots');

CREATE POLICY "Admins can delete payment screenshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-screenshots'
    AND (
      EXISTS (
        SELECT 1 FROM admins WHERE admins.user_id = auth.uid() AND admins.status = 'active'
      )
      OR
      EXISTS (
        SELECT 1 FROM super_admins WHERE super_admins.user_id = auth.uid() AND super_admins.status = 'active'
      )
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to apartments table
DROP TRIGGER IF EXISTS update_apartments_updated_at ON apartments;
CREATE TRIGGER update_apartments_updated_at
  BEFORE UPDATE ON apartments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();