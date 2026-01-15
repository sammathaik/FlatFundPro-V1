# Image-Level Signals - Comprehensive Test Guide

## Test Case 1: Verify G-100 Duplicate Detection Data

### Step 1: Check if G-100 has duplicate submissions

**SQL Query:**
```sql
-- Find all G-100 submissions with duplicate images
SELECT 
  ps.id,
  ps.payment_amount,
  ps.payment_date,
  ps.status,
  ps.submission_source,
  ps.created_at,
  pis.perceptual_hash,
  pis.duplicate_detected,
  pis.duplicate_count,
  pis.similarity_score
FROM payment_submissions ps
JOIN payment_image_signals pis ON ps.id = pis.payment_submission_id
JOIN flat_numbers fn ON ps.flat_id = fn.id
WHERE fn.flat_number = 'G-100'
ORDER BY ps.created_at DESC;
```

**Expected Result:**
- Should show multiple G-100 submissions
- `duplicate_detected` should be `true` for matching images
- `perceptual_hash` should be identical for duplicates
- `similarity_score` should be 100 for exact matches

---

### Step 2: Verify hash index structure

**SQL Query:**
```sql
-- Check the hash index for G-100 submissions
SELECT 
  iph.perceptual_hash,
  iph.first_payment_id,
  iph.upload_count,
  iph.first_uploaded_at,
  ps.payment_date,
  fn.flat_number
FROM image_perceptual_hash_index iph
JOIN payment_submissions ps ON iph.first_payment_id = ps.id
JOIN flat_numbers fn ON ps.flat_id = fn.id
WHERE fn.flat_number = 'G-100';
```

**Expected Result:**
- Each unique hash should appear ONCE
- `upload_count` should be > 1 for duplicates
- `first_payment_id` should reference the oldest submission

---

### Step 3: Find all submissions sharing the same hash

**SQL Query:**
```sql
-- For a specific hash, find all related submissions
-- Replace 'HASH_VALUE' with actual hash from Step 1

SELECT 
  ps.id,
  ps.payment_amount,
  ps.payment_date,
  ps.transaction_reference,
  ps.status,
  ps.submission_source,
  fn.flat_number,
  bbl.block_name,
  apt.apartment_name,
  ec.collection_name,
  pis.perceptual_hash,
  pis.duplicate_detected
FROM payment_submissions ps
JOIN payment_image_signals pis ON ps.id = pis.payment_submission_id
JOIN flat_numbers fn ON ps.flat_id = fn.id
JOIN buildings_blocks_phases bbl ON fn.block_id = bbl.id
JOIN apartments apt ON bbl.apartment_id = apt.id
LEFT JOIN expected_collections ec ON ps.expected_collection_id = ec.id
WHERE pis.perceptual_hash = 'HASH_VALUE'
ORDER BY ps.created_at DESC;
```

**Expected Result:**
- Multiple submissions with identical hash
- All should have `duplicate_detected = true` (except possibly the first one)
- Context information (apartment, block, flat, collection) should display

---

## Test Case 2: UI Testing - Payment Review Panel

### Test Steps:

1. **Navigate to Payment Management**
   - Login as admin
   - Go to "Payment Management" tab

2. **Filter to G-100 payments**
   - Use search or filter to find flat "G-100"
   - Should see multiple payment submissions

3. **Open Review Panel**
   - Click "Review" on any G-100 payment
   - Review panel should open on the right side

4. **Verify Image-Level Signals Section**
   - Scroll to "Image-Level Signals" section
   - Should see "Review recommended" badge
   - Click to expand the panel

5. **Check Duplicate Detection Display**
   - **Test 5a:** Duplicate Found
     - Should show orange/yellow alert: "Similar Image Detected"
     - Should show: "Similarity: 100%"
     - Should show: "Previously seen in: Payment 50455c70..."
     - Should show: "Exact duplicate detected during recheck"
     - Should show: "⚠ Unable to load full context for this match" should NOT appear

   - **Test 5b:** Full Context Table
     - Should display table with columns:
       - Apartment Name
       - Block
       - Flat Number  
       - Collection Type
       - Amount
       - Transaction Date
       - Status
       - Actions (View button)
     - Each row should have clickable "View" button

   - **Test 5c:** No Duplicate Case
     - For unique images, should show green badge: "No duplicate detected"

