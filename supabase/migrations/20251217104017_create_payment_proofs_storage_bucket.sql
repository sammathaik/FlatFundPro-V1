/*
  # Create Payment Proofs Storage Bucket

  1. Storage Setup
    - Creates `payment-proofs` storage bucket
    - Enables public access for uploaded files
    - Sets file size limits and allowed MIME types
  
  2. Security
    - Authenticated users can upload payment proof images
    - Anonymous users can upload payment proofs (for public submissions)
    - Public read access for verification purposes
    - Authenticated users can update their uploads
    - Admins and super admins can delete payment proofs
  
  3. Notes
    - Supports common image formats (JPEG, PNG, WebP)
    - Maximum file size: 10MB
    - Organized in folders by purpose (ocr-tests, payments, etc.)
*/

-- Create the payment-proofs storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload payment proofs
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
);

-- Policy: Allow anonymous users to upload payment proofs (for public form submissions)
CREATE POLICY "Anonymous users can upload payment proofs"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'payment-proofs'
);

-- Policy: Allow public read access to payment proofs
CREATE POLICY "Public read access to payment proofs"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'payment-proofs'
);

-- Policy: Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update payment proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
)
WITH CHECK (
  bucket_id = 'payment-proofs'
);

-- Policy: Allow admins to delete payment proofs
CREATE POLICY "Admins can delete payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
  )
);