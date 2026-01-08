# How to Test AI Document Classification on the Web Page

## Important Note About Text Extraction

**Field Clarification:**
- The system uses the `other_text` field to store AI-extracted text from payment screenshots
- This field contains the text extracted by OpenAI Vision API during fraud detection
- The classification feature reads from `other_text` (not `ocr_text`)
- Payments must have `other_text` populated for classification to work

**Current Status:**
- 11 out of 16 payments have `other_text` populated and are ready for classification
- Classification button will only be enabled for payments with extracted text

---

## Prerequisites

### 1. Configure OpenAI API Key (CRITICAL - MUST DO FIRST!)

Before testing, you MUST configure your OpenAI API key:

1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - Key: `OPENAI_API_KEY`
   - Value: `sk-your-openai-api-key-here`
4. Click **Save**

**Don't have an OpenAI API key?**
1. Visit https://platform.openai.com/
2. Sign up or log in
3. Go to **API Keys** section
4. Click **Create new secret key**
5. Copy and save the key securely

---

## Testing Steps

### Step 1: Access the Admin Dashboard

1. Open your browser and navigate to your application
2. Log in as an **Apartment Admin** (not occupant)
3. You should see the Admin Dashboard

### Step 2: Check the Notification Bell

**Look for the new notification bell icon in the header (top-right area):**

- Bell icon with a number badge (if there are unread notifications)
- Click it to see notification dropdown
- Initially, it may be empty

**What to expect:**
- Bell icon appears next to Home and Sign Out buttons
- Clicking shows a dropdown with notifications
- Red badge shows unread count

---

### Step 3: View Classification Analytics

1. In the left sidebar (or mobile menu), you'll see a new tab:
   - **"AI Classification"** with a brain icon 🧠

2. Click on **"AI Classification"** tab

3. You should see the **Classification Analytics Dashboard** with:
   - **4 Summary Cards**:
     - Total Classifications
     - Total Cost (in USD)
     - Avg Processing Time (ms)
     - High Confidence count

   - **2 Charts**:
     - By Confidence Level (High/Medium/Low)
     - By Document Type (UPI, Bank Transfer, etc.)

   - **Cost Information Box** (blue)

**What to expect:**
- If no classifications yet: "No Classifications Yet" message
- After classifying some payments, you'll see real statistics

---

### Step 4: Test Document Classification

#### Option A: Test with Existing Payment

1. Go to **"Payment Submissions"** tab (left sidebar)

2. Find a payment that has OCR text:
   - Look for payments that have been processed
   - Ideally, find one with transaction details

3. **Expand the payment row**:
   - Click the down arrow/chevron on the right side of the payment row
   - The row will expand to show detailed information

4. **Look for the Classification Section**:
   - Below the fraud detection warnings (if any)
   - Above "Complete Payment Details" heading
   - You'll see a **"Classify Document"** button

5. **Click "Classify Document"**:
   - Button will show "Classifying..." with a spinning icon
   - Wait 2-3 seconds for AI response

6. **View Results**:
   - Document icon with type (e.g., 📱 UPI payment confirmation)
   - Confidence badge (High/Medium/Low) with color
   - Payment method and app/bank name
   - Classification reasoning
   - Key identifiers found in the document
   - AI model info and processing time

#### Option B: Test Manual Classification via Database

If you want to test programmatically:

```sql
-- Find a payment with OCR text
SELECT id, name, LEFT(ocr_text, 50) as ocr_preview
FROM payment_submissions
WHERE ocr_text IS NOT NULL
AND LENGTH(ocr_text) > 10
LIMIT 1;

-- Manually trigger classification (replace payment-id-here)
SELECT manually_classify_document('payment-id-here');
```

---

### Step 5: Check for Notifications

After classifying a few documents, especially if any get **Low confidence**:

1. Click the **Bell icon** in the header
2. You should see notifications like:
   - "Payment Classification Needs Review"
   - Severity indicators (red/yellow/blue)
   - Details about which payment needs attention

3. **Test notification actions**:
   - Click "Mark as read" to mark notification as read
   - Click "Resolve" to mark it as resolved
   - Notifications will disappear from the list when resolved

