# How to Check Diagnostic Query Results

## Step-by-Step Guide

### 1. Access Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **"SQL Editor"** in the left sidebar
4. Click **"New query"** to create a new SQL query

### 2. Run the Quick Check Query

1. Open the file: `QUICK_CHECK_F21.sql`
2. Copy the entire contents
3. Paste it into the Supabase SQL Editor
4. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)

### 3. Understanding the Results

The query returns 4 result sets. Look at each one:

#### Result Set 1: "F21 FLAT INFO"
- Shows the flat ID, flat number, block name, and apartment name
- **What to check**: Confirm this is the correct flat you're looking for

#### Result Set 2: "F21 PAYMENTS"
- Lists all payment submissions for flat F21
- **What to check**:
  - Are there any payments? (If empty, that's why it shows as unpaid)
  - What is the `payment_type`? (maintenance, contingency, or emergency)
  - What is the `payment_quarter`? (e.g., "Q1-2025", "Q2-2025")
  - What is the `payment_amount`?
  - What is the `status`? (Received, Reviewed, Approved)

#### Result Set 3: "EXPECTED COLLECTIONS"
- Shows all expected collections for the apartment containing F21
- **What to check**:
  - Are there any expected collections? (If empty, no payment status can be calculated)
  - What is the `payment_type`? (should match payment type from Result Set 2)
  - What is the `quarter`? (e.g., "Q1", "Q2")
  - What is the `financial_year`? (e.g., "FY25", "FY26")
  - What is the `amount_due`? (expected payment amount)
  - What is the `due_date`? (when payment was due)

#### Result Set 4: "MATCHING ANALYSIS"
- Shows whether payments match expected collections
- **What to check**:
  - **TYPE CHECK**: Should show "✓ TYPE MATCH" if payment type matches expected type
  - **QUARTER CHECK**: Should show "✓ QUARTER FOUND" if payment quarter contains expected quarter
  - **YEAR CHECK**: Should show "✓ YEAR MATCH" if payment quarter contains the year from financial_year
  - **If all checks show ✓**: The payment should be matched and counted
  - **If any check shows ✗**: That's why the payment isn't being matched

### 4. Common Issues and Solutions

#### Issue 1: No Payments Found
**Symptom**: Result Set 2 is empty
**Solution**: 
- Check if payments were actually submitted for F21
- Verify the flat number is correct (might be "F-21", "Flat 21", etc.)

#### Issue 2: No Expected Collections
**Symptom**: Result Set 3 is empty
**Solution**: 
- Go to Admin → Payment Setup
- Create an expected collection for the quarter you're checking

#### Issue 3: Type Mismatch
**Symptom**: Result Set 4 shows "✗ TYPE MISMATCH"
**Example**: Payment type is "maintenance" but expected collection is "contingency"
**Solution**: 
- Either change the payment type in the payment submission
- Or create/select the correct expected collection type

#### Issue 4: Quarter Mismatch
**Symptom**: Result Set 4 shows "✗ QUARTER NOT FOUND"
**Example**: Payment quarter is "Q1-2025" but expected quarter is "Q2"
**Solution**: 
- Check if payment was made in the correct quarter
- Verify the expected collection quarter is correct

#### Issue 5: Year Mismatch
**Symptom**: Result Set 4 shows "✗ YEAR MISMATCH"
**Example**: Payment quarter is "Q1-2025" but financial_year is "FY26"
**Solution**: 
- Check if payment date is in the correct financial year
- Verify the expected collection financial_year is correct

#### Issue 6: Payment Amount Less Than Expected
**Symptom**: Payment exists and matches, but amount is less than expected
**Check**: Compare `payment_amount` from Result Set 2 with `amount_due` from Result Set 3
**Solution**: 
- If payment is partial, it should show as "Partial" status
- If payment is full or more, it should show as "Paid"

### 5. Running the Detailed Diagnostic Query

For more detailed analysis, use `CHECK_FLAT_F21.sql`:

1. Open the file: `CHECK_FLAT_F21.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Run the query
5. Review each result set (there are 5 result sets in this query)

### 6. Screenshot Example

After running the query, you should see something like:

```
Result Set 1: F21 FLAT INFO
┌──────────┬────────────┬─────────────┬────────────────────┐
│ flat_id  │ flat_number│ block_name  │ apartment_name     │
├──────────┼────────────┼─────────────┼────────────────────┤
│ abc-123  │ F21        │ Block A     │ Meenakshi Residency│
└──────────┴────────────┴─────────────┴────────────────────┘

Result Set 2: F21 PAYMENTS
┌────────────────┬──────────────┬───────────────┬──────────────┐
│ payment_amount │ payment_type │ payment_quarter│ payment_date │
├────────────────┼──────────────┼───────────────┼──────────────┤
│ 5000           │ maintenance  │ Q1-2025      │ 2025-01-15    │
└────────────────┴──────────────┴───────────────┴──────────────┘

Result Set 3: EXPECTED COLLECTIONS
┌──────────────┬─────────┬───────────────┬─────────────┐
│ payment_type │ quarter │ financial_year│ amount_due │
├──────────────┼─────────┼───────────────┼─────────────┤
│ maintenance  │ Q1      │ FY25          │ 5000        │
└──────────────┴─────────┴───────────────┴─────────────┘

Result Set 4: MATCHING ANALYSIS
┌──────────────┬───────────┬───────────┬──────────────┐
│ type_check   │ quarter_  │ year_check│ payment_amount│
│              │ check     │           │              │
├──────────────┼───────────┼───────────┼──────────────┤
│ ✓ TYPE MATCH │ ✓ QUARTER │ ✓ YEAR    │ 5000         │
│              │ FOUND     │ MATCH     │              │
└──────────────┴───────────┴───────────┴──────────────┘
```

### 7. Tips

- **Run queries one at a time** if you're new to SQL
- **Scroll through all result sets** - there are multiple tables of results
- **Take screenshots** of the results to share with support if needed
- **Check the browser console** (F12) for any JavaScript errors when viewing the payment status page

### 8. Need Help?

If you're still having issues after checking the diagnostic queries:

1. Take screenshots of all 4 result sets
2. Note which checks are showing ✗ (mismatches)
3. Share the apartment name, flat number, and quarter you're checking
4. Check the browser console (F12) for any errors on the payment status page


