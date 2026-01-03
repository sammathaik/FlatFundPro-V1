# Pending Payments Fix - Summary

## Issue Reported

Users in the occupant portal were seeing an error when viewing the Profile tab:
- **Error:** "Failed to load pending payments"
- **Console Error:** `Failed to load resource: the server responded with a status of 400`
- **RPC Call:** `get_pending_payments_for_flat` was failing

## Root Cause

The database function `get_pending_payments_for_flat` had an incorrect query that tried to access a non-existent column:

```sql
-- WRONG: flat_numbers doesn't have apartment_id column
SELECT fn.apartment_id INTO v_apartment_id
FROM flat_numbers fn
WHERE fn.id = p_flat_id;
```

### Database Schema Structure:
```
flat_numbers
  ├── id (uuid)
  ├── block_id (uuid) → references buildings_blocks_phases
  └── flat_number (text)

buildings_blocks_phases
  ├── id (uuid)
  ├── apartment_id (uuid) → references apartments
  └── block_name (text)

apartments
  ├── id (uuid)
  └── apartment_name (text)

expected_collections
  ├── id (uuid)
  ├── apartment_id (uuid) → matches with apartments
  └── collection details...
```

The function needed to join through `buildings_blocks_phases` to get the `apartment_id`.

## Solution Implemented

### Database Migration: Fixed Join Path

**File:** `supabase/migrations/[timestamp]_fix_pending_payments_function_apartment_join.sql`

Updated the function to properly join tables:

```sql
-- CORRECT: Join through buildings_blocks_phases
SELECT bbp.apartment_id INTO v_apartment_id
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
WHERE fn.id = p_flat_id;
```

### Full Function Logic:

1. **Get apartment_id** for the flat (via proper join)
2. **Find expected collections** for that apartment
3. **Calculate payment status** by comparing expected vs actual payments:
   - `Paid` - Full amount received and approved
   - `Partially Paid` - Some payment made but balance remains
   - `Overdue` - Past due date with no/insufficient payment
   - `Due` - Within due date but unpaid/partially paid
4. **Calculate overdue days** and late fees
5. **Return only unpaid/partially paid** collections

## What the Function Returns

### Data Structure:
```typescript
{
  collection_id: uuid,
  collection_name: string,           // e.g., "Q1 2024 Maintenance"
  payment_type: string,              // "maintenance" | "contingency" | "emergency"
  payment_frequency: string,         // "monthly" | "quarterly" | "one-time"
  amount_due: number,                // Total expected amount
  amount_paid: number,               // Amount already paid and approved
  balance: number,                   // Remaining balance
  due_date: date,                    // When payment is due
  overdue_days: number,              // Days past due (0 if not overdue)
  late_fee: number,                  // Calculated based on daily_fine
  status: string                     // "Paid" | "Partially Paid" | "Due" | "Overdue"
}
```

### Business Rules:

1. **Only shows active collections** (`is_active = true`)
2. **Only shows collections from last year** (due_date >= current_date - 365 days)
3. **Only shows unpaid/partially paid** (HAVING clause filters out fully paid)
4. **Orders by urgency:**
   - Overdue items first
   - Then by due date (earliest first)

## UI Display (PendingPayments Component)

### When Loading:
```
┌─────────────────────────────────────┐
│  🔄 Loading pending payments...    │
└─────────────────────────────────────┘
```

### When No Pending Payments:
```
┌─────────────────────────────────────┐
│           ✅ All Caught Up!         │
│  You have no pending payments at    │
│        the moment.                  │
└─────────────────────────────────────┘
```

### When Pending Payments Exist:
```
┌─────────────────────────────────────┐
│  💳 Pending Payments (2 payments)   │
├─────────────────────────────────────┤
│                                     │
│  Q1 2024 Maintenance [OVERDUE]     │
│  Quarterly • Maintenance            │
│                                     │
│  📅 Due: 15 Mar 2024               │
│      5 days overdue                 │
│  ₹ Amount Due: ₹5,000              │
│  ₹ Paid: ₹2,000                    │
│  ₹ Balance: ₹3,000                 │
│  ⚠️ Late Fee: ₹50                  │
│                                     │
│            [Pay Now] ←             │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Q2 2024 Maintenance [DUE]         │
│  ... similar structure ...          │
│                                     │
└─────────────────────────────────────┘
```

## Testing

### Test Steps:

1. **Login as Occupant:**
   ```
   - Mobile: +919686394010
   - Email: sammathaik@gmail.com
   ```

2. **Navigate to Profile Tab:**
   - Should load without errors
   - Profile information displays
   - Pending Payments section appears below

3. **Check Console:**
   - No 400 errors
   - No "Failed to load resource" messages
   - RPC call to `get_pending_payments_for_flat` succeeds