**Trigger a low-confidence notification:**
- Classify a payment with unclear or blurry OCR text
- Or a payment with incomplete information
- System will automatically create a notification

---

### Step 6: Test Re-Classification

1. Go back to a payment you already classified
2. Expand the payment row
3. You'll see the existing classification results
4. Click the **"Re-classify"** button (small button next to heading)
5. AI will analyze again and update results

**Why re-classify?**
- If OCR text was updated/corrected
- To verify previous classification
- To get latest AI model results

---

## Expected Behavior

### High Confidence Classification (80-100%)

**Example Result:**
```
📱 UPI payment confirmation
[High (92%)] - Green badge

Method: UPI
App/Bank: PhonePe

Key Identifiers:
- transaction_id: T202412290001
- utr: 12345678901

Reasoning: "Clear PhonePe transaction with amount,
date, and reference number visible"

AI Model: gpt-4-turbo-preview | 1450ms
```

**What happens:**
- No notification created
- Admin can approve confidently
- Classification shown in expanded details

---

### Medium Confidence Classification (50-79%)

**Example Result:**
```
🏦 Bank transfer confirmation
[Medium (68%)] - Yellow badge

Method: NEFT
App/Bank: HDFC Bank

Reasoning: "Bank transfer details visible but
some text is unclear"
```

**What happens:**
- No automatic notification
- Admin should review manually
- Verify transaction details match

---

### Low Confidence Classification (0-49%)

**Example Result:**
```
❓ Unclear or insufficient data
[Low (25%)] - Red badge

Method: null
App/Bank: null

Reasoning: "OCR text is fragmented and unclear.
Unable to determine document type"
```

**What happens:**
- ✅ Notification created automatically
- Admin gets alert in notification bell
- Severity: Medium or High
- Admin should request clearer screenshot

---

### Non-Payment Document

**Example Result:**
```
❌ Non-payment document
[High (88%)] - Green badge

Reasoning: "Document appears to be an invoice,
not a payment confirmation"
```

**What happens:**
- ✅ Notification created (High severity)
- Admin should reject the submission
- Request actual payment proof

---

## Troubleshooting

### Issue: "Classify Document" button is disabled

**Cause:** No OCR text available

**Solution:**
- Check if payment has `ocr_text` field populated
- Only payments with extracted text can be classified
- Try a different payment that has transaction details

---

### Issue: "OpenAI API key not configured" error

**Cause:** API key not set in Supabase

**Solution:**
1. Go to Supabase Dashboard
2. Settings → Edge Functions → Secrets
3. Add `OPENAI_API_KEY = sk-your-key-here`
4. Save and retry

---

### Issue: Classification takes too long

**Cause:** OpenAI API slow response

**Solution:**
- Normal processing time: 1-3 seconds
- If > 10 seconds, check your internet connection
- Check OpenAI API status: https://status.openai.com/
- Try again in a few minutes

---

### Issue: No notifications appearing

**Cause:** All classifications have High/Medium confidence

**Solution:**
- This is actually good! Your payment screenshots are clear
- To test notifications, classify a payment with:
  - Blurry/unclear OCR text
  - Incomplete information
  - Non-payment documents (invoices, etc.)

---

### Issue: Classification results not showing

**Cause:** UI component not rendering

**Solution:**
1. Check browser console for errors (F12)
2. Refresh the page
3. Ensure payment row is expanded
4. Try a different payment

---

## What to Look For

### ✅ Success Indicators

1. **Bell icon appears** in header (right side)
2. **AI Classification tab** appears in sidebar
3. **Classify Document button** shows in expanded payment details
4. **Classification results** display after 2-3 seconds
5. **Notifications** appear for low-confidence cases
6. **Analytics dashboard** shows statistics
7. **Cost tracking** updates in real-time

### ❌ Potential Issues

1. Button disabled = No OCR text
2. Error message = API key not configured
3. Spinning forever = Network/API issue
4. No results = Edge function error
5. Empty analytics = No classifications yet

---

## Test Scenarios

### Scenario 1: Perfect UPI Screenshot

**Input:** Clear PhonePe/GPay screenshot with all details

**Expected:**
- Document Type: UPI payment confirmation
- Confidence: High (85-98%)
- Method: UPI
- App: PhonePe/Google Pay/Paytm
- Identifiers: Transaction ID, UTR, etc.
- No notification

