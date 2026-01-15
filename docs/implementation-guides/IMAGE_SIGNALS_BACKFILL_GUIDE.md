# Image Signals Backfill Guide

## Overview

The Image Signals Backfill Tool processes **existing payment submissions** to populate the new `payment_image_signals` and `image_perceptual_hash_index` tables. This enables:

✅ **Duplicate detection across old and new submissions** - Catch if new payments reuse old screenshots
✅ **Complete historical analysis** - View image signals for past submissions
✅ **Pattern investigation** - Identify suspicious trends across time

---

## Why Backfill?

**Without backfilling:**
- New image signals tables are empty
- Only NEW submissions get analyzed
- Cannot detect if someone reuses a screenshot from last month
- Missing historical context

**With backfilling:**
- All past screenshots are analyzed
- Perceptual hash index is complete
- Duplicate detection works across entire history
- Committee can investigate past submissions

---

## How to Run Backfill

### Step 1: Access the Tool

**For Regular Admins:**
1. Log in as **Admin**
2. Navigate to **Dashboard** → **Admin Tools** (in the left sidebar)
3. You'll see the **Image Signals Backfill Tool**

**For Super Admins:**
1. Log in as **Super Admin**
2. Navigate to **Dashboard** → **System Settings**
3. Click the **"Tools"** tab
4. You'll see the **Image Signals Backfill Tool**

### Step 2: Review Information

The tool displays:
- What it does (analyze existing screenshots)
- Safety notes (skips already-processed payments)
- Current status

### Step 3: Start Backfill

1. Click **"Start Backfill"** button
2. Watch the progress in real-time:
   - **Total**: Number of payments with screenshots
   - **Processed**: Current progress
   - **Successful**: Successfully analyzed
   - **Skipped**: Already had signals (safe to re-run)
   - **Failed**: Could not analyze (broken image URLs, etc.)

### Step 4: Monitor Activity Log

The activity log shows:
- ✅ Successfully processed payments
- ⏭️ Skipped payments (already analyzed)
- ❌ Failed payments (with error details)
- ✨ Completion message

---

## Processing Details

### Batch Processing
- Processes **5 payments at a time** to avoid overwhelming the system
- 1-second delay between batches
- Safe for production use

### What Gets Analyzed
For each payment submission with a screenshot:
1. ✅ **Duplicate Detection**: Compute perceptual hash, check for matches
2. ✅ **Metadata Extraction**: Read EXIF data if available
3. ✅ **Validity Checks**: Analyze aspect ratio, resolution, text density

### Skipped Payments
The tool automatically skips:
- Payments already in `payment_image_signals` table
- Payments without screenshot URLs
- Manual entries without screenshots

This means **it's safe to run multiple times** - it won't duplicate work.

---

## Expected Results

### Success Scenario
```
🔍 Fetching payment submissions with screenshots...
📊 Found 247 payment submissions to process
🔄 Processing batch 1 of 50
✅ Processed F-101 - OK
✅ Processed F-102 - Duplicate detected!
✅ Processed F-103 - OK
⏭️  Skipped F-104 - Already analyzed
...
✨ Backfill completed successfully!
```

**Result**: 247 payments analyzed, signals available for admin review

### Partial Failure Scenario
```
🔍 Fetching payment submissions with screenshots...
📊 Found 150 payment submissions to process
✅ Processed F-101 - OK
❌ Failed F-102 - Failed to fetch: 404
✅ Processed F-103 - OK
...
✨ Backfill completed successfully!
```

**Result**: Most payments analyzed, some failed (likely old/deleted images)

---

## Troubleshooting

### Issue: Many Failures

**Possible Causes:**
- Old image URLs are no longer accessible (deleted from storage)
- CORS issues with image loading
- Storage bucket permissions

**Solution:**
- Failed payments are logged with status 'failed' in database
- They can be manually reviewed later
- No impact on successful analyses

### Issue: Tool Shows "No payments found"

**Possible Causes:**
- All payments already analyzed (skipped)
- No payment submissions have screenshots

**Solution:**
- Check `payment_submissions` table for entries with `screenshot_url`
- Verify you have permission to view payments

