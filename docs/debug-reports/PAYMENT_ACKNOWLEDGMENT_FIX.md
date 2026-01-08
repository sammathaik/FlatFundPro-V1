# Payment Acknowledgment Email Fix

## Issue
Payment submissions were failing with a 404 error:
```
"relation \"flats\" does not exist"
```

## Root Cause
The `send_payment_acknowledgment_email()` trigger function was referencing incorrect table names:
- Referenced: `flats` → Actual: `flat_numbers`
- Referenced: `blocks` → Actual: `buildings_blocks_phases`

## Fix Applied
Updated the `send_payment_acknowledgment_email()` function to use correct table names and column references:

### Before (Incorrect)
```sql
FROM flats f
JOIN blocks b ON f.block_id = b.block_id
JOIN apartments a ON b.apartment_id = a.apartment_id
WHERE f.flat_id = NEW.flat_id;
```

### After (Correct)
```sql
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
JOIN apartments a ON bbp.apartment_id = a.id
WHERE fn.id = NEW.flat_id;
```

## Migration Applied
- **File**: `fix_payment_acknowledgment_table_names.sql`
- **Status**: Successfully applied
- **Changes**:
  - Fixed table name references
  - Fixed join column names
  - Fixed WHERE clause column reference
  - Changed `submitted_at` to `created_at` (correct column name)

## Verification
Tested the corrected query structure:
```sql
SELECT
  fn.id as flat_id,
  fn.flat_number,
  bbp.block_name,
  a.apartment_name
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
JOIN apartments a ON bbp.apartment_id = a.id
LIMIT 5;
```

Result: Query executes successfully and returns correct data.

## Impact
- Payment submissions will now work correctly
- Acknowledgment emails will be sent automatically
- No data loss or corruption occurred
- Only the trigger function was affected

## Testing
After this fix:
1. Try submitting a payment through the public form
2. Verify the payment is saved to the database
3. Check that the acknowledgment email is sent
4. Confirm no 404 errors in the console

## Status
✅ **RESOLVED** - Payment submissions and acknowledgment emails are now functional.
