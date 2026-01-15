# Image-Level Fraud Signals Enhancement Layer

## Overview

This enhancement adds **three lightweight, non-blocking image-level detection methods** to the FlatFund Pro payment submission system. These checks provide assistive signals for committee investigation without blocking legitimate payments or modifying existing fraud detection features.

## Design Principles

✅ **ASSISTIVE** - Helps admins investigate, never blocks submissions
✅ **NON-BLOCKING** - All checks run asynchronously after payment is saved
✅ **ADDITIVE** - Does not modify existing fraud detection or AI classification
✅ **EXPLAINABLE** - Each signal is clearly labeled and documented
✅ **SAFE** - Missing images or analysis failures do not cause errors

---

## Three Image-Level Checks

### 1. Duplicate / Similar Image Detection

**Purpose**: Detect reused or duplicate payment screenshots

**How it works**:
- Generates a perceptual hash (dHash) for each uploaded image
- Compares against previously uploaded images
- Detects exact duplicates and near-duplicates (cropped, resized, re-saved)

**Output**:
- ✅ "No duplicate detected" (green)
- ⚠️ "Similar image detected" with similarity percentage and reference to prior submission (orange)

---

### 2. Image Metadata Consistency

**Purpose**: Extract lightweight metadata signals when available

**How it works**:
- Reads EXIF data from image (if present)
- Extracts creation date, source type, editor software
- Detects if metadata has been stripped

**Important**: Absence of metadata is **NOT treated as fraud** - many screenshots naturally lack EXIF data

**Output**:
- EXIF Available: Yes/No
- Source Type: screenshot, camera, edited, or unknown
- Editor Detected: Software name if image was edited
- Creation Date: When image was created (if available)
- Notes: Informational context

---

### 3. Screenshot Validity Heuristics

**Purpose**: Assess whether image looks like a typical mobile payment screenshot

**How it works**:
- Analyzes aspect ratio (9:16, 9:19.5, etc.)
- Checks resolution appropriateness
- Estimates text density as a proxy for UI elements
- No ML models required - simple heuristics only

**Output**:
- ✅ "Looks like a mobile screenshot" (green) - Standard aspect ratio, appropriate resolution
- ⚠️ "Unusual format detected" (orange) - Landscape mode, non-standard ratio, very low/high resolution
- Aspect ratio description
- Resolution dimensions
- Text density score

---

## Technical Implementation

### Database Schema

**New Tables**:

1. **`payment_image_signals`**
   - Stores all three signal types for each payment submission
   - Linked to `payment_submissions` via foreign key
   - Read-only for investigation purposes

2. **`image_perceptual_hash_index`**
   - Fast lookup index for duplicate detection
   - Stores perceptual hash values with payment references

**Security**:
- RLS enabled on all tables
- Only admins and super admins can view signals
- System can insert signals automatically
- Occupants cannot see fraud detection data

### Code Architecture

**Service Layer**: `src/lib/imageSignalsService.ts`
- `ImageSignalsService.computePerceptualHash()` - dHash algorithm
- `ImageSignalsService.checkForDuplicates()` - Query for similar images
- `ImageSignalsService.extractMetadataSignals()` - EXIF extraction using exifreader
- `ImageSignalsService.analyzeScreenshotValidity()` - Heuristic checks
- `ImageSignalsService.analyzeImage()` - Unified analysis orchestration
- `ImageSignalsService.storeImageSignals()` - Save results to database

**UI Component**: `src/components/admin/ImageSignalsInvestigationPanel.tsx`
- Expandable panel showing all three signals
- Color-coded (green = normal, orange = review recommended)
- Clearly labeled and non-judgmental language
- Shows analysis timestamp and status

---

## Integration Points

Image signals are automatically analyzed and stored for:

1. ✅ **Public payment form** (`DynamicPaymentForm.tsx`)
2. ✅ **Mobile payment flow** (`MobilePaymentFlow.tsx`)
3. ✅ **Occupant quick payment** (`QuickPaymentModal.tsx`)
4. ✅ **Admin payment review panel** (`PaymentReviewPanel.tsx`)

**Manual admin entries without screenshots** safely bypass image checks.

### Backfilling Existing Data

For existing payment submissions in the database, use the **Image Signals Backfill Tool**:

📍 **Location**: Dashboard → System Settings → Tools tab

**Purpose**: Processes all historical payment submissions to:
- Populate the perceptual hash index
- Enable duplicate detection across old and new submissions
- Provide complete historical analysis

**Features**:
- ✅ Safe to run multiple times (skips already-processed payments)
- ✅ Processes in batches to avoid system overload
- ✅ Real-time progress tracking with activity log
- ✅ Handles failures gracefully (broken image URLs, etc.)

See [IMAGE_SIGNALS_BACKFILL_GUIDE.md](./IMAGE_SIGNALS_BACKFILL_GUIDE.md) for detailed instructions.

---

## Admin Investigation Interface

Admins can view image signals in the **Payment Review Panel**:

1. **Existing Information** (unchanged):
   - OCR-based fraud risk score + reasons
   - AI document classification result

2. **New: Image-Level Signals** (expandable):
   - Signal 1: Duplicate Detection
   - Signal 2: Metadata Consistency
   - Signal 3: Screenshot Validity