6. **Verify Document Classification Badge**
   - Near the screenshot link, should see classification badge
   - Badge should display classification if available
   - Should NOT show "undefined" errors in console

---

## Test Case 3: Console Error Verification

### Before Opening Payment Review, Check Browser Console

**Expected: NO Errors**

### After Opening Review Panel for G-100

**Console should be clean - NO errors like:**
- ❌ `column payment_submission_id does not exist`
- ❌ `invalid input syntax for type uuid: "undefined"`
- ❌ `Could not find a relationship between 'payment_submissions' and 'expected_collections'`

**Console should show (acceptable):**
- ✅ "Admin Data: Object" (normal React renders)
- ✅ No Supabase request failed messages
- ✅ No 400 (Bad Request) errors

---

## Test Case 4: API Request Verification

### Use Browser DevTools Network Tab

1. Open DevTools > Network tab
2. Open Review Panel for G-100 payment
3. Monitor API requests

**Expected Successful Requests:**

1. **Get Image Signals:**
   ```
   GET /rest/v1/payment_image_signals?select=*&payment_submission_id=eq.{ID}
   Status: 200 OK
   ```

2. **Get Hash Index:**
   ```
   GET /rest/v1/image_perceptual_hash_index?select=first_payment_id,upload_count&perceptual_hash=eq.{HASH}
   Status: 200 OK
   ```

3. **Get All Payments with Hash:**
   ```
   GET /rest/v1/payment_image_signals?select=payment_submission_id&perceptual_hash=eq.{HASH}
   Status: 200 OK
   ```

4. **Get Full Payment Details:**
   ```
   GET /rest/v1/payment_submissions?select=id,payment_amount,...,collection:expected_collection_id(collection_name)
   Status: 200 OK (NOT 400!)
   ```

5. **Get Document Classification:**
   ```
   GET /rest/v1/payment_document_classifications?select=*&payment_submission_id=eq.{ID}
   Status: 200 OK (NOT "eq.undefined"!)
   ```

---

## Test Case 5: Functional End-to-End Test

### Scenario: Admin Reviews Duplicate G-100 Submission

**Steps:**
1. Login as admin (from TEST_CREDENTIALS.md)
2. Navigate to Payment Management
3. Find G-100 payment with duplicate image
4. Click "Review"
5. Expand "Image-Level Signals"
6. Verify all information displays correctly
7. Click "View" on one of the duplicate matches
8. Should navigate to that payment's review panel
9. Verify that payment also shows duplicate detection

**Expected Behavior:**
- ✅ All data loads without errors
- ✅ Table displays complete context
- ✅ Navigation between duplicates works
- ✅ Classification badge displays (if available)
- ✅ No console errors
- ✅ No "Unable to load full context" messages

---

## Test Case 6: Database Schema Verification

### Verify the correct schema is in place

**SQL Query:**
```sql
-- Check image_perceptual_hash_index structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'image_perceptual_hash_index'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `perceptual_hash` (text, PRIMARY KEY)
- `hash_algorithm` (text)
- `first_payment_id` (uuid) - NOT payment_submission_id
- `first_uploaded_at` (timestamptz)
- `upload_count` (integer)
- `last_updated_at` (timestamptz)

---

**SQL Query:**
```sql
-- Check payment_submissions has expected_collection_id
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_submissions'
  AND column_name = 'expected_collection_id';
