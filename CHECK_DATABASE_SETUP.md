# Database Setup Check

## Issue: 400 Error on Expected Collections Update

If you're getting a 400 error when creating/updating expected collections, run these checks:

### Step 1: Check if `quarter_basis` column exists

Run this in Supabase SQL Editor:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'expected_collections'
  AND column_name = 'quarter_basis';
```

**If no rows returned**, the column is missing. Run this:

```sql
ALTER TABLE expected_collections
  ADD COLUMN IF NOT EXISTS quarter_basis text NOT NULL DEFAULT 'financial'
  CHECK (quarter_basis IN ('financial', 'yearly'));
```

### Step 2: Check for UNIQUE constraint violations

The table has a UNIQUE constraint on:
- `apartment_id`
- `payment_type`
- `financial_year`
- `quarter`

**You cannot have two records with the same combination.**

To check existing records:

```sql
SELECT apartment_id, payment_type, financial_year, quarter, COUNT(*) as count
FROM expected_collections
GROUP BY apartment_id, payment_type, financial_year, quarter
HAVING COUNT(*) > 1;
```

If this returns rows, you have duplicates that need to be resolved.

### Step 3: Verify RLS policies

Check if you have the correct RLS policies:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'expected_collections';
```

You should see policies for:
- Admins can view expected collections
- Admins can manage expected collections
- Public can view expected collections

### Step 4: Test with a simple query

Try this in Supabase SQL Editor (replace with your apartment_id):

```sql
-- Check if you can read
SELECT * FROM expected_collections LIMIT 1;

-- Check if you can insert (replace values)
INSERT INTO expected_collections (
  apartment_id, payment_type, financial_year, quarter, 
  quarter_basis, due_date, amount_due, daily_fine
) VALUES (
  'YOUR_APARTMENT_ID_HERE',
  'maintenance',
  'FY25',
  'Q1',
  'financial',
  '2025-03-31',
  5000,
  50
) RETURNING *;
```

If the INSERT works but the UI doesn't, it's likely a frontend issue.
If the INSERT fails, check the error message for the specific constraint violation.

### Step 5: Run all migrations in order

Make sure both migrations are applied:

1. `20251115120000_add_expected_collections.sql` - Creates the table
2. `20251115123000_add_quarter_basis_to_expected_collections.sql` - Adds quarter_basis column

Run them in the Supabase SQL Editor in order.


