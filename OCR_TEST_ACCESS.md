# OCR Testing Page - Quick Access Guide

## How to Access

The OCR testing page is now available without login at:

```
http://localhost:5173/ocr-test
```

## Steps to Use

1. **Open your browser** and navigate to `http://localhost:5173/ocr-test`

2. **Enter a test name** (e.g., "PhonePe Screenshot Test")

3. **Upload a payment screenshot**:
   - Click on the upload area
   - Select an image file (PNG, JPG, JPEG)
   - You'll see a preview of the image

4. **Click "Run OCR Comparison Test"**
   - The system will upload the image
   - Both Google Vision API and Tesseract OCR will analyze it
   - Results will show:
     - Which OCR performed better
     - Extracted text from both engines
     - Fraud signals detected (amount, transaction ref, date, etc.)
     - Processing time for each engine
     - Confidence scores

## What You'll See

- **Winner Badge**: Shows which OCR engine performed better
- **Fraud Risk Level**: NONE, LOW, MEDIUM, or HIGH based on detected signals
- **Google Vision Results**: Text extraction with confidence score
- **Tesseract Results**: Text extraction with confidence score
- **Fraud Signals**: Checkmarks for detected elements (amount, transaction ref, date, etc.)
- **Raw Text**: Full extracted text from both engines

## Test History

- Click "Show History" to see previous test results
- Results are stored in the database with:
  - Test name
  - Timestamp
  - Winner
  - Confidence scores
  - Fraud risk level

## Troubleshooting

If you see any errors:

1. **Check the browser console** (F12 → Console tab)
2. **Verify environment variables** are set in `.env` file
3. **Ensure the dev server is running** at `http://localhost:5173`
4. **Check if Google Vision API key is configured** (optional - Tesseract will still work)

## Features Being Tested

- **Google Vision API**: Cloud-based OCR with high accuracy
- **Tesseract OCR**: Open-source OCR running in edge function
- **Fraud Detection**: Pattern matching for payment elements
- **Performance**: Speed comparison between engines
- **Quality**: Confidence score comparison