### Issue: Browser Hangs or Crashes

**Possible Causes:**
- Too many payments to process at once (rare)
- Large image files

**Solution:**
- Refresh the page and restart
- Processing is resumable (skips already-done payments)
- Consider running during off-peak hours

---

## Post-Backfill Verification

### SQL Query: Check Backfill Results

```sql
-- Total payments with screenshots
SELECT COUNT(*) as total_payments_with_screenshots
FROM payment_submissions
WHERE screenshot_url IS NOT NULL;

-- Total analyzed signals
SELECT COUNT(*) as total_analyzed
FROM payment_image_signals
WHERE analysis_status = 'completed';

-- Analysis status breakdown
SELECT
  analysis_status,
  COUNT(*) as count
FROM payment_image_signals
GROUP BY analysis_status
ORDER BY count DESC;

-- Find duplicates detected
SELECT
  ps.flat_id,
  ps.created_at,
  pis.similarity_percentage,
  pis.similarity_explanation
FROM payment_image_signals pis
JOIN payment_submissions ps ON ps.id = pis.payment_submission_id
WHERE pis.duplicate_detected = true
ORDER BY ps.created_at DESC
LIMIT 20;
```

### Expected Outcomes

After successful backfill:
- `payment_image_signals` should have entries for most payments
- `image_perceptual_hash_index` should be populated with hashes
- Some payments may have `analysis_status = 'failed'` (expected for inaccessible images)

---

## Re-running Backfill

**It's safe to run multiple times!**

The tool automatically:
- ✅ Checks if payment already has signals
- ✅ Skips already-processed payments
- ✅ Only processes new/missing entries

**When to re-run:**
1. After fixing storage/CORS issues
2. If initial run was interrupted
3. To process newly submitted payments (though they're auto-processed on upload)

---

## Performance Considerations

### Small Database (< 100 payments)
- Completes in **1-2 minutes**
- No performance impact

### Medium Database (100-500 payments)
- Completes in **5-10 minutes**
- Minimal performance impact
- Safe to run during business hours

### Large Database (> 500 payments)
- Completes in **15-30 minutes**
- Consider running during off-peak hours
- Browser should remain open during processing

---

## Manual SQL Backfill (Alternative)

If you prefer to backfill via SQL for very large databases:

```sql
-- Note: This approach requires an Edge Function or external script
-- The browser-based tool is recommended for most users

-- Check which payments need backfilling
SELECT
  ps.id,
  ps.flat_id,
  ps.screenshot_url,
  ps.created_at
FROM payment_submissions ps
LEFT JOIN payment_image_signals pis ON pis.payment_submission_id = ps.id
WHERE ps.screenshot_url IS NOT NULL
  AND pis.id IS NULL
ORDER BY ps.created_at ASC;
```

---

## Best Practices

1. ✅ **Run backfill once** after initial image signals setup
2. ✅ **Keep browser tab open** during processing
3. ✅ **Review activity log** for any patterns in failures
4. ✅ **Check duplicate results** after completion
5. ✅ **Re-run if interrupted** (safe and resumable)

---

## FAQ

**Q: Do I need to backfill?**
A: Recommended! Without it, duplicate detection only works for new submissions.

**Q: How long does it take?**
A: Depends on number of payments. Typically 5-15 minutes for average databases.

**Q: Can I cancel mid-way?**
A: Yes! Just close the tab. Progress is saved. Re-run later to continue.

**Q: What if images are deleted from storage?**
A: Those payments will show 'failed' status. This is expected and safe.

**Q: Will this affect live users?**
A: No! Processing happens in background. Users can submit payments normally.

**Q: Can I run this multiple times?**
A: Yes! It skips already-processed payments automatically.

---

## Conclusion

The backfill tool provides a **safe, automated way** to populate image signals for existing payment submissions. It's:

✅ **Non-disruptive** - Doesn't affect live operations
✅ **Resumable** - Safe to stop and restart
✅ **Transparent** - Full activity logging
✅ **Efficient** - Batch processing with smart skipping

Run it once after setup, then let automatic analysis handle new submissions going forward!
