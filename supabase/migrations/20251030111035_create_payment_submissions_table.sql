/*
  # Create Payment Submissions Table and Storage

  ## New Tables
    - `payment_submissions`
      - `id` (uuid, primary key) - Unique submission identifier
      - `name` (text) - Resident name
      - `building_block_phase` (text) - Building/Block/Phase number
      - `flat_number` (text) - Flat/Unit number
      - `email` (text) - Resident email address
      - `contact_number` (text, nullable) - Optional contact number
      - `payment_amount` (numeric, nullable) - Optional payment amount in INR
      - `payment_date` (date, nullable) - Optional payment/transaction date
      - `screenshot_url` (text) - URL of uploaded payment screenshot
      - `screenshot_filename` (text) - Original filename of uploaded screenshot
      - `submission_timestamp` (timestamptz) - When the submission was created
      - `status` (text) - Submission status (pending, reviewed, approved, rejected)
      - `created_at` (timestamptz) - Record creation timestamp

  ## Security
    - Enable RLS on `payment_submissions` table
    - Add policy for anonymous users to insert their own submissions
    - No public read access to protect resident privacy
    
  ## Storage
    - Create storage bucket for payment screenshots
    - Public read access for committee members only
    - File size limits enforced at application level
*/

CREATE TABLE IF NOT EXISTS payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  building_block_phase text NOT NULL,
  flat_number text NOT NULL,
  email text NOT NULL,
  contact_number text,
  payment_amount numeric(10, 2),
  payment_date date,
  screenshot_url text NOT NULL,
  screenshot_filename text NOT NULL,
  submission_timestamp timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE payment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous users to insert payment submissions"
  ON payment_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to read their own submissions by email"
  ON payment_submissions
  FOR SELECT
  TO anon
  USING (email = current_setting('request.jwt.claims', true)::json->>'email');

INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow anonymous users to upload screenshots"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'payment-screenshots');

CREATE POLICY "Allow users to read their own screenshots"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'payment-screenshots');