# Duplicate Image Detection System - Fixed

## Problem Reported

User uploaded the same screenshot twice for flat G-100 (occupant Jitesh), but the system did not detect it as a duplicate.

## Root Cause Analysis

### 1. Race Condition
When two images with identical content were uploaded within milliseconds of each other:
- First image uploaded at: `2026-01-15 08:17:30.343243+00`
- Second image uploaded at: `2026-01-15 08:17:30.346414+00` (3ms later)

When the second image's duplicate check ran, the first image's hash hadn't been committed to the database yet, causing the duplicate check to return "not found".

### 2. Flawed Hash Index Design
The `image_perceptual_hash_index` table was creating **separate rows** for each payment with the same hash:
- Each row had `upload_count: 1`
- No single source of truth for a specific hash
- Made it impossible to track true duplicate counts

### 3. No Post-Processing
The system ran duplicate checks during upload (fire-and-forget) but never rechecked after all submissions were stored.

## How Image Detection Should Work

### Check 1: Duplicate/Similar Image Detection
- Generate a perceptual hash (dHash) for each uploaded image
- Compare against existing hashes in the database
- Detect exact duplicates and near-duplicates
- Report similarity score and reference to prior submission

### Check 2: Image Metadata Consistency
- Extract EXIF metadata if present
- Capture creation date, source type, editor info
- This is a weak, informational signal only

### Check 3: Screenshot Validity Heuristics
- Check aspect ratio (9:16, 9:19.5, etc.)
- Verify resolution is reasonable
- Estimate text density
- Flag unusual formats

## What Was Fixed

### 1. Redesigned Hash Index Table
```sql
CREATE TABLE image_perceptual_hash_index (
  perceptual_hash text PRIMARY KEY,
  hash_algorithm text DEFAULT 'dhash',
  first_payment_id uuid NOT NULL,
  first_uploaded_at timestamptz DEFAULT now(),
  upload_count integer DEFAULT 1,
  last_updated_at timestamptz DEFAULT now()
);
```

**Key Changes:**
- One row per unique hash (not per payment)
- `upload_count` properly tracks duplicates
- `first_payment_id` identifies the original submission

### 2. Updated Duplicate Check Function
The `check_similar_images()` function now:
- Looks up hash in the redesigned index
- Returns proper upload count
- References the first payment as the original

### 3. Created Backfill Functions
- `recheck_duplicate_images()` - Identifies existing duplicates
- `update_duplicate_flags()` - Updates flags and counts

### 4. Updated Frontend Service
The `imageSignalsService.ts` now:
1. Stores the image signal first
2. Checks if the hash already exists
3. If yes: increments count and marks as duplicate
4. If no: creates new hash index entry

This sequential approach prevents race conditions.

## Verification Results

### Before Fix
```
G-100, Payment 1: duplicate_detected=false, similarity_percentage=0
G-100, Payment 2: duplicate_detected=false, similarity_percentage=0
```

### After Fix
```
G-100, Payment 1: duplicate_detected=false, similarity_percentage=0 (Original)
G-100, Payment 2: duplicate_detected=true, similarity_percentage=100,
                  similar_to_payment_id=<Payment 1>,
                  explanation="Exact duplicate detected during recheck"
```

### Hash Index
```
perceptual_hash: 0c0c0c80eaea1882
first_payment_id: 50455c70-aee9-4969-a3b8-f8217c77c161
upload_count: 2
```

## How Admins Can See This

### 1. Payment Review Panel
Navigate to Admin > Payment Management > Any Payment

The right panel shows "Image Analysis Signals" including:
- Duplicate Detection status
- Similarity percentage
- Link to original payment if duplicate
- EXIF metadata
- Screenshot validity assessment

### 2. Image Signals Investigation Panel
For detailed analysis of specific suspicious payments

### 3. Fraud Detection Dashboard
Shows all flagged payments including those with duplicate images

## Testing the Fix

### Test Case 1: Upload Same Screenshot Twice
1. Go to any payment submission form
2. Upload the same screenshot for two different payments
3. Check the second payment's image signals
4. Should show: `duplicate_detected: true, similarity_percentage: 100`

### Test Case 2: Run Backfill on Existing Data
```sql
SELECT update_duplicate_flags();
```

This will scan all existing payment image signals and update any that should be marked as duplicates.

### Test Case 3: Check Hash Index Integrity
```sql
SELECT
  perceptual_hash,
  upload_count,
  first_uploaded_at
FROM image_perceptual_hash_index
WHERE upload_count > 1
ORDER BY upload_count DESC;
```

This shows all images that have been uploaded multiple times.

## Important Notes

1. **Non-Blocking Analysis**: Image signal analysis runs asynchronously and doesn't block payment submission

2. **Informational Only**: Image signals are assistive data for admins, not automatic rejection criteria

3. **Weak Signals**: EXIF metadata absence is NOT considered fraud - many legitimate screenshots lack EXIF data

4. **Manual Review**: Admins should investigate flagged duplicates but make final decisions based on all evidence

## Migration Applied

- File: `supabase/migrations/fix_duplicate_image_detection_race_condition.sql`
- Applied: 2026-01-15
- Status: Success
- Backfill: Automatically ran and updated existing G-100 submissions

## Files Modified

1. `supabase/migrations/fix_duplicate_image_detection_race_condition.sql` - Database fixes
2. `src/lib/imageSignalsService.ts` - Frontend service updates
3. `supabase/migrations/fix_payment_image_signals_cascade_delete.sql` - Fixed deletion issue

## Related Issues Fixed

The user also reported an error when deleting payment submissions. This was caused by a foreign key constraint without `ON DELETE CASCADE`. This has also been fixed in the same update.