```

**Expected Result:**
- Column exists: `expected_collection_id` (uuid, nullable)

---

## Test Case 7: Edge Cases

### Test 7a: Payment with No Image Signals
1. Find a payment without image signals
2. Open review panel
3. Image-Level Signals section should show "No signals detected"

### Test 7b: Payment with Unique Image
1. Find a payment with unique image (not duplicate)
2. Open review panel
3. Should show green badge: "No duplicate detected"
4. Should NOT show duplicate table

### Test 7c: Multiple Duplicates (3+ submissions)
1. Find hash with 3 or more submissions
2. Review any one of them
3. Table should show ALL other submissions
4. Each should be clickable

---

## Success Criteria

All tests pass when:

✅ **No Console Errors**
- No database column errors
- No undefined UUID errors
- No foreign key relationship errors

✅ **UI Displays Correctly**
- Duplicate detection badge shows correct status
- Full context table displays all matches
- Document classification badge works
- All data fields populated correctly

✅ **Navigation Works**
- View buttons are clickable
- Navigation to other duplicates works
- Back navigation preserved context

✅ **Database Queries Work**
- All SQL test queries return expected data
- API requests return 200 status
- No 400 Bad Request errors

✅ **Performance**
- Page loads in < 2 seconds
- No infinite loading states
- No race conditions

---

## Troubleshooting

### If "Unable to load full context" still appears:

1. **Check Network Tab:**
   - Look for failing API request
   - Check the exact URL and parameters
   - Verify status code

2. **Check Console:**
   - Look for exact error message
   - Note the failing table/column name

3. **Verify Database:**
   - Run the schema verification queries
   - Ensure foreign keys exist
   - Check RLS policies allow reads

4. **Check Code:**
   - Verify query syntax in ImageSignalsInvestigationPanel.tsx
   - Ensure correct column names used
   - Check prop passing in PaymentReviewPanel.tsx

---

## Quick Verification Script

```sql
-- Run this single query to verify G-100 duplicate detection is working

WITH g100_hashes AS (
  SELECT DISTINCT pis.perceptual_hash
  FROM payment_image_signals pis
  JOIN payment_submissions ps ON pis.payment_submission_id = ps.id
  JOIN flat_numbers fn ON ps.flat_id = fn.id
  WHERE fn.flat_number = 'G-100'
    AND pis.duplicate_detected = true
)
SELECT 
  'Hash Index Entry' as check_type,
  COUNT(*) as count,
  'Should be >= 1' as expected
FROM image_perceptual_hash_index iph
WHERE EXISTS (SELECT 1 FROM g100_hashes WHERE perceptual_hash = iph.perceptual_hash)

UNION ALL

SELECT 
  'Total G-100 Submissions with Signals' as check_type,
  COUNT(*) as count,
  'Should be >= 2' as expected
FROM payment_image_signals pis
JOIN payment_submissions ps ON pis.payment_submission_id = ps.id
JOIN flat_numbers fn ON ps.flat_id = fn.id
WHERE fn.flat_number = 'G-100'

UNION ALL

SELECT 
  'G-100 Submissions Marked as Duplicate' as check_type,
  COUNT(*) as count,
  'Should be >= 1' as expected
FROM payment_image_signals pis
JOIN payment_submissions ps ON pis.payment_submission_id = ps.id
JOIN flat_numbers fn ON ps.flat_id = fn.id
WHERE fn.flat_number = 'G-100'
  AND pis.duplicate_detected = true;
```

**Expected Output:**
```
check_type                                | count | expected
-----------------------------------------|-------|-------------
Hash Index Entry                         |   1+  | Should be >= 1
Total G-100 Submissions with Signals     |   2+  | Should be >= 2
G-100 Submissions Marked as Duplicate    |   1+  | Should be >= 1
```

If all counts meet expectations, duplicate detection is working correctly.

---

## Files Modified in This Fix

1. **src/components/admin/ImageSignalsInvestigationPanel.tsx**
   - Line 88-92: Fixed hash index query to use `first_payment_id, upload_count`
   - Line 99-103: Added fallback query to `payment_image_signals`
   - Line 133: Fixed foreign key from `payment_submissions_collection_id_fkey` to `expected_collection_id`

2. **src/components/admin/PaymentReviewPanel.tsx**
   - Line 422-425: Fixed DocumentClassificationBadge props from `paymentSubmissionId` to `paymentId`
   - Added `ocrText={payment.other_text}` prop

---

## Summary

This comprehensive test guide verifies that:
- Database queries use correct column names
- Foreign key relationships work properly
- UI displays duplicate context correctly
- No console errors occur
- All navigation works as expected
- G-100 duplicate detection fully functional

**Current Status:** ✅ ALL FIXES APPLIED - READY FOR TESTING
