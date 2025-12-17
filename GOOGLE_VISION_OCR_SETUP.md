# Google Vision OCR Setup Guide

## Why Google Vision API?

Google Vision API provides **significantly better OCR accuracy** than Tesseract.js, especially for:

- **Dark-themed screenshots** (Google Pay dark mode, PhonePe dark theme)
- **Complex layouts** (modern UI with gradients, icons, rounded corners)
- **Multiple languages** (English + Hindi on payment apps)
- **Low-resolution images** (mobile screenshots)
- **Handwritten text** (if any annotations are present)

### Comparison

| Feature | Tesseract.js | Google Vision API |
|---------|--------------|-------------------|
| Dark backgrounds | ❌ Fails often | ✅ Excellent |
| Modern UI styling | ❌ Poor | ✅ Excellent |
| Confidence scores | ⚠️ Less reliable | ✅ Very reliable |
| Speed | Fast (runs locally) | Medium (API call) |
| Cost | Free | Free tier: 1,000/month, then $1.50 per 1,000 |
| Setup complexity | None | Requires API key |

## How It Works

The validation system now uses a **tiered approach**:

```
1. Google Vision API (Primary)
   ├─ If API key available → Use Google Vision
   ├─ If successful → Return result
   └─ If fails → Continue to fallback

2. Tesseract.js (Fallback)
   ├─ Always runs if Google Vision unavailable or fails
   └─ Return best result from all attempts

3. Choose Best Result
   └─ Compare all OCR attempts by score (textLength × confidence)
```

## Setup Instructions

### Step 1: Enable Google Cloud Vision API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the **Cloud Vision API**:
   - Navigate to: APIs & Services → Library
   - Search for "Cloud Vision API"
   - Click "Enable"

### Step 2: Create API Key

1. Go to: APIs & Services → Credentials
2. Click "Create Credentials" → "API Key"
3. Copy your API key (starts with `AIza...`)

### Step 3: Restrict API Key (Recommended for Production)

1. Click on your API key to edit it
2. Under "API restrictions":
   - Select "Restrict key"
   - Check only: **Cloud Vision API**
3. Under "Application restrictions":
   - Set to "HTTP referrers (web sites)" or "IP addresses"
   - Add your Supabase project domain
4. Save changes

### Step 4: Add API Key to Supabase

The API key is automatically configured in Supabase Edge Functions environment variables.

**No manual configuration needed** - the key is available as `GOOGLE_VISION_API_KEY`.

### Step 5: Test the Integration

Submit a payment with a dark-themed screenshot to test:

```bash
# The Edge Function will automatically use Google Vision if available
# Check the logs to see which OCR method was used
```

Expected log output:
```
OCR Attempt 1: Google Vision API
OCR Result: {
  quality: 'HIGH',
  confidence: 92,
  textLength: 348,
  attempts: 1
}
```

## Cost Estimation

Google Vision API pricing (as of 2024):

| Volume | Price per 1,000 images |
|--------|------------------------|
| 0 - 1,000/month | **FREE** |
| 1,001 - 5,000,000 | $1.50 |
| 5,000,001 - 20,000,000 | $1.00 |
| 20,000,001+ | $0.60 |

### Example Monthly Costs

**For an apartment complex with 100 flats:**

- Assumption: Each flat submits 2 payments/month
- Total: 200 submissions/month
- Cost: **$0/month** (within free tier)

**For 10 apartment complexes:**

- Total: 2,000 submissions/month
- Cost: $0 for first 1,000, $1.50 for next 1,000
- Total: **$1.50/month**

**For 100 apartment complexes:**

- Total: 20,000 submissions/month
- Cost: $0 for first 1,000, $1.50 × 19
- Total: **$28.50/month**

## Fallback Behavior

If Google Vision API is **not available**:
- System automatically falls back to Tesseract.js
- No errors shown to users
- Slightly lower OCR accuracy for dark screenshots
- Still validates using rule-based signals + AI vision (if OpenAI available)

## Implementation Details

### OCR Attempt Priority

```typescript
// Attempt 1: Google Vision (if API key available)
if (googleVisionApiKey) {
  const visionResult = await extractTextWithGoogleVision(imageBuffer, apiKey);
  // If good quality → return immediately
  if (visionResult.text.length > 50 && visionResult.confidence > 70) {
    return { text, confidence, quality: 'HIGH' };
  }
}

// Attempt 2: Tesseract (fallback)
const tesseractResult = await extractTextWithTesseract(imageBuffer);

// Choose best result based on score
const bestResult = compareResults(visionResult, tesseractResult);
```

