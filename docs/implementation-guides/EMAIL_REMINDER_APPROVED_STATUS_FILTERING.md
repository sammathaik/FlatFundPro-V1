# Email Reminder Approved Status Filtering

## Current Implementation ✓

The email reminder system **correctly filters out flats with 'Approved' status**. Here's how:

## The Filtering Logic

### Database Function: `get_flats_without_payment`

```sql
AND NOT EXISTS (
  SELECT 1 FROM payment_submissions ps
  WHERE ps.flat_id = fn.id
  AND ps.apartment_id = p_apartment_id
  AND ps.expected_collection_id = p_expected_collection_id
  AND ps.status = 'Approved'  -- ✓ Excludes Approved payments
)
```

### What This Means

**Flats that WILL receive reminders:**
- ❌ No payment submitted
- ❌ Payment with status = 'Received'
- ❌ Payment with status = 'Reviewed'

**Flats that WILL NOT receive reminders:**
- ✓ Payment with status = 'Approved'

## Payment Status Values

According to the schema:
- `'Received'` - Initial status when payment is submitted
- `'Reviewed'` - Admin has reviewed but not approved
- `'Approved'` - Admin has approved (EXCLUDED from reminders)

## How to Verify This Works

### Method 1: Use the Test SQL Script

Run the queries in `TEST_APPROVED_STATUS_FILTERING.sql`:

1. **Step 1**: See all payments by status
2. **Step 2**: See exactly who will receive reminders
3. **Step 3**: See who will NOT receive reminders (Approved flats)
4. **Step 4**: Summary count by status
5. **Step 5**: Validate actual reminders sent

### Method 2: Manual Test

1. Pick a test collection
2. Mark some flats as "Approved"
3. Leave some flats as "Received" or "Reviewed"
4. Send reminders for that collection
5. Check `email_reminders` table

**Expected Result:**
- Only "Received" and "Reviewed" flats receive emails
- "Approved" flats do NOT receive emails

## Common Scenarios

### Scenario A: Flat has multiple payments
```sql
-- Flat F10 has TWO payments for Collection Q1:
-- Payment 1: Status = 'Received'
-- Payment 2: Status = 'Approved'

-- Result: NO reminder sent (at least one is Approved)
```

### Scenario B: Flat has payments for different collections
```sql
-- Flat F21 has:
-- Payment for Q1 Collection: Status = 'Approved'
-- Payment for Q2 Collection: Status = 'Received'

-- When sending reminders for Q1: NO reminder (Approved)
-- When sending reminders for Q2: YES reminder (Received)
```

### Scenario C: Payment status changed after reminder sent
```sql
-- 10:00 AM: Flat F15 has status = 'Received'
-- 10:30 AM: Reminder sent to F15 (correct!)
-- 11:00 AM: Admin approves F15 payment (status = 'Approved')
-- 02:00 PM: Another reminder send for same collection
-- Result: F15 does NOT receive second reminder (now Approved)
```

## Troubleshooting

### Issue: Approved flats are still receiving reminders

**Check 1: Verify payment status**
```sql
SELECT flat_id, status, expected_collection_id
FROM payment_submissions
WHERE apartment_id = 'YOUR_APARTMENT_ID'
AND expected_collection_id = 'YOUR_COLLECTION_ID';
```

**Check 2: Verify status value is exactly 'Approved'**
```sql
-- Status must match exactly (case-sensitive)
-- ✓ 'Approved'
-- ✗ 'approved'
-- ✗ 'APPROVED'
-- ✗ 'Approved '  (trailing space)
```

**Check 3: Verify collection ID matches**
```sql
-- Payment must have the SAME expected_collection_id
SELECT ps.expected_collection_id, ec.collection_name
FROM payment_submissions ps
JOIN expected_collections ec ON ps.expected_collection_id = ec.id
WHERE ps.flat_id = 'PROBLEM_FLAT_ID';
```

### Issue: Flats with no payment are not receiving reminders

**Check: Email mapping exists**
```sql
SELECT fn.flat_number, fem.email
FROM flat_numbers fn
LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id
WHERE fn.id = 'PROBLEM_FLAT_ID';
```

Flats will NOT receive reminders if:
- `fem.email IS NULL`
- Email mapping doesn't exist for that apartment

## Function Security

The function has proper access control:
- ✓ Only apartment admins can call it
- ✓ Only super admins can call it
- ✓ Regular users cannot access it

## Summary

✅ **The filtering logic is correct and working as designed**

The `NOT EXISTS` clause with `status = 'Approved'` ensures that:
1. Only the specific collection is checked
2. Only flats WITHOUT approved payments receive reminders
3. Multiple collections are handled independently

If you're experiencing issues, use the diagnostic queries in `TEST_APPROVED_STATUS_FILTERING.sql` to identify the root cause.