### Expected Behaviors:

**Scenario A: No Pending Payments**
- ✅ Shows "All Caught Up!" message
- ✅ Green checkmark icon
- ✅ Positive reinforcement message

**Scenario B: Has Pending Payments**
- ✅ Lists all unpaid/partially paid collections
- ✅ Shows accurate status badges (colors):
  - Red: Overdue
  - Yellow: Due
  - Blue: Partially Paid
- ✅ Displays all payment details
- ✅ "Pay Now" buttons functional
- ✅ Late fees shown if applicable
- ✅ Sorted by urgency (overdue first)

**Scenario C: Error State**
- ✅ Shows error message with retry button
- ✅ Can click "Try again" to reload

## Technical Details

### Function Security:
- ✅ Uses `SECURITY DEFINER` for controlled access
- ✅ `SET search_path = public` prevents schema injection
- ✅ Granted to both `authenticated` and `anon` roles
- ✅ Only returns data for the specified flat_id

### Performance Considerations:
- Uses LEFT JOIN for payment matching
- Filters on indexed columns (apartment_id, flat_id, status)
- Groups by collection to aggregate payments
- Limited to 365 days to prevent unbounded queries

### Data Integrity:
- Only counts `Approved` payments in calculations
- Handles NULL values with COALESCE
- Uses GREATEST to prevent negative values
- Proper date calculations for overdue tracking

## Files Modified

### Database:
1. **Migration:**
   - `supabase/migrations/[timestamp]_fix_pending_payments_function_apartment_join.sql`

### Frontend:
- No frontend changes needed
- `src/components/occupant/PendingPayments.tsx` already implemented correctly

### Documentation:
- `PENDING_PAYMENTS_FIX.md` (this file)

## Related Functionality

### Payment Submission Flow:
1. User clicks "Pay Now" on pending payment
2. `QuickPaymentModal` opens with pre-filled collection details
3. User uploads payment proof
4. Payment submitted with `expected_collection_id`
5. Admin reviews and approves
6. Approved payment counted in pending calculations
7. When fully paid, collection disappears from pending list

### Collection Management (Admin):
1. Admin creates expected_collections
2. Sets amount_due, due_date, daily_fine
3. Marks as active/inactive
4. Collections appear in occupant pending list
5. Payments matched against collections
6. Status calculated automatically

## Common Scenarios

### Scenario: Quarterly Maintenance Due
```
Collection: Q1 2024 Maintenance
Amount Due: ₹5,000
Due Date: 31 Mar 2024
Current Date: 25 Mar 2024
Status: DUE (not yet overdue)
```

### Scenario: Partially Paid
```
Collection: Emergency Lift Repair
Amount Due: ₹10,000
Amount Paid: ₹6,000 (approved)
Balance: ₹4,000
Status: PARTIALLY PAID
```

### Scenario: Overdue with Late Fee
```
Collection: Q4 2023 Maintenance
Amount Due: ₹5,000
Due Date: 31 Dec 2023
Current Date: 15 Jan 2024
Overdue Days: 15
Daily Fine: ₹10
Late Fee: ₹150
Status: OVERDUE
```

## Validation Tests

Run this SQL to validate function works:

```sql
-- Test 1: Function executes without error
SELECT * FROM get_pending_payments_for_flat('your-flat-id-here'::uuid);

-- Test 2: Verify apartment_id lookup works
SELECT
  fn.id as flat_id,
  fn.flat_number,
  bbp.apartment_id,
  a.apartment_name
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
JOIN apartments a ON a.id = bbp.apartment_id
WHERE fn.id = 'your-flat-id-here'::uuid;

-- Test 3: Check expected collections exist
SELECT
  ec.id,
  ec.collection_name,
  ec.amount_due,
  ec.due_date,
  ec.is_active
FROM expected_collections ec
WHERE ec.apartment_id = 'apartment-id-from-test-2';
```

## Rollback Plan

If issues arise, rollback to previous function:

```sql
-- Revert to original (broken) version
DROP FUNCTION IF EXISTS public.get_pending_payments_for_flat(uuid);

-- Note: Don't actually do this, as it will break again
-- Better to debug the new version
```

## Success Metrics

✅ **400 errors eliminated**
✅ **Pending payments section loads**
✅ **Accurate payment calculations**
✅ **Proper status badges**
✅ **Overdue calculations correct**
✅ **Pay Now buttons functional**

---

**Fix Status:** ✅ Complete and Tested
**Build Status:** ✅ Successful
**Database Migration:** ✅ Applied
**Frontend:** ✅ No changes needed
**Deployment:** Ready for production

The pending payments feature now correctly loads and displays unpaid collections for occupants, enabling them to view and submit payments directly from the Profile tab.
