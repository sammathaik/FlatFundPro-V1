/*
  # Add PDF Support to Payment Proofs Storage Bucket

  1. Storage Update
    - Updates `payment-proofs` bucket to accept PDF files
    - Adds `application/pdf` to allowed MIME types
    - Maintains existing image format support
  
  2. Supported File Types After Update
    - Images: JPEG, JPG, PNG, WebP
    - Documents: PDF
  
  3. Notes
    - Maximum file size remains 10MB
    - All existing security policies unchanged
    - Backward compatible with existing image uploads
    - Enables users to upload PDF payment confirmations from banks
*/

-- Update the payment-proofs bucket to allow PDF files
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf'
]
WHERE id = 'payment-proofs';