Each signal shows:
- ✅ Green border/badge when normal
- ⚠️ Orange border/badge when flagged
- Clear explanation of what was detected
- Technical details for investigation

---

## Example Scenarios

### Scenario 1: Normal Screenshot
```
✅ Duplicate Detection: No duplicate detected
ℹ️ Metadata: No EXIF data (common for screenshots)
✅ Validity: 9:16 aspect ratio, standard mobile screenshot
```
→ **Result**: All signals green, no flags

### Scenario 2: Reused Screenshot
```
⚠️ Duplicate Detection: 100% similarity with payment from 2 weeks ago
ℹ️ Metadata: No EXIF data (common for screenshots)
✅ Validity: 9:16 aspect ratio, standard mobile screenshot
```
→ **Result**: Duplicate flag for admin review

### Scenario 3: Edited Image
```
✅ Duplicate Detection: No duplicate detected
⚠️ Metadata: Edited with Adobe Photoshop
✅ Validity: 9:16 aspect ratio, standard mobile screenshot
```
→ **Result**: Editor detected flag for admin review

### Scenario 4: Unusual Format
```
✅ Duplicate Detection: No duplicate detected
ℹ️ Metadata: No EXIF data (common for screenshots)
⚠️ Validity: Landscape mode - unusual for payment screenshots
```
→ **Result**: Format flag for admin review

---

## Performance & Safety

**Asynchronous Processing**:
- Analysis runs **after** payment is saved to database
- Does not block user from completing submission
- Failures are logged but do not prevent payment submission

**Error Handling**:
- If image analysis fails, status is set to 'failed' with error message
- Payment submission proceeds normally
- Admins see informational message: "Image analysis was not completed"

**Browser Compatibility**:
- Uses Canvas API for image processing (widely supported)
- ExifReader library for metadata (already in dependencies)
- No external API calls required

---

## Testing Guide

### Test Case 1: Submit New Payment
1. Go to public payment form
2. Upload a payment screenshot
3. Submit payment
4. Verify payment is saved immediately
5. As admin, view payment in review panel
6. Check that Image Signals panel appears
7. Expand panel to see all three signals

### Test Case 2: Submit Duplicate Image
1. Submit a payment with screenshot A
2. Wait for analysis to complete
3. Submit another payment with the same screenshot A
4. As admin, view second payment
5. Verify duplicate detection shows 100% similarity

### Test Case 3: Submit Edited Image
1. Take a screenshot
2. Edit it in photo editing software (crop, adjust brightness)
3. Submit payment with edited screenshot
4. As admin, view payment
5. Check if editor is detected in metadata (may not always be present)

### Test Case 4: Submit Landscape Photo
1. Take a photo in landscape mode
2. Submit payment with landscape image
3. As admin, view payment
4. Verify "unusual format" flag appears

---

## Database Functions

### `check_similar_images(hash, payment_id, threshold)`
Returns similar images based on perceptual hash matching.

### `assess_screenshot_validity(width, height, has_text)`
Evaluates if image dimensions suggest a typical mobile screenshot.

---

## Monitoring & Maintenance

**Check Analysis Status**:
```sql
SELECT
  analysis_status,
  COUNT(*) as count
FROM payment_image_signals
GROUP BY analysis_status;
```

**Find Flagged Payments**:
```sql
SELECT
  pis.payment_submission_id,
  pis.duplicate_detected,
  pis.looks_like_screenshot,
  pis.exif_editor_detected
FROM payment_image_signals pis
WHERE pis.duplicate_detected = true
   OR pis.looks_like_screenshot = false
   OR pis.exif_editor_detected IS NOT NULL
ORDER BY pis.analyzed_at DESC
LIMIT 50;
```

**Check Hash Index Size**:
```sql
SELECT COUNT(DISTINCT perceptual_hash) as unique_hashes,
       COUNT(*) as total_entries
FROM image_perceptual_hash_index;
```

---

## Future Enhancements (Optional)

These were NOT implemented to keep the solution lightweight:

- ❌ Bank UI template matching (too complex)
- ❌ Error Level Analysis (requires image manipulation detection)
- ❌ ML-based forgery detection (overkill for this use case)
- ❌ OCR validation of amounts (already handled elsewhere)

The three implemented checks provide excellent coverage for the most common fraud patterns while remaining simple, fast, and explainable.

---

## Troubleshooting

**Issue**: Image signals not appearing
- Check browser console for errors
- Verify payment submission has `screenshot_url`
- Check `payment_image_signals` table for entry

**Issue**: Analysis status shows 'failed'
- Check `analysis_error` column for details
- Verify image URL is accessible
- Check browser CORS settings if loading images

**Issue**: Duplicate not detected when it should be
- Verify both images have entries in `image_perceptual_hash_index`
- Check if images were significantly modified (cropped heavily, filters applied)
- dHash may not catch images with >20% visual difference

---

## Conclusion

This enhancement provides **governance without enforcement** - committee members get powerful investigation tools to detect suspicious patterns, while genuine users are never blocked or inconvenienced. The three lightweight checks are:

1. ✅ Fast and efficient
2. ✅ Easy to understand and explain
3. ✅ Safe and non-blocking
4. ✅ Separate from existing fraud detection
5. ✅ Visible only to authorized admins

All checks work across every payment submission entry point in the application.
