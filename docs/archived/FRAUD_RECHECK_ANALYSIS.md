# Fraud Recheck Analysis and External OCR Workflow Assessment

## Current "Recheck Fraud" Functionality

### What It Does
When you click "Recheck Fraud" in the Payment Management page:

1. **Calls**: `manual_fraud_recheck(payment_id)` RPC function
2. **Location**: `src/components/admin/PaymentManagement.tsx:307`
3. **Database Function**: `supabase/migrations/20251228061940_enhance_fraud_detection_with_comments_analysis_v2.sql:284`

### Fields Analyzed (10 Rules)

The fraud detection analyzes **ALL** of these fields:

#### Text Fields:
1. **`other_text`** - OCR extracted text from payment screenshot
   - Checks for suspicious typos (e.g., "completeds", "successfuls")
   - Detects template text ("template", "mockup", "placeholder", "lorem ipsum")
   - **Points**: 15-25 based on severity

2. **`comments`** - Admin/user comments (NEW in latest version)
   - Checks for suspicious keywords ("fake", "test", "dummy", "sample")
   - Detects typos and template text
   - **Points**: 15-30 based on severity

3. **`transaction_reference`** - Transaction ID
   - Suspicious keywords detection
   - **Points**: 30 (CRITICAL)

4. **`sender_upi_id`** - UPI ID validation
   - Format validation (must match pattern)
   - Suspicious keywords
   - **Points**: 15-30

5. **`narration`** - Payment narration
   - Suspicious keywords
   - **Points**: 10 (MEDIUM)

6. **`bank_name`** - Bank name validation
   - Fake bank names ("xyz bank", "abc bank")
   - **Points**: 10 (MEDIUM)

7. **`payer_name`** - Payer name field
   - Currently analyzed for context

8. **`screenshot_source`** - Image metadata
   - Detects editing software (Photoshop, GIMP, Canva, Figma)
   - **Points**: 10 (MEDIUM)

#### Date Fields:
9. **`payment_date`**
   - Future dates (>1 day) → 40 points (CRITICAL)
   - Very old dates (>2 years) → 10 points (MEDIUM)

#### Confidence Score:
10. **`ocr_confidence_score`**
    - If < 40% → 10 points (MEDIUM)
    - Indicates poor quality or manipulated image

### Scoring System
- **Total Score**: 0-100 (capped at 100)
- **Flagged as Fraud**: Score >= 70
- **Result**: Updates `fraud_score`, `is_fraud_flagged`, `fraud_indicators`, `fraud_checked_at`

---

## Your Proposed Workflow Assessment

### What You Want To Do:
1. Check if `other_text` is NULL
2. If NULL → Duplicate record, delete original
3. External workflow re-extracts text from image
4. If invalid file → Update `other_text` and `comments` with error message
5. Rerun fraud detection

### Assessment: ❌ DON'T Delete and Recreate

**CRITICAL ISSUES with Delete/Recreate Approach:**

1. **Audit Trail Loss**
   - Lose `created_at` timestamp (when payment was originally submitted)
   - Lose `reviewed_at`, `reviewed_by` data
   - Lose historical fraud check data
   - Break audit log references

2. **Referential Integrity**
   - Other tables may reference this `payment_id`
   - Foreign key constraints could block deletion
   - Audit logs reference the record ID

3. **Data Integrity**
   - `updated_at` becomes meaningless
   - Can't track "when was OCR re-extracted"
   - Lose payment history

4. **Business Logic**
   - Payment status changes get lost
   - Admin reviews/approvals disappear
   - Comments and notes vanish

---

## Recommended Approach: UPDATE, Don't Delete

### Better Workflow Design

#### Step 1: Check for NULL or Low Confidence OCR
```sql
-- Find records needing OCR re-extraction
SELECT
  id,
  name,
  payment_amount,
  other_text,
  ocr_confidence_score,
  ocr_extracted_text,
  payment_proof_url
FROM payment_submissions
WHERE
  (other_text IS NULL OR other_text = '' OR ocr_confidence_score < 40)
  AND payment_proof_url IS NOT NULL
  AND status IN ('Received', 'Reviewed')
ORDER BY created_at DESC;
```

#### Step 2: External Workflow (Outside Web App)
Your external process should:

1. **Fetch record** with payment ID
2. **Download image** from storage using `payment_proof_url`
3. **Validate file format**
   - Check if valid image (PNG, JPG, JPEG, WebP)
   - Check file size and dimensions
   - Verify file is not corrupted

4. **Two Scenarios:**

   **A) Valid Image - Re-extract OCR:**
   ```sql
   -- Update with new OCR data
   UPDATE payment_submissions
   SET
     other_text = '[newly extracted text]',
     ocr_extracted_text = '[newly extracted text]',
     ocr_confidence_score = [new confidence score],
     ocr_quality_score = [quality score],
     updated_at = NOW(),
     -- Optional: Add a flag to track re-extraction
     comments = CASE
       WHEN comments IS NULL THEN 'OCR re-extracted on [date]'
       ELSE comments || E'\n\nOCR re-extracted on [date]'
     END
   WHERE id = '[payment_id]';
   ```

   **B) Invalid File:**
   ```sql
   -- Mark as invalid file
   UPDATE payment_submissions
   SET
     other_text = 'ERROR: Invalid file format or corrupted image',
     ocr_confidence_score = 0,
     ocr_quality_score = 0,
     validation_status = 'invalid_file',
     validation_reason = 'File format validation failed: [specific reason]',
     updated_at = NOW(),
     comments = CASE
       WHEN comments IS NULL THEN 'Invalid file detected during OCR re-extraction on [date]. Reason: [specific reason]'
       ELSE comments || E'\n\nInvalid file detected during OCR re-extraction on [date]. Reason: [specific reason]'
     END
   WHERE id = '[payment_id]';
   ```

