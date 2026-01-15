/*
  # Fix insert_payment_submission Function - Add Missing Fields
  
  1. Problem
    - The insert_payment_submission function is missing fields needed by occupant portal
    - QuickPaymentModal cannot use the function due to missing: payment_source, transaction_reference, platform, status, comments
    
  2. Changes
    - Update function to accept all payment_submissions fields
    - Maintain backward compatibility with optional parameters
    
  3. Security
    - Function remains SECURITY DEFINER to bypass RLS
    - Validates apartment is active before insert
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS public.insert_payment_submission(uuid, text, uuid, uuid, text, text, text, text, numeric, date, text, text, uuid);

-- Create enhanced version with all fields
CREATE OR REPLACE FUNCTION public.insert_payment_submission(
  p_apartment_id uuid,
  p_name text,
  p_block_id uuid,
  p_flat_id uuid,
  p_email text,
  p_screenshot_url text,
  p_screenshot_filename text,
  p_contact_number text DEFAULT NULL,
  p_payment_amount numeric DEFAULT NULL,
  p_payment_date date DEFAULT NULL,
  p_payment_type text DEFAULT NULL,
  p_occupant_type text DEFAULT NULL,
  p_expected_collection_id uuid DEFAULT NULL,
  p_payment_source text DEFAULT NULL,
  p_transaction_reference text DEFAULT NULL,
  p_platform text DEFAULT NULL,
  p_status text DEFAULT 'Received',
  p_comments text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_is_active boolean;
BEGIN
  -- Validate apartment is active
  SELECT status = 'active' INTO v_is_active
  FROM apartments
  WHERE id = p_apartment_id;
  
  IF NOT COALESCE(v_is_active, false) THEN
    RAISE EXCEPTION 'Apartment is not active or does not exist';
  END IF;
  
  -- Insert the payment with all fields
  INSERT INTO payment_submissions (
    apartment_id,
    name,
    block_id,
    flat_id,
    email,
    contact_number,
    payment_amount,
    payment_date,
    payment_type,
    screenshot_url,
    screenshot_filename,
    occupant_type,
    expected_collection_id,
    payment_source,
    transaction_reference,
    platform,
    status,
    comments
  ) VALUES (
    p_apartment_id,
    p_name,
    p_block_id,
    p_flat_id,
    p_email,
    p_contact_number,
    p_payment_amount,
    p_payment_date,
    p_payment_type,
    p_screenshot_url,
    p_screenshot_filename,
    p_occupant_type,
    p_expected_collection_id,
    p_payment_source,
    p_transaction_reference,
    p_platform,
    p_status,
    p_comments
  )
  RETURNING id INTO v_payment_id;
  
  RETURN v_payment_id;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION insert_payment_submission TO anon;
GRANT EXECUTE ON FUNCTION insert_payment_submission TO authenticated;

COMMENT ON FUNCTION insert_payment_submission IS 
'Enhanced version: Securely insert payment submissions with all fields, bypassing RLS. Validates apartment is active.';
