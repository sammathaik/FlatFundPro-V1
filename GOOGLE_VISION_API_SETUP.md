# Google Vision API Setup for OCR Testing

## Current Status
- ✅ Storage bucket created
- ✅ Edge function deployed
- ❌ Google Vision API key not configured

## Why You're Getting "Forbidden" Error
The Google Vision API key (`GOOGLE_VISION_API_KEY`) is not configured in your Supabase project, causing the "Forbidden" error.

## Setup Steps

### 1. Get Google Vision API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Cloud Vision API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"
4. Create an API key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

### 2. Configure in Supabase

1. Open your Supabase project dashboard at: https://supabase.com/dashboard/project/rjiesmcmdfoavggkhasn
2. Navigate to **Settings** > **Edge Functions**
3. Add a new secret:
   - Name: `GOOGLE_VISION_API_KEY`
   - Value: [Your Google Vision API key]
4. Click "Save"

### 3. Test the OCR Feature

After configuring the API key:
1. Navigate to `/ocr-test` in your app
2. Upload a payment screenshot
3. Run the OCR test
4. You should see Google Vision extracting text successfully

## Note About Tesseract
Tesseract.js has been disabled because it requires Web Workers, which aren't supported in Deno Edge Functions. The OCR testing now relies solely on Google Vision API, which provides superior accuracy for payment screenshots.

## Cost Information
- Google Vision API offers **1,000 free requests per month**
- After that, pricing is approximately $1.50 per 1,000 images
- OCR testing is primarily for development/validation purposes

## Troubleshooting

### Still Getting "Forbidden" Error?
1. Verify the API key is correctly copied
2. Ensure Cloud Vision API is enabled in Google Cloud Console
3. Check that billing is enabled on your Google Cloud project (required even for free tier)

### API Key Not Working?
1. Restrict the API key to only the Vision API
2. Don't restrict by IP/referrer for Edge Functions
3. Try creating a new API key if issues persist
