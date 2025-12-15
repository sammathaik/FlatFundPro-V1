# Payment Image Validation Guide

## Current Implementation
The PaymentForm currently validates:
- File type: JPG, PNG, PDF only
- File size: Max 10MB

## Enhanced Validation Strategies

### 1. Client-Side Image Preview & Validation
**Benefits:** Immediate feedback, better UX
**Limitations:** Can be bypassed by tech-savvy users

```typescript
// Add to PaymentForm.tsx
const [imagePreview, setImagePreview] = useState<string | null>(null);

const validateImageFile = async (file: File): Promise<boolean> => {
  // Check file type by MIME
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, and PDF files are allowed');
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB');
  }

  // For images, verify it's actually an image by loading it
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        // Check minimum dimensions (e.g., 200x200)
        if (img.width < 200 || img.height < 200) {
          URL.revokeObjectURL(url);
          reject(new Error('Image too small. Minimum 200x200 pixels required'));
          return;
        }

        // Check maximum dimensions to prevent huge images
        if (img.width > 5000 || img.height > 5000) {
          URL.revokeObjectURL(url);
          reject(new Error('Image too large. Maximum 5000x5000 pixels'));
          return;
        }

        URL.revokeObjectURL(url);
        resolve(true);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Invalid image file'));
      };

      img.src = url;
    });
  }

  return true;
};

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0] || null;

  if (!file) {
    setFormData(prev => ({ ...prev, screenshot: null }));
    setImagePreview(null);
    return;
  }

  try {
    await validateImageFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null); // PDF - no preview
    }

    setFormData(prev => ({ ...prev, screenshot: file }));
    if (errors.screenshot) {
      setErrors(prev => ({ ...prev, screenshot: undefined }));
    }
  } catch (error) {
    setErrors(prev => ({
      ...prev,
      screenshot: error instanceof Error ? error.message : 'Invalid file'
    }));
    setFormData(prev => ({ ...prev, screenshot: null }));
    setImagePreview(null);
  }
};

// Add preview to JSX (after file input):
{imagePreview && (
  <div className="mt-4">
    <p className="text-sm font-semibold text-gray-700 mb-2">Preview:</p>
    <img
      src={imagePreview}
      alt="Payment screenshot preview"
      className="max-w-full h-auto max-h-64 rounded-lg border-2 border-gray-200"
    />
  </div>
)}
```

### 2. Server-Side Validation (Edge Function)
**Benefits:** Cannot be bypassed, more secure
**Implementation:** Validate on upload to Supabase Storage

```typescript
// Create: supabase/functions/validate-payment-image/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type by checking magic numbers (file signature)
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check file signatures (magic numbers)
    const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    const isPDF = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;

    if (!isJPEG && !isPNG && !isPDF) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Only JPG, PNG, and PDF allowed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum 10MB allowed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For images, you could also use Deno's image libraries to check dimensions
    // Or use AI models to verify it looks like a payment screenshot

    return new Response(
      JSON.stringify({
        valid: true,
        fileType: isJPEG ? "jpeg" : isPNG ? "png" : "pdf",
        fileSize: file.size
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Validation failed", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 3. Storage Bucket Policies (Supabase)
**Benefits:** Automatic enforcement at storage level

```sql
-- Apply this migration to restrict storage uploads
-- File: supabase/migrations/YYYYMMDDHHMMSS_configure_payment_screenshots_storage.sql

-- Configure storage bucket with size limits
UPDATE storage.buckets
SET
  file_size_limit = 10485760, -- 10MB in bytes
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf']
WHERE id = 'payment-screenshots';

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can upload to payment-screenshots (public form)
CREATE POLICY "Anyone can upload payment screenshots"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'payment-screenshots'
  AND (storage.foldername(name))[1] = 'public'
);

-- Policy: Only authenticated admins can delete
CREATE POLICY "Only admins can delete payment screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND EXISTS (
    SELECT 1 FROM apartments_admin
    WHERE auth.uid() = user_id
  )
);
```

### 4. AI-Powered Validation (Advanced)
**Benefits:** Can detect if image actually contains payment info
**Note:** Requires external API or Supabase AI features

```typescript
// Example using Supabase AI (if available)
const validatePaymentScreenshot = async (imageUrl: string) => {
  const model = new Supabase.ai.Session('vision-model');

  const prompt = `
    Analyze this image and determine if it appears to be a valid payment screenshot.
    Look for: transaction IDs, payment amounts, dates, bank/UPI logos.
    Respond with: {"isValid": true/false, "confidence": 0-100, "reason": "explanation"}
  `;

  const result = await model.run(imageUrl, { prompt });
  return result;
};

// Or use external service like OpenAI Vision API, Google Vision API, etc.
```

### 5. Manual Admin Review Workflow
**Benefits:** Human verification, catches everything
**Implementation:** Already exists via admin dashboard

The current system stores uploads and admins review them manually in the dashboard.
This is actually the most reliable method for catching fake submissions.

## Recommended Implementation

For best results, use a **layered approach**:

1. ✅ **Client-side**: Image preview + dimension checks (UX)
2. ✅ **File type**: Check magic numbers, not just extensions
3. ✅ **Storage policies**: Enforce at bucket level
4. ✅ **Admin review**: Manual verification (already implemented)
5. 🔄 **Optional**: AI validation for automated pre-screening

## Quick Win: Add Image Preview

The easiest and most effective improvement is adding an image preview so users can verify they selected the right file before submitting.

## Implementation Priority

1. **Now**: Add image preview (improves UX immediately)
2. **Soon**: Add dimension validation (prevents tiny/huge images)
3. **Later**: Add Edge Function validation (if bypassing becomes an issue)
4. **Optional**: Add AI validation (if manual review becomes bottleneck)

The current manual admin review process is actually quite effective. Most fraudulent submissions will be caught during review since admins can see the actual payment details.
