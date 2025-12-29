/*
  # Document Classification Trigger Integration

  1. Purpose
    - Automatically trigger document classification after fraud detection completes
    - Non-blocking: Classification runs in background after fraud check
    - Only classifies documents with OCR text available

  2. Trigger Logic
    - Fires AFTER UPDATE on payment_submissions
    - Only when fraud_checked_at is updated (fraud detection just completed)
    - Checks if OCR text exists
    - Calls classify-payment-document edge function asynchronously

  3. Important Notes
    - This trigger is informational only - if classification fails, payment is not affected
    - Classification results are visible to admins but don't block payment workflow
    - Admins get notified automatically for low-confidence classifications
*/

-- Create function to trigger document classification after fraud detection
CREATE OR REPLACE FUNCTION trigger_document_classification()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  function_url text;
  payload jsonb;
BEGIN
  -- Only proceed if fraud_checked_at was just updated and OCR text exists
  IF NEW.fraud_checked_at IS DISTINCT FROM OLD.fraud_checked_at 
     AND NEW.ocr_text IS NOT NULL 
     AND LENGTH(NEW.ocr_text) > 10 THEN
    
    -- Check if classification already exists
    IF NOT EXISTS (
      SELECT 1 FROM payment_document_classifications 
      WHERE payment_submission_id = NEW.id
    ) THEN
      
      -- Get environment variables
      supabase_url := current_setting('app.settings.supabase_url', true);
      service_role_key := current_setting('app.settings.supabase_service_key', true);
      
      -- Construct edge function URL
      function_url := supabase_url || '/functions/v1/classify-payment-document';
      
      -- Prepare payload
      payload := jsonb_build_object(
        'payment_submission_id', NEW.id,
        'ocr_text', NEW.ocr_text
      );
      
      -- Make async HTTP request to edge function
      -- Note: This uses pg_net extension for async HTTP requests
      -- If classification fails, it doesn't affect the payment submission
      BEGIN
        PERFORM net.http_post(
          url := function_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
          ),
          body := payload::text
        );
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the payment update
        RAISE WARNING 'Document classification request failed: %', SQLERRM;
      END;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on payment_submissions
DROP TRIGGER IF EXISTS after_fraud_detection_classify_document ON payment_submissions;
CREATE TRIGGER after_fraud_detection_classify_document
  AFTER UPDATE ON payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_document_classification();

-- Add comment to explain the trigger
COMMENT ON TRIGGER after_fraud_detection_classify_document ON payment_submissions IS 
  'Automatically classifies payment documents using OpenAI after fraud detection completes. Non-blocking.';

-- Create manual classification function for admins
CREATE OR REPLACE FUNCTION manually_classify_document(p_payment_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  payment_record record;
  supabase_url text;
  service_role_key text;
  function_url text;
  payload jsonb;
  result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active'
  ) AND NOT EXISTS (
    SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can manually trigger classification';
  END IF;
  
  -- Get payment submission
  SELECT * INTO payment_record 
  FROM payment_submissions 
  WHERE id = p_payment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment submission not found';
  END IF;
  
  IF payment_record.ocr_text IS NULL OR LENGTH(payment_record.ocr_text) < 10 THEN
    RAISE EXCEPTION 'No OCR text available for classification';
  END IF;
  
  -- Get environment variables
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.supabase_service_key', true);
  function_url := supabase_url || '/functions/v1/classify-payment-document';
  
  -- Prepare payload
  payload := jsonb_build_object(
    'payment_submission_id', p_payment_id,
    'ocr_text', payment_record.ocr_text
  );
  
  -- Make synchronous HTTP request
  SELECT content::jsonb INTO result
  FROM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload::text
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION manually_classify_document TO authenticated;

-- Add comment
COMMENT ON FUNCTION manually_classify_document IS 
  'Allows admins to manually trigger document classification for a specific payment submission';