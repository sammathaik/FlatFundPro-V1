# AI Classification Analytics Fix

## Problem

The AI Classification analytics page wasn't displaying any records, even though 2 classifications existed in the database.

**Error:**
```
ERROR: column "count" does not exist
```

**Root Cause:**
The `get_classification_statistics()` function had broken SQL that tried to reference an aggregate function as a column in `jsonb_object_agg()`.

---

## The Broken Function

The original function had this structure:

```sql
SELECT jsonb_build_object(
  'total_classifications', COUNT(*),
  'by_confidence', jsonb_object_agg(confidence_level, count),  -- ❌ count doesn't exist
  ...
)
FROM payment_document_classifications pdc
JOIN payment_submissions ps ON pdc.payment_submission_id = ps.id
WHERE p_apartment_id IS NULL OR ps.apartment_id = p_apartment_id
GROUP BY confidence_level;  -- ❌ Causes multiple rows
```

**Issues:**
1. Referenced `count` as if it were a column, but it was actually `COUNT(*)` aggregate
2. `GROUP BY confidence_level` produced multiple rows instead of one aggregate
3. The outer query couldn't properly aggregate when grouped by confidence level

---

## The Fix

Rewrote the function to use **proper subqueries** for each aggregation:

```sql
CREATE OR REPLACE FUNCTION get_classification_statistics(p_apartment_id uuid DEFAULT NULL)
RETURNS jsonb
AS $$
BEGIN
  SELECT jsonb_build_object(
    'total_classifications', (
      SELECT COUNT(*) FROM ... -- Subquery 1
    ),
    'by_confidence', (
      SELECT jsonb_object_agg(confidence_level, count)
      FROM (
        SELECT confidence_level, COUNT(*) as count  -- ✅ count is now a real column
        FROM ...
        GROUP BY confidence_level
      ) conf
    ),
    'by_document_type', (
      SELECT jsonb_object_agg(document_type, count)
      FROM (
        SELECT document_type, COUNT(*) as count  -- ✅ count is now a real column
        FROM ...
        GROUP BY document_type
      ) dt
    ),
    'total_cost_usd', (SELECT ...),
    'avg_processing_time_ms', (SELECT ...),
    'last_30_days_count', (SELECT ...)
  ) INTO result;

  RETURN result;
END;
$$;
```

**Key Changes:**
1. Each metric uses its own independent subquery
2. GROUP BY operations are isolated within subqueries
3. COUNT(*) is aliased as `count` column in subqueries before aggregation
4. Single result object returned with all statistics

---

## Verification

After the fix, the function now returns correct data:

```json
{
  "total_classifications": 2,
  "by_confidence": {
    "High": 2
  },
  "by_document_type": {
    "Cheque image": 1,
    "Bank transfer confirmation": 1
  },
  "total_cost_usd": 0.04,
  "avg_processing_time_ms": 8896,
  "last_30_days_count": 2
}
```

**Current Statistics:**
- 2 total classifications ✅
- Both are "High" confidence ✅
- 1 cheque image, 1 bank transfer confirmation ✅
- Total AI cost: $0.04 ✅
- Average processing time: ~9 seconds ✅
- All 2 classifications were in last 30 days ✅

---

## Impact

### Before Fix
- AI Classification page showed error ❌
- Statistics couldn't load due to SQL error
- Page appeared broken

### After Fix
- AI Classification page loads successfully ✅
- All statistics display correctly ✅
- Proper breakdown by confidence and document type ✅
- Cost and performance metrics visible ✅

---

## Testing the Fix

### Database Test
```sql
-- Should return statistics object with no errors
SELECT get_classification_statistics(NULL);

-- Test for specific apartment
SELECT get_classification_statistics('your-apartment-uuid');
```

### UI Test
1. Login as apartment admin
2. Click "AI Classification" in navigation
3. **Page should load with statistics** ✅
4. Verify cards show:
   - Total Classifications: 2
   - Total Cost: $0.04
   - Avg Processing Time: 8896ms
   - High Confidence: 2
5. Check charts:
   - Confidence Level: 100% High
   - Document Types: 50% each

---

## Files Modified

### Backend Migration
- `supabase/migrations/fix_classification_statistics_function.sql`
  - Rewrote `get_classification_statistics()` function
  - Fixed SQL aggregation logic
  - Added proper subquery structure

### Build Status
- Build: ✅ Successful
- No TypeScript errors
- No linting issues

---

## Related Issues

This fix resolves:
1. Classification analytics page not loading
2. Database function SQL error
3. Statistics not displaying despite having classification records

This works in conjunction with the earlier fix:
- `CLASSIFICATION_FIELD_FIX.md` - Fixed classification button enablement (other_text vs ocr_text)

Together these fixes make the entire classification system fully functional:
- Classification buttons work ✅
- Manual classification succeeds ✅
- Analytics display correctly ✅

---

## Summary

**Problem:** Broken SQL in statistics function prevented analytics page from loading

**Solution:** Rewrote function with proper subqueries and column aliasing

**Result:** AI Classification analytics now display all 2 existing classifications with full statistics breakdown
