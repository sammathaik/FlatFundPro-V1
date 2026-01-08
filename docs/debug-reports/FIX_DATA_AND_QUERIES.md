# Fix Data and Diagnostic Queries

## Issues Fixed

### 1. SQL Query Error Fixed
**Problem**: `EXTRACT(DAY FROM (CURRENT_DATE - ec.due_date))` was causing an error because date subtraction in PostgreSQL returns an integer (number of days), not an interval.

**Fix**: Changed to `(CURRENT_DATE - ec.due_date)::integer` which directly gives the number of days.

**Files Fixed**:
- `CHECK_FLAT_F21.sql` - Fixed all instances of the EXTRACT error

### 2. Payment Quarter Data Fix
**Problem**: Some payment_submissions might have NULL payment_quarter values, which would prevent proper matching in the payment status dashboard.

**Fix**: Created migration `20251116010000_fix_payment_quarter_data.sql` that:
- Ensures the trigger exists and is working
- Updates all NULL payment_quarter values
- Verifies no NULL values remain
- Ensures future submissions always have payment_quarter set

## How to Apply Fixes

### Step 1: Run the Data Fix Migration

1. Go to Supabase Dashboard → SQL Editor
2. Open the file: `supabase/migrations/20251116010000_fix_payment_quarter_data.sql`
3. Copy and paste the entire SQL into the SQL Editor
4. Click "Run"
5. Check the output - you should see messages like:
   - "All payment_submissions now have payment_quarter set"
   - No warnings about NULL values

### Step 2: Verify the Fix

Run this query to check if any NULL values remain:

```sql
SELECT COUNT(*) as null_count
FROM payment_submissions
WHERE payment_quarter IS NULL;
```

This should return `0`.

### Step 3: Test the Diagnostic Queries

Now you can run the diagnostic queries without errors:

1. **Quick Check**: Run `QUICK_CHECK_F21.sql` - This should work without errors now
2. **Detailed Check**: Run `CHECK_FLAT_F21.sql` - This should also work without errors

## What the Migration Does

1. **Verifies Trigger**: Checks if `trigger_set_payment_quarter` exists, creates it if missing
2. **Fixes Existing Data**: Updates all records with NULL payment_quarter using the calculate_payment_quarter function
3. **Validates**: Checks that no NULL values remain
4. **Ensures Future Data**: Makes sure the trigger function is correct for future submissions

## Form Submission

The form submission code doesn't need changes - the database trigger automatically sets `payment_quarter` when a payment is submitted. The trigger:
- Uses `payment_date` if provided by the user
- Falls back to `created_at` if `payment_date` is NULL
- Always calculates the quarter in format "Q1-2025", "Q2-2025", etc.

## Testing

After running the migration:

1. **Check existing data**: All payment_submissions should have payment_quarter set
2. **Test new submission**: Submit a new payment through the form and verify payment_quarter is automatically set
3. **Run diagnostic queries**: The queries should now work without SQL errors
4. **Check payment status**: The payment status dashboard should now correctly match payments to expected collections

## Troubleshooting

If you still see issues:

1. **Check trigger exists**:
   ```sql
   SELECT tgname FROM pg_trigger 
   WHERE tgrelid = 'payment_submissions'::regclass 
   AND tgname = 'trigger_set_payment_quarter';
   ```

2. **Check function exists**:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'set_payment_quarter';
   ```

3. **Manually update a record**:
   ```sql
   UPDATE payment_submissions 
   SET payment_quarter = calculate_payment_quarter(payment_date, created_at)
   WHERE id = 'your-payment-id-here';
   ```

4. **Check for NULL values**:
   ```sql
   SELECT id, name, payment_date, created_at, payment_quarter
   FROM payment_submissions
   WHERE payment_quarter IS NULL
   LIMIT 10;
   ```