### Scenario 2: Bank Transfer Screenshot

**Input:** Clear NEFT/RTGS screenshot from online banking

**Expected:**
- Document Type: Bank transfer confirmation
- Confidence: High (80-95%)
- Method: NEFT/RTGS/IMPS
- Bank: HDFC/ICICI/SBI/etc.
- Identifiers: Reference number, UTR
- No notification

### Scenario 3: Blurry Screenshot

**Input:** Poor quality, blurry, or cropped image

**Expected:**
- Document Type: Unclear or insufficient data
- Confidence: Low (< 50%)
- Method: null
- Reasoning: "Text is unclear/blurry"
- **Notification created** ✅

### Scenario 4: Invoice Instead of Payment

**Input:** Someone submits an invoice/bill instead of payment proof

**Expected:**
- Document Type: Non-payment document
- Confidence: High (> 80%)
- Reasoning: "Document appears to be an invoice"
- **Notification created** (High severity) ✅

---

## Database Checks

### Check Classification Records

```sql
-- View recent classifications
SELECT
  pdc.id,
  ps.name,
  pdc.document_type,
  pdc.confidence_level,
  pdc.confidence_score,
  pdc.payment_method,
  pdc.app_or_bank_name,
  pdc.classified_at
FROM payment_document_classifications pdc
JOIN payment_submissions ps ON pdc.payment_submission_id = ps.id
ORDER BY pdc.classified_at DESC
LIMIT 10;
```

### Check Notifications

```sql
-- View unresolved notifications
SELECT * FROM unresolved_notifications
ORDER BY created_at DESC;
```

### Check Statistics

```sql
-- Get classification stats for your apartment
SELECT get_classification_statistics('your-apartment-id-here');
```

### Check Payments Ready for Classification

```sql
-- Find payments with OCR text but no classification
SELECT
  id,
  name,
  fraud_checked_at,
  ocr_text IS NOT NULL as has_ocr,
  LEFT(ocr_text, 100) as ocr_preview
FROM payment_submissions
WHERE fraud_checked_at IS NOT NULL
AND ocr_text IS NOT NULL
AND id NOT IN (
  SELECT payment_submission_id
  FROM payment_document_classifications
)
LIMIT 10;
```

---

## Video Walkthrough Outline

If you want to record a test:

1. **[0:00-0:30]** Login and show admin dashboard
2. **[0:30-1:00]** Point out new Bell icon and AI Classification tab
3. **[1:00-2:00]** Navigate to AI Classification analytics page
4. **[2:00-3:00]** Go to Payment Submissions tab
5. **[3:00-4:00]** Expand a payment row, show Classify Document button
6. **[4:00-5:00]** Click classify, wait for results, show classification details
7. **[5:00-6:00]** Show notification bell with new notification
8. **[6:00-7:00]** Click notification, mark as read/resolve
9. **[7:00-8:00]** Go back to analytics, show updated statistics

---

## Quick Verification Checklist

- [ ] OpenAI API key configured in Supabase
- [ ] Logged in as apartment admin
- [ ] Bell icon visible in header
- [ ] AI Classification tab visible in sidebar
- [ ] AI Classification page loads without errors
- [ ] Payment Submissions page loads
- [ ] Can expand payment rows
- [ ] Classify Document button appears (if OCR text exists)
- [ ] Clicking Classify Document shows results in 2-3 seconds
- [ ] Classification details display correctly
- [ ] Notifications appear for low confidence cases
- [ ] Analytics dashboard shows statistics after classifications
- [ ] Can mark notifications as read
- [ ] Can resolve notifications

---

## Need More Help?

1. Check browser console (F12) for JavaScript errors
2. Check Supabase edge function logs
3. Review database tables for data
4. Verify OpenAI API key is correct
5. Check OpenAI account has credits
6. Refer to [AI_DOCUMENT_CLASSIFICATION_GUIDE.md](./AI_DOCUMENT_CLASSIFICATION_GUIDE.md) for technical details

---

**Happy Testing!** 🎉

The system should work smoothly if the OpenAI API key is configured correctly. Classification takes 1-3 seconds per document on average.
