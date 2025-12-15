# Fraud Detection Debug Analysis

## Issue Found

The fraud detection function is working correctly, but **the payment form is NOT populating the text fields** that fraud detection needs to analyze.

### Current State of Payment Submissions

Looking at payment ID: `0085b079-3db7-4386-9043-81d2dbc0c394`

```json
{
  "payment_date": "2025-10-23",
  "payment_amount": 16000,
  "transaction_reference": null,  ❌ EMPTY
  "sender_upi_id": null,          ❌ EMPTY
  "bank_name": null,              ❌ EMPTY
  "other_text": null,             ❌ EMPTY
  "payer_name": null,             ❌ EMPTY
  "narration": null,              ❌ EMPTY
  "screenshot_source": null       ❌ EMPTY
}
```

### What the Fraud Detection Checked

```
RULE_1_FUTURE_DATE: ✓ PASSED (2025-10-23 is not future relative to today 2025-12-15)
RULE_2_OLD_DATE: ✓ PASSED
RULE_3_SUSPICIOUS_TRANSACTION_ID: ⏭️ SKIPPED (field is null)
RULE_4_SUSPICIOUS_UPI_ID: ⏭️ SKIPPED (field is null)
RULE_5_TYPOS: ⏭️ SKIPPED (field is null)
RULE_6_NARRATION: ⏭️ SKIPPED (field is null)
RULE_7_BANK_NAME: ⏭️ SKIPPED (field is null)
RULE_8_SCREENSHOT_SOURCE: ⏭️ SKIPPED (field is null)

FINAL SCORE: 0/100 - NOT FLAGGED
```

### Why This Happens

The payment form (`EnhancedPaymentForm.tsx` or `DynamicPaymentForm.tsx`) is not extracting and storing text data from uploaded images. The form only stores:
- Basic user input (name, email, amount, date)
- Screenshot file (url and filename)

But it doesn't populate:
- `transaction_reference` (extracted from image)
- `sender_upi_id` (extracted from image)
- `bank_name` (extracted from image)
- `other_text` (all text from image)
- `payer_name` (extracted from image)

## Solution

### Option 1: Use OCR to Extract Text (Recommended)

The payment form needs to:
1. Accept image upload
2. Extract text using OCR (Tesseract.js or Cloud Vision API)
3. Parse extracted text for fields:
   - Transaction ID / UPI Ref
   - Sender UPI ID
   - Bank name
   - Payment amount (verify against user input)
   - Date (verify against user input)
4. Store ALL extracted text in the database fields

### Option 2: Manual Entry Fields (Temporary Workaround)

Add form fields where users manually enter:
- Transaction Reference Number
- Sender UPI ID
- Bank Name
- Narration

This way the fraud detection can validate the entered data.

### Option 3: Backend Processing (Current Edge Function)

The `analyze-payment-image` edge function should:
1. Be called AFTER image upload
2. Extract text from the image
3. Update the payment_submissions record with extracted fields
4. Then run fraud detection

## Test with Populated Fields

To prove fraud detection works, let me create a test payment with populated fields:
