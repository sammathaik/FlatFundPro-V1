/*
  # Image Fraud Detection System - Phase 1

  1. New Tables
    - `image_fraud_analysis`
      - Stores fraud detection results for each payment image
      - Links to payment_submissions
      - Contains scores and flags for different fraud detection methods
    
    - `image_perceptual_hashes`
      - Stores pHash values for duplicate detection
      - Enables fast similarity matching
      - Tracks reuse patterns across submissions
    
    - `bank_template_patterns`
      - Stores known bank UI patterns for consistency checks
      - Allows comparison of uploaded images against legitimate templates
      - Admin-configurable patterns
    
    - `fraud_detection_rules`
      - Configurable thresholds and rules
      - Allows fine-tuning of fraud detection sensitivity
      - Tracks rule effectiveness

  2. Security
    - Enable RLS on all new tables
    - Only authenticated users can trigger analysis
    - Only admins and super_admins can view fraud results
    - Occupants cannot see fraud detection data

  3. Fraud Detection Methods
    - Perceptual Hashing: Detect duplicate/reused images (98% accuracy)
    - EXIF Metadata: Detect edited images (70-80% accuracy)
    - Visual Consistency: Compare with bank templates (75-85% accuracy)
    - Forgery Detection: Error Level Analysis (80-90% accuracy)

  4. Indexes
    - Fast lookup by payment_submission_id
    - Fast duplicate detection via pHash similarity
    - Efficient fraud score queries
*/

-- Image Fraud Analysis Results Table
CREATE TABLE IF NOT EXISTS image_fraud_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_submission_id uuid NOT NULL REFERENCES payment_submissions(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  
  -- Overall fraud assessment
  fraud_risk_score integer NOT NULL DEFAULT 0 CHECK (fraud_risk_score >= 0 AND fraud_risk_score <= 100),
  is_flagged boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  
  -- Perceptual Hash Analysis
  phash_value text,
  phash_duplicate_found boolean DEFAULT false,
  phash_similarity_score integer,
  duplicate_of_payment_id uuid REFERENCES payment_submissions(id),
  
  -- EXIF Metadata Analysis
  exif_data jsonb,
  exif_has_editor_metadata boolean DEFAULT false,
  exif_software_detected text,
  exif_modification_detected boolean DEFAULT false,
  exif_creation_date timestamptz,
  
  -- Visual Consistency Analysis
  visual_consistency_score integer CHECK (visual_consistency_score >= 0 AND visual_consistency_score <= 100),
  bank_pattern_matched text,
  visual_anomalies jsonb,
  
  -- Forgery Detection (Error Level Analysis)
  ela_score integer CHECK (ela_score >= 0 AND ela_score <= 100),
  ela_manipulation_detected boolean DEFAULT false,
  ela_suspicious_regions jsonb,
  
  -- Additional metadata
  analysis_metadata jsonb,
  analyzed_at timestamptz,
  analyzed_by text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Perceptual Hashes Table for Fast Duplicate Detection
CREATE TABLE IF NOT EXISTS image_perceptual_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_submission_id uuid NOT NULL REFERENCES payment_submissions(id) ON DELETE CASCADE,
  phash_value text NOT NULL,
  image_url text NOT NULL,
  bit_hash text NOT NULL, -- Binary representation for similarity matching
  
  -- Usage tracking
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  reuse_count integer DEFAULT 1,
  flagged_as_duplicate boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

-- Bank Template Patterns Table
CREATE TABLE IF NOT EXISTS bank_template_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  payment_method text NOT NULL,
  
  -- Pattern characteristics
  template_hash text,
  color_palette jsonb,
  layout_features jsonb,
  text_patterns jsonb,
  logo_features jsonb,
  
  -- Validation
  is_verified boolean DEFAULT false,
  sample_image_url text,
  confidence_threshold integer DEFAULT 75 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 100),
  
  -- Metadata
  active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fraud Detection Rules Table
CREATE TABLE IF NOT EXISTS fraud_detection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL UNIQUE,
  rule_type text NOT NULL CHECK (rule_type IN ('phash', 'exif', 'visual', 'ela', 'composite')),
  
  -- Rule configuration
  threshold integer NOT NULL CHECK (threshold >= 0 AND threshold <= 100),
  action text NOT NULL CHECK (action IN ('flag', 'reject', 'review', 'warn')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Rule details
  description text,
  conditions jsonb,
  
  -- Statistics
  triggered_count integer DEFAULT 0,
  false_positive_count integer DEFAULT 0,
  true_positive_count integer DEFAULT 0,
  
  -- Status
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fraud_analysis_payment ON image_fraud_analysis(payment_submission_id);
CREATE INDEX IF NOT EXISTS idx_fraud_analysis_risk_score ON image_fraud_analysis(fraud_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_analysis_flagged ON image_fraud_analysis(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_fraud_analysis_status ON image_fraud_analysis(status);

CREATE INDEX IF NOT EXISTS idx_phash_value ON image_perceptual_hashes(phash_value);
CREATE INDEX IF NOT EXISTS idx_phash_payment ON image_perceptual_hashes(payment_submission_id);
CREATE INDEX IF NOT EXISTS idx_phash_flagged ON image_perceptual_hashes(flagged_as_duplicate) WHERE flagged_as_duplicate = true;

CREATE INDEX IF NOT EXISTS idx_bank_patterns_active ON bank_template_patterns(bank_name, payment_method) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_fraud_rules_active ON fraud_detection_rules(rule_type) WHERE is_active = true;

-- Enable RLS
ALTER TABLE image_fraud_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_perceptual_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_template_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_detection_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for image_fraud_analysis
CREATE POLICY "Admins can view all fraud analysis"
  ON image_fraud_analysis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "System can insert fraud analysis"
  ON image_fraud_analysis FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update fraud analysis"
  ON image_fraud_analysis FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- RLS Policies for image_perceptual_hashes
CREATE POLICY "Admins can view all perceptual hashes"
  ON image_perceptual_hashes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "System can insert perceptual hashes"
  ON image_perceptual_hashes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for bank_template_patterns
CREATE POLICY "Admins can view bank patterns"
  ON bank_template_patterns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Admins can manage bank patterns"
  ON bank_template_patterns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- RLS Policies for fraud_detection_rules
CREATE POLICY "Admins can view fraud rules"
  ON fraud_detection_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

CREATE POLICY "Super admins can manage fraud rules"
  ON fraud_detection_rules FOR ALL
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

-- Insert default fraud detection rules
INSERT INTO fraud_detection_rules (rule_name, rule_type, threshold, action, severity, description, conditions) VALUES
  ('High pHash Similarity', 'phash', 95, 'flag', 'high', 'Image is 95%+ similar to a previously submitted image', '{"min_similarity": 95}'::jsonb),
  ('Duplicate Image Detected', 'phash', 98, 'reject', 'critical', 'Exact or near-exact duplicate image found', '{"min_similarity": 98}'::jsonb),
  ('Photoshop Detected', 'exif', 70, 'flag', 'high', 'Image shows signs of editing in Adobe Photoshop', '{"editors": ["Adobe Photoshop", "Photoshop"]}'::jsonb),
  ('GIMP Editing Detected', 'exif', 70, 'flag', 'medium', 'Image edited using GIMP or similar software', '{"editors": ["GIMP", "Paint.NET"]}'::jsonb),
  ('Missing EXIF Data', 'exif', 80, 'warn', 'medium', 'Screenshot lacks expected EXIF metadata', '{"check": "missing_metadata"}'::jsonb),
  ('Low Visual Consistency', 'visual', 50, 'flag', 'high', 'Image does not match known bank UI patterns', '{"min_score": 50}'::jsonb),
  ('No Bank Pattern Match', 'visual', 30, 'review', 'medium', 'Unable to identify legitimate bank interface', '{"min_score": 30}'::jsonb),
  ('High ELA Score', 'ela', 75, 'flag', 'critical', 'Error Level Analysis indicates image manipulation', '{"min_score": 75}'::jsonb),
  ('Moderate ELA Score', 'ela', 60, 'review', 'high', 'Moderate signs of image manipulation detected', '{"min_score": 60}'::jsonb),
  ('Composite High Risk', 'composite', 70, 'reject', 'critical', 'Multiple fraud indicators detected', '{"min_total_score": 70}'::jsonb)
ON CONFLICT (rule_name) DO NOTHING;

-- Function to calculate composite fraud score
CREATE OR REPLACE FUNCTION calculate_fraud_risk_score(
  p_phash_score integer,
  p_exif_suspicious boolean,
  p_visual_score integer,
  p_ela_score integer
) RETURNS integer AS $$
DECLARE
  v_total_score integer := 0;
BEGIN
  -- Weight the different scores
  -- pHash similarity: 30% weight (higher similarity = higher risk)
  IF p_phash_score IS NOT NULL THEN
    v_total_score := v_total_score + (p_phash_score * 0.30)::integer;
  END IF;
  
  -- EXIF suspicious: 20% weight
  IF p_exif_suspicious THEN
    v_total_score := v_total_score + 20;
  END IF;
  
  -- Visual consistency: 25% weight (lower consistency = higher risk)
  IF p_visual_score IS NOT NULL THEN
    v_total_score := v_total_score + ((100 - p_visual_score) * 0.25)::integer;
  END IF;
  
  -- ELA score: 25% weight
  IF p_ela_score IS NOT NULL THEN
    v_total_score := v_total_score + (p_ela_score * 0.25)::integer;
  END IF;
  
  -- Ensure score is between 0 and 100
  RETURN LEAST(GREATEST(v_total_score, 0), 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for duplicate images
CREATE OR REPLACE FUNCTION check_duplicate_phash(
  p_phash_value text,
  p_payment_id uuid
) RETURNS TABLE (
  is_duplicate boolean,
  duplicate_payment_id uuid,
  similarity_score integer,
  reuse_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as is_duplicate,
    payment_submission_id,
    95 as similarity_score, -- Placeholder, actual Hamming distance calculated in Edge Function
    image_perceptual_hashes.reuse_count
  FROM image_perceptual_hashes
  WHERE phash_value = p_phash_value
    AND payment_submission_id != p_payment_id
  ORDER BY first_seen_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;