# OCR Testing Lab - Quick Start Guide

## Overview

I've created a complete OCR testing system that allows you to compare Google Vision API and Tesseract OCR side-by-side on payment screenshots. The system tests both OCR engines, extracts fraud signals, and stores results in a database for historical comparison.

## What Was Created

### 1. Database Table: `ocr_test_results`
- Stores detailed test results from both OCR engines
- Tracks processing time, confidence scores, extracted text
- Records fraud detection signals (amount, transaction ref, date, etc.)
- Maintains test history with winner determination

### 2. Edge Function: `test-ocr-comparison`
- Runs both Google Vision and Tesseract OCR in parallel
- Compares performance metrics (speed, accuracy, text length)
- Extracts payment signals (amount, transaction ref, date, payment type, platform)
- Calculates fraud risk level
- Stores results in database

### 3. React Component: `OCRTestingPage`
- Beautiful, modern UI for uploading and testing images
- Real-time results display with side-by-side comparison
- Visual confidence bars and fraud signal detection
- Test history viewer
- Extracted text preview for both engines

## How to Access

### URL to Test:
```
http://localhost:5173/ocr-test
```

Or after deployment:
```
https://your-domain.com/ocr-test
```

## How to Use

### Step 1: Login
You need to be logged in as an authenticated user (admin or super admin) to access the OCR testing page.

### Step 2: Navigate to OCR Test Page
- Go to: `/ocr-test`
- You'll see the "OCR Testing Lab" interface

### Step 3: Upload a Payment Screenshot
1. Enter a test name (e.g., "PhonePe Screenshot Test")
2. Click the upload area or drag & drop an image
3. Preview the image before testing

### Step 4: Run the Test
1. Click "Run OCR Comparison Test"
2. Wait for both OCR engines to process (typically 2-5 seconds)
3. View detailed results

## What You'll See in Results

### Comparison Metrics
- **Winner**: Which OCR performed better (Google Vision/Tesseract/Tie/Both Failed)
- **Fraud Risk Level**: NONE, LOW, MEDIUM, or HIGH
- **Processing Time**: How long each engine took (in milliseconds)
- **Confidence Score**: How confident each engine is (0-100%)
- **Text Length**: How many characters were extracted

### Fraud Detection Signals
- ✅ Amount Detected (with extracted value)
- ✅ Transaction Reference Detected (with ref number)
- ✅ Date Detected (with date)
- ✅ Status Keywords (PAID, SUCCESS, etc.)
- ✅ Payment Keywords (UPI, NEFT, etc.)
- ✅ Bank Name Detected
- Payment Type (UPI, NEFT, IMPS, RTGS)
- Platform (PhonePe, GPay, Paytm, Bank, etc.)

### Extracted Text
- Full text extracted by Google Vision
- Full text extracted by Tesseract
- Side-by-side comparison

### Test History
- View recent tests with results summary
- See which OCR won in each test
- Track fraud risk levels over time

## Test Scenarios to Try

### Scenario 1: High-Quality PhonePe Screenshot
- Use a clear, well-lit screenshot from PhonePe
- Expected: Both OCRs should perform well
- Google Vision typically wins with higher confidence

### Scenario 2: Low-Quality Bank Receipt
- Use a blurry or angled photo of a bank slip
- Expected: Google Vision typically performs better
- Tesseract may struggle with poor quality

### Scenario 3: UPI Screenshot with Hindi Text
- Use a screenshot with mixed English and Hindi
- Expected: Google Vision handles multilingual better
- Useful for testing Indian payment apps

### Scenario 4: Screenshot with Complex Layout
- Use a receipt with tables, logos, and formatting
- Expected: Tests OCR's ability to handle structure
- Compare text extraction quality

### Scenario 5: Edited/Fake Screenshot
- Use a screenshot that has been edited
- Expected: Should show lower fraud signal detection
- Useful for testing fraud detection logic

## Database Query to View All Tests

```sql
SELECT
  test_name,
  winner,
  overall_confidence_score,
  fraud_risk_level,
  google_vision_confidence,
  tesseract_confidence,
  google_vision_processing_time,
  tesseract_processing_time,
  detected_amount,
  detected_transaction_ref,
  created_at
FROM ocr_test_results
ORDER BY created_at DESC
LIMIT 20;
```

## API Endpoint Details

### Endpoint
```
POST /functions/v1/test-ocr-comparison
```

### Request Body
```json
{
  "test_name": "Test Name Here",
  "image_url": "https://...",
  "file_type": "image/jpeg"
}
```

### Response
```json
{
  "success": true,
  "test_id": "uuid",
  "results": {
    "google_vision": {
      "text": "...",
      "confidence": 95,
      "processing_time_ms": 1234,
      "error": null,
      "text_length": 500
    },
    "tesseract": {
      "text": "...",
      "confidence": 87,
      "processing_time_ms": 2345,
      "error": null,
      "text_length": 450
    },
    "fraud_signals": {
      "hasAmount": true,
      "extractedAmount": 5000,
      "hasTransactionRef": true,
      "extractedTransactionRef": "ABC123456789",
      ...
    },
    "comparison": {
      "winner": "google_vision",
      "overall_confidence": 95,
      "fraud_risk_level": "NONE"
    }
  }
}
```

## Performance Benchmarks (Typical)

| OCR Engine | Speed | Confidence | Text Quality |
|------------|-------|------------|--------------|
| Google Vision | 1-3s | 85-95% | Excellent |
| Tesseract | 2-5s | 70-85% | Good |

**Google Vision Advantages:**
- Better confidence scores
- Faster processing
- Better with poor quality images
- Better with non-English text
- More accurate with complex layouts

**Tesseract Advantages:**
- Free (no API costs)
- Works offline
- Good for simple, clean text
- No API key required

## Troubleshooting

### Error: "Missing authorization header"
- Make sure you're logged in
- Check that session token is valid

### Error: "Google Vision API key not configured"
- Google Vision will be skipped
- Only Tesseract will run
- Contact admin to configure API key

### Error: "Failed to fetch image"
- Check image URL is accessible
- Verify file was uploaded successfully
- Try a different image

### No text detected
- Image quality might be too poor
- Text might be too small
- Try with a clearer screenshot

## Tips for Best Results

1. **Use High-Quality Images**: Clear, well-lit, high-resolution
2. **Avoid Heavy Compression**: Use PNG or high-quality JPEG
3. **Proper Orientation**: Make sure text is upright
4. **Good Contrast**: Text should be clearly visible
5. **Full Screenshot**: Include all relevant payment details

## Next Steps

After testing, you can:
1. Compare performance metrics between OCR engines
2. Identify which works best for your specific use case
3. Optimize fraud detection patterns based on results
4. Train better extraction rules for payment data
5. Export test results for analysis

## Security Note

- All tests require authentication
- Users can only see their own test results
- Super admins can see all tests
- Test images are stored in Supabase Storage
- Results are stored in database with full audit trail
