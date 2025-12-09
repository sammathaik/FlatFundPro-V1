/*
  # Create Marketing Leads Table

  1. New Tables
    - `marketing_leads`
      - `id` (uuid, primary key)
      - `name` (text, required) - Lead's full name
      - `email` (text, required) - Lead's email address
      - `phone` (text, optional) - Contact phone number
      - `apartment_name` (text, required) - Name of their apartment society
      - `city` (text, required) - Location city
      - `message` (text, optional) - Additional message from lead
      - `status` (text, default 'new') - Lead status: new, contacted, qualified, converted
      - `created_at` (timestamptz) - Timestamp when lead was created
      - `updated_at` (timestamptz) - Last update timestamp
      - `notes` (text, optional) - Internal notes for follow-up

  2. Security
    - Enable RLS on `marketing_leads` table
    - Add policy for public to submit leads (INSERT only)
    - Add policy for Super Admin to view and manage leads
    - Add policy for Super Admin to update lead status

  3. Indexes
    - Index on email for quick lookups
    - Index on created_at for sorting
    - Index on status for filtering
*/

-- Create the marketing_leads table
CREATE TABLE IF NOT EXISTS marketing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  apartment_name text NOT NULL,
  city text NOT NULL,
  message text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketing_leads_email ON marketing_leads(email);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_created_at ON marketing_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON marketing_leads(status);

-- Policy: Allow anyone (including anonymous users) to insert leads
CREATE POLICY "Allow public to submit leads"
  ON marketing_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Super Admin can view all leads
CREATE POLICY "Super Admin can view all leads"
  ON marketing_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
    )
  );

-- Policy: Super Admin can update leads
CREATE POLICY "Super Admin can update leads"
  ON marketing_leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
    )
  );

-- Policy: Super Admin can delete leads
CREATE POLICY "Super Admin can delete leads"
  ON marketing_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketing_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_marketing_leads_updated_at ON marketing_leads;
CREATE TRIGGER trigger_update_marketing_leads_updated_at
  BEFORE UPDATE ON marketing_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_leads_updated_at();
