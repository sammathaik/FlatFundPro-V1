/*
  # Fix Document Classification to Use other_text Field
  
  1. Problem
    - Classification system was checking ocr_text field
    - But AI-extracted text is stored in other_text field
    - This caused all classification buttons to be disabled
  
  2. Changes
    - Update trigger_document_classification() to check other_text instead of ocr_text
    - Update manually_classify_document() to use other_text instead of ocr_text
    - Both functions now correctly use the field where actual extracted text is stored
  
  3. Impact
    - Classification will now work for payments that have other_text populated
    - Admins can classify the 11 existing payments with extracted text
    - Automatic classification after fraud detection will work correctly
*/

-- Update the trigger function to use other_text instead of ocr_text
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
  -- Only proceed if fraud_checked_at was just updated and other_text exists
  IF NEW.fraud_checked_at IS DISTINCT FROM OLD.fraud_checked_at 
     AND NEW.other_text IS NOT NULL 
     AND LENGTH(NEW.other_text) > 10 THEN
    
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
      
      -- Prepare payload with other_text
      payload := jsonb_build_object(
        'payment_submission_id', NEW.id,
        'ocr_text', NEW.other_text  -- Send other_text as ocr_text parameter to edge function
      );
      
      -- Make async HTTP request to edge function
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

-- Update manual classification function to use other_text
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
  
  -- Check for other_text instead of ocr_text
  IF payment_record.other_text IS NULL OR LENGTH(payment_record.other_text) < 10 THEN
    RAISE EXCEPTION 'No extracted text available for classification. The payment must be analyzed first.';
  END IF;
  
  -- Get environment variables
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.supabase_service_key', true);
  function_url := supabase_url || '/functions/v1/classify-payment-document';
  
  -- Prepare payload with other_text
  payload := jsonb_build_object(
    'payment_submission_id', p_payment_id,
    'ocr_text', payment_record.other_text  -- Send other_text as ocr_text parameter
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

-- Update comments to reflect the change
COMMENT ON FUNCTION trigger_document_classification IS 
  'Automatically classifies payment documents using OpenAI after fraud detection completes. Uses other_text field. Non-blocking.';

COMMENT ON FUNCTION manually_classify_document IS 
  'Allows admins to manually trigger document classification for a specific payment submission. Uses other_text field for extracted text.';
