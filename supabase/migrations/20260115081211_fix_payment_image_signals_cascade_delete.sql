/*
  # Fix Cascade Delete for Payment Image Signals

  1. Problem
    - When deleting payment_submissions, the foreign key constraint on 
      payment_image_signals.similar_to_payment_id prevents deletion
    - This happens because the constraint doesn't have ON DELETE CASCADE

  2. Changes
    - Drop the existing foreign key constraint on similar_to_payment_id
    - Recreate it with ON DELETE CASCADE
    - This ensures that when a payment is deleted, related image signals are cleaned up automatically

  3. Security
    - No changes to RLS policies
    - Only modifying constraint behavior
*/

-- Drop the existing constraint
ALTER TABLE payment_image_signals 
DROP CONSTRAINT IF EXISTS payment_image_signals_similar_to_payment_id_fkey;

-- Recreate with ON DELETE CASCADE
ALTER TABLE payment_image_signals 
ADD CONSTRAINT payment_image_signals_similar_to_payment_id_fkey 
FOREIGN KEY (similar_to_payment_id) 
REFERENCES payment_submissions(id) 
ON DELETE CASCADE;
