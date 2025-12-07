/*
  # Add Comments Column to Payment Submissions

  1. Changes
    - Add `comments` column to payment_submissions table
    - Text field for admin notes/comments about the payment
    - To be populated by backend workflow from image analysis
    - `transaction_reference` already exists from previous migration
  
  2. Purpose
    - Backend workflow placeholder for extracted information from uploaded images
    - Admins can view/edit comments about payments
    - No user-facing form field required
  
  3. Security
    - All existing RLS policies remain unchanged
    - Comments follow same security model as other payment fields
*/

-- Add comments column to payment_submissions table
DO $$
BEGIN
  -- Add comments column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_submissions' AND column_name = 'comments'
  ) THEN
    ALTER TABLE payment_submissions ADD COLUMN comments text;
  END IF;
END $$;

-- Add index for searching comments
CREATE INDEX IF NOT EXISTS idx_payment_submissions_comments ON payment_submissions USING gin(to_tsvector('english', comments));

-- Add helpful comment
COMMENT ON COLUMN payment_submissions.comments IS 'Admin comments or notes about the payment. Populated by backend workflow from image analysis or manual entry.';