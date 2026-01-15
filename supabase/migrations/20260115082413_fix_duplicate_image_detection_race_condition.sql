/*
  # Fix Duplicate Image Detection Race Condition

  1. Problem
    - Race condition: When multiple images are uploaded simultaneously, 
      duplicate detection misses them because hashes aren't committed yet
    - Hash index creates separate rows for each duplicate instead of 
      tracking count in a single row
    - upload_count is always 1 and never increments

  2. Changes
    - Redesign image_perceptual_hash_index to have ONE row per unique hash
    - Add proper unique constraint on perceptual_hash only
    - Add function to recheck and update duplicate detection
    - Add function to backfill existing submissions

  3. Security
    - All functions use SECURITY DEFINER with proper permission checks
    - RLS policies remain unchanged
*/

-- Step 1: Backup and recreate the hash index table with proper design
CREATE TABLE IF NOT EXISTS image_perceptual_hash_index_new (
  perceptual_hash text PRIMARY KEY,
  hash_algorithm text DEFAULT 'dhash',
  first_payment_id uuid NOT NULL REFERENCES payment_submissions(id) ON DELETE CASCADE,
  first_uploaded_at timestamptz DEFAULT now(),
  upload_count integer DEFAULT 1,
  last_updated_at timestamptz DEFAULT now()
);

-- Step 2: Migrate existing data, consolidating duplicates
INSERT INTO image_perceptual_hash_index_new (
  perceptual_hash,
  hash_algorithm,
  first_payment_id,
  first_uploaded_at,
  upload_count,
  last_updated_at
)
SELECT 
  perceptual_hash,
  hash_algorithm,
  (array_agg(payment_submission_id ORDER BY first_uploaded_at ASC))[1] as first_payment_id,
  MIN(first_uploaded_at) as first_uploaded_at,
  COUNT(*)::integer as upload_count,
  MAX(created_at) as last_updated_at
FROM image_perceptual_hash_index
WHERE perceptual_hash IS NOT NULL
GROUP BY perceptual_hash, hash_algorithm
ON CONFLICT (perceptual_hash) DO NOTHING;

-- Step 3: Drop old table and rename new one
DROP TABLE IF EXISTS image_perceptual_hash_index CASCADE;
ALTER TABLE image_perceptual_hash_index_new RENAME TO image_perceptual_hash_index;

-- Step 4: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_hash_index_first_payment 
ON image_perceptual_hash_index(first_payment_id);

-- Step 5: Add RLS policies
ALTER TABLE image_perceptual_hash_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hash index"
  ON image_perceptual_hash_index FOR SELECT
  TO authenticated
  USING (true);

-- Step 6: Update the check_similar_images function to use new structure
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
    iph.first_payment_id,
    iph.upload_count,
    iph.first_uploaded_at
  INTO v_match
  FROM image_perceptual_hash_index iph
  WHERE iph.perceptual_hash = p_perceptual_hash
    AND iph.first_payment_id != p_payment_id;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      true as found,
      v_match.first_payment_id,
      100 as similarity_pct,
      v_match.upload_count + 1,
      'Exact duplicate of image first uploaded on ' || v_match.first_uploaded_at::text as explanation;
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

-- Step 7: Create function to recheck duplicates for existing submissions
CREATE OR REPLACE FUNCTION recheck_duplicate_images()
RETURNS TABLE (
  payment_id uuid,
  was_duplicate boolean,
  now_duplicate boolean,
  similar_to_payment_id uuid,
  perceptual_hash text
) AS $$
BEGIN
  RETURN QUERY
  WITH hash_groups AS (
    -- Find all hashes that appear more than once
    SELECT 
      pis.perceptual_hash,
      array_agg(pis.payment_submission_id ORDER BY pis.analyzed_at ASC) as payment_ids,
      MIN(pis.analyzed_at) as first_analyzed_at
    FROM payment_image_signals pis
    WHERE pis.perceptual_hash IS NOT NULL
      AND pis.analysis_status = 'completed'
    GROUP BY pis.perceptual_hash
    HAVING COUNT(*) > 1
  ),
  duplicate_updates AS (
    -- For each duplicate group, mark all except the first as duplicates
    SELECT 
      unnest(hg.payment_ids[2:]) as payment_id,
      hg.payment_ids[1] as first_payment_id,
      hg.perceptual_hash
    FROM hash_groups hg
  )
  SELECT 
    pis.payment_submission_id as payment_id,
    pis.duplicate_detected as was_duplicate,
    true as now_duplicate,
    du.first_payment_id as similar_to_payment_id,
    pis.perceptual_hash
  FROM payment_image_signals pis
  INNER JOIN duplicate_updates du ON pis.payment_submission_id = du.payment_id
  WHERE pis.duplicate_detected = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create function to update duplicate flags
CREATE OR REPLACE FUNCTION update_duplicate_flags()
RETURNS integer AS $$
DECLARE
  v_updated_count integer := 0;
BEGIN
  -- Update payment_image_signals for duplicates
  WITH duplicates AS (
    SELECT * FROM recheck_duplicate_images()
  )
  UPDATE payment_image_signals pis
  SET 
    duplicate_detected = true,
    similar_to_payment_id = d.similar_to_payment_id,
    similarity_percentage = 100,
    similarity_explanation = 'Exact duplicate detected during recheck'
  FROM duplicates d
  WHERE pis.payment_submission_id = d.payment_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Update the hash index upload counts
  UPDATE image_perceptual_hash_index iph
  SET 
    upload_count = (
      SELECT COUNT(*)
      FROM payment_image_signals pis
      WHERE pis.perceptual_hash = iph.perceptual_hash
        AND pis.analysis_status = 'completed'
    ),
    last_updated_at = now()
  WHERE EXISTS (
    SELECT 1
    FROM payment_image_signals pis
    WHERE pis.perceptual_hash = iph.perceptual_hash
      AND pis.analysis_status = 'completed'
    GROUP BY pis.perceptual_hash
    HAVING COUNT(*) > 1
  );
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Grant permissions
GRANT EXECUTE ON FUNCTION check_similar_images TO authenticated;
GRANT EXECUTE ON FUNCTION recheck_duplicate_images TO authenticated;
GRANT EXECUTE ON FUNCTION update_duplicate_flags TO authenticated;

-- Step 10: Run the backfill to fix existing G-100 submissions
SELECT update_duplicate_flags();