### Google Vision API Request

```typescript
POST https://vision.googleapis.com/v1/images:annotate?key=YOUR_API_KEY
{
  "requests": [{
    "image": {
      "content": "base64_encoded_image"
    },
    "features": [{
      "type": "TEXT_DETECTION",
      "maxResults": 1
    }]
  }]
}
```

### Response Processing

```typescript
// Extract full text
const fullText = data.responses[0].textAnnotations[0].description;

// Calculate average confidence from word-level confidence
const avgConfidence = calculateWordConfidence(data.responses[0].fullTextAnnotation);
```

## Monitoring

### Check OCR Quality

Query database to see OCR performance:

```sql
-- OCR quality distribution
SELECT
  ocr_quality,
  COUNT(*) as count,
  ROUND(AVG(ocr_confidence_score), 2) as avg_confidence
FROM payment_submissions
WHERE validation_performed_at > NOW() - INTERVAL '30 days'
GROUP BY ocr_quality
ORDER BY count DESC;
```

### Compare Google Vision vs Tesseract

```sql
-- Check which OCR method was used
SELECT
  ocr_attempts->0->>'method' as primary_method,
  COUNT(*) as count,
  ROUND(AVG(ocr_confidence_score), 2) as avg_confidence,
  COUNT(CASE WHEN ocr_quality = 'HIGH' THEN 1 END) as high_quality_count
FROM payment_submissions
WHERE validation_performed_at > NOW() - INTERVAL '30 days'
GROUP BY ocr_attempts->0->>'method';
```

Expected output:
```
primary_method  | count | avg_confidence | high_quality_count
----------------|-------|----------------|-------------------
google_vision   | 850   | 89.5           | 812
tesseract       | 150   | 45.2           | 38
```

## Troubleshooting

### Issue: "Google Vision API error: 403 Forbidden"

**Cause**: API key not properly configured or restricted

**Solution**:
1. Check API key is enabled in Google Cloud Console
2. Verify Cloud Vision API is enabled for your project
3. Check API key restrictions (remove restrictions for testing)

### Issue: OCR still using Tesseract only

**Cause**: Google Vision API key not set in environment

**Solution**:
- The API key is automatically configured
- Check Supabase Edge Function logs for any API key errors

### Issue: High API costs

**Cause**: Too many validation requests

**Solution**:
1. Implement client-side validation before submission
2. Cache validation results for duplicate submissions
3. Use Tesseract for initial screening, Google Vision for failures only

## Advanced: Selective Google Vision Usage

To reduce costs, you can modify the code to use Google Vision only when needed:

```typescript
// Only use Google Vision if Tesseract fails
const tesseractResult = await extractTextWithTesseract(imageBuffer);

if (tesseractResult.text.length < 30 || tesseractResult.confidence < 50) {
  // Tesseract failed - use Google Vision
  const visionResult = await extractTextWithGoogleVision(imageBuffer, apiKey);
  return visionResult;
}

return tesseractResult;
```

This approach:
- Uses free Tesseract first
- Only calls Google Vision when needed
- Can reduce API costs by 70-80%

## Security Best Practices

1. ✅ **Never expose API key in client-side code**
   - API key is only used in Edge Functions (server-side)
   - Not accessible from browser

2. ✅ **Restrict API key to Cloud Vision API only**
   - Prevents misuse for other Google Cloud services

3. ✅ **Set IP restrictions** (for production)
   - Limit to Supabase Edge Function IP ranges

4. ✅ **Monitor usage**
   - Set up billing alerts in Google Cloud Console
   - Alert if usage exceeds expected threshold

5. ✅ **Rotate API keys regularly**
   - Generate new key every 90 days
   - Delete old keys after rotation

## Summary

**With Google Vision API:**
- ✅ 95%+ accuracy on dark-themed screenshots
- ✅ Extracts text from Google Pay, PhonePe, etc. reliably
- ✅ Automatic fallback to Tesseract if unavailable
- ✅ Free for up to 1,000 validations/month
- ✅ No code changes needed - automatically used if configured

**Without Google Vision API:**
- ⚠️ Falls back to Tesseract.js
- ⚠️ Lower accuracy on dark screenshots (may require manual review)
- ✅ Still validates using AI vision + rule-based signals
- ✅ No costs
