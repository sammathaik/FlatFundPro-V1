# How to View Image Analysis Signals (Admin Guide)

## Where to Find Image Signals

The **Image-Level Signals** panel appears automatically in the Payment Review Panel when you're reviewing any payment submission.

### Step-by-Step Instructions

1. **Login as Admin**
   - Use your admin credentials

2. **Navigate to Payment Management**
   - Admin Dashboard → Payment Management
   - Or Admin Dashboard → All Payments

3. **Click on Any Payment**
   - Click "Review" button on any payment row
   - This opens the Payment Review Panel on the right side

4. **Scroll Down to Find Image Signals**
   - Look for the section titled **"Image-Level Signals"**
   - It appears after the "Uploaded Payment Proof" section
   - It has a collapsible header with either:
     - Green border = All signals normal
     - Orange border = Some flags detected

5. **Expand the Panel**
   - Click the "Expand" button to see detailed analysis
   - You'll see 3 sections:

## What You'll See

### Section 1: Duplicate / Similar Image Detection
Shows if this screenshot has been submitted before.

**Green Badge (No Duplicate):**
```
✓ No duplicate detected
This image appears to be unique
```

**Orange Badge (Duplicate Found):**
```
⚠ Similar Image Detected
Similarity: 100%
Previously seen in: Payment abc12345...
Exact duplicate detected during recheck
```

**Action:** If duplicate is detected, click on the referenced payment ID to compare both submissions.

---

### Section 2: Image Metadata Consistency
Shows EXIF data from the image (if available).

**What to Look For:**
- EXIF Available: Yes/No (No is normal for screenshots)
- Source Type: screenshot, camera, unknown, edited
- Created: Date/time if available
- Editor Detected: Shows if image was edited with Photoshop, GIMP, etc.

**Yellow Flag:**
```
⚠ Editor Detected: Adobe Photoshop
```

**Action:** Edited images aren't automatically fraud, but investigate why the screenshot was edited.

---

### Section 3: Screenshot Validity Heuristics
Checks if the image looks like a typical mobile payment screenshot.

**Green Badge (Normal):**
```
✓ Looks like a mobile screenshot
Aspect Ratio: 9:16 (Standard)
Resolution: 1080 × 1920
Text Density: 65/100
```

**Orange Badge (Unusual):**
```
⚠ Unusual format detected
Aspect Ratio: Landscape
Resolution: 800 × 600
Unusual: Payment screenshots are typically portrait mode
```

**Action:** Unusual formats deserve extra scrutiny but may be legitimate (tablet screenshots, cropped images, etc.).

---

## Visual Example

When you open a payment review panel, you'll see:

```
┌─────────────────────────────────────────┐
│  Payment Details                         │
│  ├─ Name: Jitesh                        │
│  ├─ Flat: G-100                         │
│  ├─ Amount: ₹5,000                      │
│  └─ Date: 2025-10-17                    │
│                                          │
│  Uploaded Payment Proof                  │
│  [View Payment Screenshot]               │
│  [Document Classification Badge]         │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Image-Level Signals     [Expand] ⚠│ │  ← THIS IS IT!
│  │ Some flags detected - Review rec.  │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Fraud Detection Alert (if flagged)     │
│                                          │
│  Committee Action Panel                  │
│  ○ Approve as submitted                 │
│  ○ Edit and approve                     │
│  ...                                     │
└─────────────────────────────────────────┘
```

## Testing with Your G-100 Submissions

To verify the duplicate detection is working:

1. Go to Payment Management
2. Find the two G-100 submissions from Jitesh (payment_date: 2025-10-17)
3. Click "Review" on the first one
4. Expand "Image-Level Signals"
5. Should show: **No duplicate detected** (this is the original)

6. Close the panel
7. Click "Review" on the second one
8. Expand "Image-Level Signals"
9. Should show: **Similar Image Detected - 100% similarity**

## When to Take Action

### High Priority (Investigate Immediately)
- ⚠ Duplicate image with 100% similarity
- ⚠ Image edited with professional software (Photoshop, GIMP)
- ⚠ Multiple unusual signals combined

### Medium Priority (Review but May Be Legitimate)
- Unusual aspect ratio or resolution
- Missing EXIF data (very common for screenshots)
- Low text density score

### Low Priority (Informational Only)
- Screenshot source type
- Creation date mismatch (clocks may differ)
- Single minor flag

## Important Notes

1. **Non-Blocking**: Image signals never automatically reject payments
2. **Assistive Only**: These are investigation tools for admins
3. **Context Matters**: Always review with full payment context
4. **False Positives**: Some legitimate payments may have flags

## Keyboard Shortcuts

When in Payment Review Panel:
- ESC - Close the panel
- Click outside - Close the panel
- Expand/Collapse - Click the signal panel header

## If You Don't See Image Signals

The panel will show one of these messages:

**Loading:**
```
⏳ Loading image signals...
```

**No Data:**
```
ℹ No image-level signals available for this submission
```
- This means the payment was submitted before image analysis was enabled
- Or the analysis failed during processing

**Analysis Failed:**
```
⚠ Image analysis was not completed
```
- The system attempted analysis but encountered an error
- The payment can still be processed manually

## Need to Backfill Old Payments?

If you have old payments without image signals, use the **Image Signals Backfill Tool**:

1. Go to Admin Dashboard → System Settings
2. Find "Image Signals Backfill Tool"
3. Click "Start Backfill Process"
4. Wait for analysis to complete

This will analyze all past submissions and populate their image signals.

## Questions?

- **Q: Why do some payments have no signals?**
  A: They were submitted before the feature was enabled, or analysis failed.

- **Q: Are duplicate images automatically rejected?**
  A: No. Admins must review and decide. There may be legitimate reasons.

- **Q: What if EXIF data is missing?**
  A: Normal for screenshots. Not a fraud indicator by itself.

- **Q: Can I see the actual hash values?**
  A: Yes, they're stored in the database. Use the diagnostic queries if needed.

- **Q: How accurate is duplicate detection?**
  A: Very accurate for exact matches. Near-matches (cropped/resized) also detected.
