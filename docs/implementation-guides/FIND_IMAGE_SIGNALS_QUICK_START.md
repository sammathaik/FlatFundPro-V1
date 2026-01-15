# Quick Start: Finding Image Analysis Signals

## TL;DR - Where Is It?

**Admin Dashboard → Payment Management → Click "Review" on any payment → Scroll down → "Image-Level Signals" section**

---

## Visual Navigation

### Step 1: Login and Navigate
```
[FlatFundPro Logo]
├─ Dashboard (you're here)
├─ Payment Management ← Click this
├─ Analytics
└─ Settings
```

### Step 2: Payment Management Page
```
┌────────────────────────────────────────────────┐
│ Payment Management                              │
├────────────────────────────────────────────────┤
│                                                 │
│ [Search...] [Filter by status ▼]              │
│                                                 │
│ Flat    Name     Amount    Date      Status   │
│ ─────────────────────────────────────────────  │
│ G-100   Jitesh   ₹5,000   Oct 17   [Review] ← Click
│ F-21    Meena    ₹3,000   Oct 16   [Review]   │
│ A-10    Rajesh   ₹4,500   Oct 15   [Review]   │
│                                                 │
└────────────────────────────────────────────────┘
```

### Step 3: Payment Review Panel Opens (Right Side)
```
┌────────────────────────────────────────────────┐
│ [X] Payment Review                              │
├────────────────────────────────────────────────┤
│                                                 │
│ Payment Details                                 │
│ ├─ Occupant: Jitesh                            │
│ ├─ Flat: G-100                                 │
│ ├─ Amount: ₹5,000                              │
│ └─ Payment Date: Oct 17, 2025                  │
│                                                 │
│ ───────────────────────────────────────────    │
│                                                 │
│ Uploaded Payment Proof                          │
│ [📷 View Payment Screenshot]                   │
│                                                 │
│ ───────────────────────────────────────────    │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ 👁 Image-Level Signals     [Expand] ⚠  │ ← HERE!
│ │ Some flags detected - Review recommended │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ (Click to expand and see 3 analysis sections)  │
│                                                 │
│ ───────────────────────────────────────────    │
│                                                 │
│ Committee Action Panel                          │
│ ○ Approve as submitted                         │
│ ○ Edit and approve                             │
│                                                 │
└────────────────────────────────────────────────┘
```

### Step 4: Expanded Image Signals View
```
┌─────────────────────────────────────────────┐
│ 👁 Image-Level Signals     [Collapse] ⚠    │
│ Some flags detected - Review recommended     │
├─────────────────────────────────────────────┤
│                                              │
│ 1️⃣ Duplicate / Similar Image Detection     │
│ ┌─────────────────────────────────────────┐│
│ │ ⚠ Similar Image Detected                ││
│ │ Similarity: 100%                         ││
│ │ Previously seen in: Payment 50455c70... ││
│ │                                          ││
│ │ Exact duplicate detected during recheck  ││
│ └─────────────────────────────────────────┘│
│                                              │
│ 2️⃣ Image Metadata Consistency              │
│ ┌─────────────────────────────────────────┐│
│ │ EXIF Available: No (common for screenshots)│
│ │ Source Type: screenshot                  ││
│ │ Notes: No EXIF metadata found           ││
│ └─────────────────────────────────────────┘│
│                                              │
│ 3️⃣ Screenshot Validity Heuristics          │
│ ┌─────────────────────────────────────────┐│
│ │ ✓ Looks like a mobile screenshot        ││
│ │ Aspect Ratio: 9:16 (Standard)           ││
│ │ Resolution: 1080 × 1920                 ││
│ │ Text Density: 65/100                    ││
│ └─────────────────────────────────────────┘│
│                                              │
│ Analysis completed: Jan 15, 2026 8:17 AM    │
│ These signals are informational only.       │
└─────────────────────────────────────────────┘
```

---

## Color Coding

- **Green Border** = All signals normal, no issues
- **Orange Border** = Some flags detected, review recommended
- **Green Badge (✓)** = Check passed
- **Orange Badge (⚠)** = Flag detected, investigate
- **Yellow Badge (⚠)** = Warning, but may be legitimate

---

## Quick Test for G-100 Duplicate Issue

1. Admin Dashboard → Payment Management
2. Search for "G-100" or filter by flat
3. You'll see 2 payments from Jitesh with same date
4. Click "Review" on the **first payment**:
   - Expand Image-Level Signals
   - Should show: "No duplicate detected"
5. Click "Review" on the **second payment**:
   - Expand Image-Level Signals
   - Should show: "Similar Image Detected - 100%"
   - Links to the first payment

---

## If You Still Don't See It

### Check 1: Make sure you're in the Payment Review Panel
- The panel appears on the right side when you click "Review"
- It has a close button (X) at the top
- It scrolls independently

### Check 2: Scroll down in the review panel
- The Image Signals section is below the payment proof
- If the panel is short, you need to scroll within it

### Check 3: Check if analysis was completed
- Look for one of these messages:
  - "No image-level signals available" (old payment)
  - "Image analysis was not completed" (failed)
  - "Loading image signals..." (still processing)

### Check 4: Verify the payment has a screenshot
- Only payments WITH screenshot uploads get analyzed
- If no screenshot_url exists, no signals will appear

---

## Common Scenarios

### Scenario 1: I see "No image-level signals available"
**Cause:** Payment was submitted before image analysis feature was enabled.
**Solution:** Use the Image Signals Backfill Tool in System Settings.

### Scenario 2: Panel shows but is collapsed
**Cause:** Normal behavior - panel starts collapsed.
**Solution:** Click the "Expand" button to see details.

### Scenario 3: I see the panel but no duplicate flag on G-100
**Cause:** The fix was just applied. Old data needs updating.
**Solution:** Run the database function:
```sql
SELECT update_duplicate_flags();
```
Or wait for the next payment submission to trigger reanalysis.

---

## Try It Now!

1. Open your admin panel
2. Go to Payment Management
3. Click "Review" on any payment with a screenshot
4. Scroll down to find "Image-Level Signals"
5. Click "Expand" to see the analysis

That's it! The feature is already built into your payment review workflow.
