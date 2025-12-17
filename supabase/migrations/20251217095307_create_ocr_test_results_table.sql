/*
  # Create OCR Test Results Table
  
  1. New Tables
    - `ocr_test_results`
      - `id` (uuid, primary key)
      - `test_name` (text) - name/description of the test
      - `image_url` (text) - URL of the uploaded test image
      - `file_type` (text) - type of file (jpg, png, etc)
      
      ## Google Vision Results
      - `google_vision_text` (text) - extracted text from Google Vision
      - `google_vision_confidence` (numeric) - confidence score
      - `google_vision_processing_time` (integer) - time in milliseconds
      - `google_vision_error` (text) - error message if any
      
      ## Tesseract Results
      - `tesseract_text` (text) - extracted text from Tesseract
      - `tesseract_confidence` (numeric) - confidence score
      - `tesseract_processing_time` (integer) - time in milliseconds
      - `tesseract_error` (text) - error message if any
      
      ## Fraud Detection Signals
      - `detected_amount` (numeric) - extracted amount
      - `detected_transaction_ref` (text) - extracted transaction reference
      - `detected_date` (text) - extracted date
      - `detected_payment_type` (text) - UPI/NEFT/IMPS etc
      - `detected_platform` (text) - PhonePe/GPay/Bank etc
      - `has_status_keyword` (boolean) - found payment success keywords
      - `has_payment_keyword` (boolean) - found payment method keywords
      - `has_bank_name` (boolean) - found bank name
      
      ## Comparison
      - `winner` (text) - which OCR performed better (google_vision/tesseract/tie)
      - `overall_confidence_score` (numeric) - final confidence score
      - `fraud_risk_level` (text) - HIGH/MEDIUM/LOW/NONE
      
      - `created_at` (timestamptz)
      - `created_by` (uuid) - user who ran the test
      
  2. Security
    - Enable RLS on `ocr_test_results` table
    - Allow authenticated users to insert their own test results
    - Allow users to view their own test results
    - Allow super admins to view all test results
*/

CREATE TABLE IF NOT EXISTS ocr_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name text NOT NULL,
  image_url text NOT NULL,
  file_type text NOT NULL,
  
  -- Google Vision Results
  google_vision_text text,
  google_vision_confidence numeric,
  google_vision_processing_time integer,
  google_vision_error text,
  
  -- Tesseract Results
  tesseract_text text,
  tesseract_confidence numeric,
  tesseract_processing_time integer,
  tesseract_error text,
  
  -- Fraud Detection Signals
  detected_amount numeric,
  detected_transaction_ref text,
  detected_date text,
  detected_payment_type text,
  detected_platform text,
  has_status_keyword boolean DEFAULT false,
  has_payment_keyword boolean DEFAULT false,
  has_bank_name boolean DEFAULT false,
  
  -- Comparison
  winner text CHECK (winner IN ('google_vision', 'tesseract', 'tie', 'both_failed')),
  overall_confidence_score numeric,
  fraud_risk_level text CHECK (fraud_risk_level IN ('NONE', 'LOW', 'MEDIUM', 'HIGH')),
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE ocr_test_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own test results
CREATE POLICY "Users can insert own OCR test results"
  ON ocr_test_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can view their own test results
CREATE POLICY "Users can view own OCR test results"
  ON ocr_test_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Policy: Super admins can view all test results
CREATE POLICY "Super admins can view all OCR test results"
  ON ocr_test_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ocr_test_results_created_by ON ocr_test_results(created_by);
CREATE INDEX IF NOT EXISTS idx_ocr_test_results_created_at ON ocr_test_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_test_results_winner ON ocr_test_results(winner);