#### Step 3: Automatic Fraud Re-check
**Good News**: The system ALREADY does this automatically!

From the trigger (line 235-281 in migration file):
```sql
CREATE OR REPLACE FUNCTION trigger_fraud_detection_on_text_update()
```

**This trigger automatically runs fraud detection when:**
- `other_text` changes
- `comments` changes
- `ocr_confidence_score` changes
- Any other fraud-relevant field changes

**So your workflow is simply:**
1. UPDATE the record with new OCR text
2. Fraud detection runs AUTOMATICALLY via trigger
3. No need to manually call "Recheck Fraud"

---

## Example: South Tower Flat S-102

**Note**: I couldn't find a record for "South Tower S-102" in the current database.

But let's create a hypothetical example using one of the existing records:

### Example with Existing Record (Meenakshi Residency)

**Record**: `name = 'MARYKUTTY MATHAI'`, `id = 'c9b11416-7bcd-4641-85c1-ce47f8dcec53'`

**Current State:**
- `other_text`: "From: Suryanarayanan, Subramanian, State Bank Of I..."
- `fraud_score`: 0
- `is_fraud_flagged`: false

**Scenario 1: If `other_text` was NULL**

Your external workflow would:
```sql
-- Step 1: Update with re-extracted text
UPDATE payment_submissions
SET
  other_text = 'State Bank of India. Transfer to Meenakshi Residency. Amount: Rs 2500. Date: 2024-12-15. Ref: SBI123456789',
  ocr_confidence_score = 85,
  ocr_quality_score = 90,
  comments = 'OCR re-extracted on 2024-12-29 using external workflow'
WHERE id = 'c9b11416-7bcd-4641-85c1-ce47f8dcec53';

-- Step 2: Trigger automatically runs fraud detection
-- No manual action needed!

-- Step 3: Query result
SELECT fraud_score, is_fraud_flagged, fraud_indicators
FROM payment_submissions
WHERE id = 'c9b11416-7bcd-4641-85c1-ce47f8dcec53';
```

**Scenario 2: If file was invalid**

```sql
-- Update with error message
UPDATE payment_submissions
SET
  other_text = 'ERROR: Invalid file format detected',
  ocr_confidence_score = 0,
  validation_status = 'invalid_file',
  validation_reason = 'File is not a valid image format. Expected: PNG, JPG, JPEG. Found: UNKNOWN',
  comments = 'Invalid file detected during OCR re-extraction on 2024-12-29. Unable to process image. Please request occupant to resubmit payment proof.'
WHERE id = 'c9b11416-7bcd-4641-85c1-ce47f8dcec53';

-- Trigger automatically runs fraud detection
-- This might flag it due to low confidence score (0)
```

---

## Implementation Recommendation

### Option 1: Simple SQL Script (Recommended for Testing)

Create a script that:
1. Queries records with NULL `other_text`
2. Fetches image from storage
3. Runs OCR extraction (external service)
4. Updates record with results
5. Trigger handles fraud detection automatically

### Option 2: Background Job / Scheduled Task

Create a cron job or scheduled task:
- Runs every hour/day
- Processes records with NULL or low-confidence OCR
- Updates records in batch
- Logs results to audit table

### Option 3: Manual Admin Action

Add a button in Payment Management:
- "Re-extract OCR" button next to "Recheck Fraud"
- Calls edge function to process single record
- Shows progress/result to admin
- Updates record and triggers fraud detection

---

## Field Dependencies

### Fields that Trigger Automatic Fraud Recheck:
When ANY of these change, fraud detection runs automatically:
- `transaction_reference`
- `sender_upi_id`
- `other_text` ← **YOUR FIELD**
- `comments` ← **YOUR ERROR MESSAGE FIELD**
- `bank_name`
- `payer_name`
- `narration`
- `screenshot_source`
- `payment_date`
- `ocr_confidence_score`

### Your Workflow Integration:
```
External OCR Process
    ↓
UPDATE other_text, comments, ocr_confidence_score
    ↓
Trigger: trigger_fraud_detection_on_text_update() [AUTOMATIC]
    ↓
Function: validate_payment_text_fields_from_values() [AUTOMATIC]
    ↓
Updates: fraud_score, is_fraud_flagged, fraud_indicators [AUTOMATIC]
    ↓
Result: Payment is analyzed with new OCR data
```

---

## Summary

### ✅ GOOD IDEAS:
1. External OCR re-extraction workflow
2. Updating `other_text` with extracted text
3. Updating `comments` with error messages for invalid files
4. Setting `ocr_confidence_score` based on quality

### ❌ BAD IDEAS:
1. Deleting and recreating records
2. Losing audit trail
3. Breaking referential integrity

### ✅ CORRECT APPROACH:
1. **UPDATE** existing records with new OCR data
2. Let the **automatic trigger** handle fraud detection
3. Use `comments` field to track re-extraction history
4. Maintain data integrity and audit trail

### Does This Enhancement Make Sense?
**YES**, but with the UPDATE approach, not delete/recreate:

**Benefits:**
- Improves data quality (better OCR extraction)
- Catches invalid file uploads
- Automatic fraud re-detection via trigger
- Maintains complete audit trail
- No manual "Recheck Fraud" needed

**Technical Fit:**
- System already has all hooks in place (trigger)
- Just UPDATE the fields, everything else is automatic
- External workflow can be separate process/script
- Clean separation of concerns

**Business Value:**
- Better fraud detection accuracy
- Identifies problematic submissions early
- Reduces manual admin work
- Improves payment processing quality
