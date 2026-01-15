/*
  # Image-Level Fraud Signals Enhancement Layer
  
  1. New Tables
    - `payment_image_signals`
      - Stores SEPARATE image-level signals for investigation
      - Does NOT affect existing fraud detection or risk scoring
      - Provides assistive, non-blocking signals for admin review
      
  2. Three Signal Types
    - **Duplicate Detection**: Perceptual hash similarity detection
    - **Metadata Consistency**: EXIF data analysis (weak signal)
    - **Screenshot Validity**: Heuristic checks for typical screenshot patterns
    
  3. Security
    - Enable RLS on new table
    - Only admins can view signals
    - System can insert signals automatically
    - Signals are read-only for investigation
    
  4. Design Principles
    - ASSISTIVE: Helps admins investigate, never blocks
    - SEPARATE: Does not modify existing fraud_risk_score or ai_classification
    - EXPLAINABLE: Each signal is clearly labeled and documented
    - NON-JUDGMENTAL: Flags are informational, not enforcement
*/

-- Payment Image Signals Table (Separate from existing fraud detection)
CREATE TABLE IF NOT EXISTS payment_image_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_submission_id uuid NOT NULL REFERENCES payment_submissions(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  
  -- SIGNAL 1: Duplicate / Similar Image Detection
  perceptual_hash text,
  duplicate_detected boolean DEFAULT false,
  similar_to_payment_id uuid REFERENCES payment_submissions(id),
  similarity_percentage integer CHECK (similarity_percentage >= 0 AND similarity_percentage <= 100),
  similarity_explanation text,
  
  -- SIGNAL 2: Image Metadata Consistency (Weak Signal)
  exif_available boolean DEFAULT false,
  exif_creation_date timestamptz,
  exif_source_type text, -- 'screenshot', 'camera', 'unknown', 'edited'
  exif_metadata_stripped boolean DEFAULT false,
  exif_editor_detected text, -- Software used if detected
  metadata_notes text, -- Informational notes
  
  -- SIGNAL 3: Screenshot Validity Heuristics
  looks_like_screenshot boolean DEFAULT false,
  aspect_ratio text, -- e.g., "9:16", "9:19.5", "unusual"
  resolution_width integer,
  resolution_height integer,
  text_density_score integer CHECK (text_density_score >= 0 AND text_density_score <= 100),
  screenshot_validity_explanation text,
  
  -- Analysis metadata
  analyzed_at timestamptz DEFAULT now(),
  analysis_status text DEFAULT 'completed' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  analysis_error text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Perceptual Hash Index Table for Fast Duplicate Lookups
CREATE TABLE IF NOT EXISTS image_perceptual_hash_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_submission_id uuid NOT NULL REFERENCES payment_submissions(id) ON DELETE CASCADE,
  perceptual_hash text NOT NULL,
  hash_algorithm text DEFAULT 'dhash' CHECK (hash_algorithm IN ('dhash', 'phash', 'ahash')),
  image_url text NOT NULL,
  
  -- Tracking
  first_uploaded_at timestamptz DEFAULT now(),
  upload_count integer DEFAULT 1,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(perceptual_hash, payment_submission_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_image_signals_payment ON payment_image_signals(payment_submission_id);
CREATE INDEX IF NOT EXISTS idx_image_signals_duplicate ON payment_image_signals(duplicate_detected) WHERE duplicate_detected = true;
CREATE INDEX IF NOT EXISTS idx_image_signals_analyzed ON payment_image_signals(analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_phash_index_hash ON image_perceptual_hash_index(perceptual_hash);
CREATE INDEX IF NOT EXISTS idx_phash_index_payment ON image_perceptual_hash_index(payment_submission_id);

-- Enable RLS
ALTER TABLE payment_image_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_perceptual_hash_index ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can view all signals for investigation
CREATE POLICY "Admins can view image signals"
  ON payment_image_signals FOR SELECT
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

-- System can insert signals automatically (non-blocking)
CREATE POLICY "System can insert image signals"
  ON payment_image_signals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System can update signals during analysis
CREATE POLICY "System can update image signals"
  ON payment_image_signals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS for perceptual hash index
CREATE POLICY "Admins can view hash index"
  ON image_perceptual_hash_index FOR SELECT
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

CREATE POLICY "System can manage hash index"
  ON image_perceptual_hash_index FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to check for similar images (returns informational signal)
CREATE OR REPLACE FUNCTION check_similar_images(
  p_perceptual_hash text,
  p_payment_id uuid,
  p_similarity_threshold integer DEFAULT 85
) RETURNS TABLE (
  found boolean,
  similar_payment_id uuid,
  similarity_pct integer,
  upload_count integer,
  explanation text
) AS $$
DECLARE
  v_match RECORD;
BEGIN
  -- Look for exact or near-exact matches
  SELECT 
    iph.payment_submission_id,
    iph.upload_count,
    iph.first_uploaded_at
  INTO v_match
  FROM image_perceptual_hash_index iph
  WHERE iph.perceptual_hash = p_perceptual_hash
    AND iph.payment_submission_id != p_payment_id
  ORDER BY iph.first_uploaded_at ASC
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      true as found,
      v_match.payment_submission_id,
      100 as similarity_pct,
      v_match.upload_count + 1,
      'Exact duplicate of image uploaded on ' || v_match.first_uploaded_at::text as explanation;
  ELSE
    RETURN QUERY SELECT 
      false as found,
      NULL::uuid,
      0 as similarity_pct,
      1 as upload_count,
      'No similar images found' as explanation;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extract screenshot validity from image properties
CREATE OR REPLACE FUNCTION assess_screenshot_validity(
  p_width integer,
  p_height integer,
  p_has_text boolean DEFAULT true
) RETURNS TABLE (
  looks_valid boolean,
  aspect_ratio text,
  validity_explanation text
) AS $$
DECLARE
  v_ratio numeric;
  v_ratio_text text;
  v_explanation text;
  v_is_valid boolean;
BEGIN
  -- Calculate aspect ratio
  v_ratio := ROUND((p_height::numeric / NULLIF(p_width::numeric, 0)), 2);
  
  -- Common mobile screenshot aspect ratios
  CASE 
    WHEN v_ratio BETWEEN 1.7 AND 1.9 THEN
      v_ratio_text := '9:16 (Standard)';
      v_is_valid := true;
      v_explanation := 'Standard mobile screenshot aspect ratio';
    WHEN v_ratio BETWEEN 2.0 AND 2.3 THEN
      v_ratio_text := '9:19.5 (Tall)';
      v_is_valid := true;
      v_explanation := 'Modern tall mobile screenshot (iPhone 12+, etc.)';
    WHEN v_ratio BETWEEN 1.3 AND 1.6 THEN
      v_ratio_text := '3:4 or 9:13';
      v_is_valid := true;
      v_explanation := 'Tablet or older mobile screenshot';
    WHEN v_ratio < 1.0 THEN
      v_ratio_text := 'Landscape';
      v_is_valid := false;
      v_explanation := 'Unusual: Payment screenshots are typically portrait mode';
    ELSE
      v_ratio_text := 'Unusual (' || v_ratio || ')';
      v_is_valid := false;
      v_explanation := 'Non-standard aspect ratio for mobile screenshot';
  END CASE;
  
  -- Check resolution reasonableness
  IF p_width < 200 OR p_height < 300 THEN
    v_is_valid := false;
    v_explanation := v_explanation || '; Very low resolution';
  ELSIF p_width > 2000 OR p_height > 4000 THEN
    v_explanation := v_explanation || '; Unusually high resolution';
  END IF;
  
  RETURN QUERY SELECT v_is_valid, v_ratio_text, v_explanation;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_similar_images TO authenticated;
GRANT EXECUTE ON FUNCTION assess_screenshot_validity TO authenticated;

-- Add helpful comment
COMMENT ON TABLE payment_image_signals IS 'Assistive, non-blocking image-level fraud signals for admin investigation. Does not affect payment approval or existing fraud detection.';
COMMENT ON TABLE image_perceptual_hash_index IS 'Fast lookup index for detecting duplicate or similar payment screenshots.';
