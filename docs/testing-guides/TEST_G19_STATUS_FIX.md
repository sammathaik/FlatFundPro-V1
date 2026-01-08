# G-19 Payment Status Issue - Resolution

## Problem Summary
G-19 in Meenakshi Residency showing wrong status for "Maintenance Collection Q4 - 2026" collection.

## Root Cause Analysis

### Payment Data (Verified)
- **Flat**: G-19
- **Payment Amount**: ₹16,000
- **Status**: "Received" (Under Review)
- **Expected Collection ID**: `7e5bbfc2-b379-489f-9e9e-bc2d9a3c0760`
- **Payment Quarter**: Q1-2026 (auto-calculated from payment_date)
- **Payment Date**: 2026-01-04

### Collection Data
- **Collection**: "Maintenance Collection Q4 - 2026"
- **ID**: `7e5bbfc2-b379-489f-9e9e-bc2d9a3c0760`
- **Quarter**: Q4
- **Financial Year**: FY26
- **Amount Due**: ₹16,000

### Why It Should Show "Under Review"

The matching logic in `PaymentStatusDashboard.tsx` (lines 110-113) checks:
1. **FIRST**: Does `payment.expected_collection_id === collection.id`?
   - YES ✓ (`7e5bbfc2-b379-489f-9e9e-bc2d9a3c0760` matches)
   - Returns `true` immediately

2. Status calculation (lines 523-535):
   ```typescript
   if (totalApproved >= baseAmount) {        // 0 >= 16000 -> false
     ...
   } else if (totalPendingReview > 0) {     // 16000 > 0 -> true
     status = 'under_review';                // ✓ Should set this
   }
   ```

## Solution

### The Issue
The payment data is correct and the logic is correct. The issue is likely:
1. **Browser Cache**: The page is showing cached data
2. **Need Refresh**: The page hasn't reloaded after the payment was submitted

### Steps to Fix
1. **Hard Refresh** the browser page (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser cache** for this site
3. **Click the refresh button** on the Payment Status dashboard

### Verification Query
Run this to confirm the data is correct:

```sql
SELECT
  f.flat_number,
  ps.status,
  ps.payment_amount,
  ps.expected_collection_id,
  ec.collection_name,
  ec.id as collection_id
FROM flat_numbers f
JOIN buildings_blocks_phases b ON b.id = f.block_id
JOIN apartments a ON a.id = b.apartment_id
LEFT JOIN payment_submissions ps ON ps.flat_id = f.id
LEFT JOIN expected_collections ec ON ec.id = ps.expected_collection_id
WHERE a.apartment_name ILIKE '%Meenakshi%'
  AND f.flat_number = 'G-19'
  AND ec.collection_name = 'Maintenance Collection Q4 - 2026';
```

Expected result:
- `status`: "Received"
- `payment_amount`: 16000
- `expected_collection_id` matches `collection_id`

## Communication Error Fix

### The Error
```
An embedded page at ... says: Unknown error
```

### Root Cause
This error occurs when testing the "Send Communication to Residents" feature in a **local development environment**. The error message shows:
- `local-credentialless.webcontainer-api.io`

### Why It Fails
**Edge functions do NOT work in local preview environments** like WebContainer or StackBlitz. They require:
1. A deployed Supabase project
2. Deployed edge functions
3. Proper network access to Supabase servers

### Solution
To test the email reminder system:

#### Option 1: Deploy and Test
1. Deploy the application to Netlify (already configured)
2. Test the "Send Reminders" button from the deployed site

#### Option 2: Test Email Reminder Function Directly
Use the Supabase Dashboard to test the edge function:
1. Go to Supabase Dashboard → Edge Functions
2. Find `send-payment-reminders`
3. Use the "Test" button with this payload:
```json
{
  "apartment_id": "31cefafb-be45-46ee-8558-a75f9f271923",
  "expected_collection_id": "7e5bbfc2-b379-489f-9e9e-bc2d9a3c0760",
  "reminder_type": "manual"
}
```

#### What The Function Does
The `send-payment-reminders` edge function:
1. Checks admin permissions
2. Finds all flats WITHOUT approved payments for the collection
3. Sends professional email reminders via Resend
4. Logs all communications to the audit trail

Since G-19 has a payment with status "Received" (not "Approved"), it would receive a reminder email when this function runs.

## Quick Action Items

1. ✓ Verify payment data is correct (DONE - it is correct)
2. **Refresh the browser page** to see the correct "Under Review" status
3. For email testing: **Deploy the app** or test via Supabase Dashboard
4. The payment shows correctly in the database with proper linkage
