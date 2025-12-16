# Email Reminder System - Debugging Guide

## Issue Identified: Button Not Visible

### Root Cause
The "Send Reminders" button was hidden because `allowManagement={false}` was set in `AdminPaymentStatusTab.tsx`. This prevented admins from seeing or using the reminder feature.

### Fix Applied
Changed `allowManagement={false}` to `allowManagement={true}` in:
- File: `src/components/admin/AdminPaymentStatusTab.tsx`
- Line: 19

## How the System Fetches Data

### Data Flow Diagram
```
Admin clicks "Send Reminders"
        ↓
Frontend calls Edge Function
        ↓
Edge Function authenticates user
        ↓
Edge Function calls RPC: get_flats_without_payment()
        ↓
RPC queries database:
  - Joins flat_numbers with flat_email_mappings
  - Filters out flats with Approved payments
  - Returns flats needing reminders
        ↓
Edge Function sends emails via Resend API
        ↓
Results logged in email_reminders table
```

### Database Query Logic

The `get_flats_without_payment()` RPC function executes this query:

```sql
SELECT COALESCE(json_agg(
  json_build_object(
    'flat_id', fn.id,
    'flat_number', fn.flat_number,
    'block_name', bbp.block_name,
    'email', fem.email,
    'mobile', fem.mobile,
    'occupant_type', fem.occupant_type,
    'collection_name', ec.collection_name,
    'payment_type', ec.payment_type,
    'amount_due', ec.amount_due,
    'due_date', ec.due_date,
    'daily_fine', ec.daily_fine
  )
), '[]'::json)
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id AND fem.apartment_id = p_apartment_id
CROSS JOIN expected_collections ec
WHERE bbp.apartment_id = p_apartment_id
AND ec.id = p_expected_collection_id
AND fem.email IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM payment_submissions ps
  WHERE ps.flat_id = fn.id
  AND ps.apartment_id = p_apartment_id
  AND ps.expected_collection_id = p_expected_collection_id
  AND ps.status = 'Approved'
)
```

**Key Filters:**
1. ✅ Only flats with registered email addresses (`fem.email IS NOT NULL`)
2. ✅ Only flats WITHOUT Approved payment submissions
3. ✅ Must match the specific apartment and collection

## Troubleshooting Steps

### 1. Check if Button is Visible

**Expected:** After the fix, you should see a blue "Send Reminders" button next to each active collection.

**Location:** Admin Dashboard → Payment Status tab → Active Collections section

**If button still not visible:**
- Clear browser cache and reload
- Check browser console for JavaScript errors
- Verify you're logged in as an admin (not super admin or occupant)

### 2. Verify Database Setup

Run this query to check your setup:

```sql
-- Check active collections with email mappings
SELECT
  a.apartment_name,
  ec.collection_name,
  COUNT(DISTINCT fn.id) as total_flats,
  COUNT(DISTINCT fem.flat_id) as flats_with_email,
  COUNT(DISTINCT CASE WHEN ps.status = 'Approved' THEN ps.flat_id END) as flats_paid
FROM expected_collections ec
JOIN apartments a ON ec.apartment_id = a.id
JOIN buildings_blocks_phases bbp ON bbp.apartment_id = a.id
JOIN flat_numbers fn ON fn.block_id = bbp.id
LEFT JOIN flat_email_mappings fem ON fem.flat_id = fn.id AND fem.apartment_id = a.id
LEFT JOIN payment_submissions ps ON ps.flat_id = fn.id
  AND ps.expected_collection_id = ec.id
  AND ps.status = 'Approved'
WHERE ec.is_active = true
GROUP BY a.apartment_name, ec.collection_name;
```

**What to check:**
- ✅ `flats_with_email` should be > 0 (if 0, no emails will be sent)
- ✅ `flats_paid` should be less than `flats_with_email` (otherwise no reminders needed)

### 3. Test Email Addresses

Check that email addresses are registered:

```sql
SELECT
  fn.flat_number,
  bbp.block_name,
  fem.email,
  fem.occupant_type
FROM flat_email_mappings fem
JOIN flat_numbers fn ON fem.flat_id = fn.id
JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
WHERE fem.apartment_id = 'YOUR_APARTMENT_ID'
AND fem.email IS NOT NULL
ORDER BY fn.flat_number;
```

### 4. Check Edge Function Logs

If emails aren't being sent, check the Edge Function logs in Supabase:

1. Go to Supabase Dashboard
2. Navigate to Edge Functions → send-payment-reminders
3. Click on "Logs" tab
4. Look for error messages

**Common errors:**
- `Access denied` - User not authenticated or not an admin
- `Missing authorization header` - Session expired
- `Failed to fetch flats` - RPC function error
- Resend API errors - Check email format or API key

### 5. Test RPC Function Manually

You can't test the RPC function directly via SQL (it requires authentication), but you can check if it exists:

```sql
-- Verify function exists
SELECT
  proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname = 'get_flats_without_payment';
```

### 6. Monitor Email Delivery

After sending reminders, check the logs:

```sql
-- View recent reminders
SELECT
  er.sent_at,
  er.recipient_email,
  fn.flat_number,
  bbp.block_name,
  er.status,
  er.error_message
FROM email_reminders er
LEFT JOIN flat_numbers fn ON er.flat_id = fn.id
LEFT JOIN buildings_blocks_phases bbp ON fn.block_id = bbp.id
WHERE er.sent_at >= CURRENT_DATE
ORDER BY er.sent_at DESC;
```

**Status meanings:**
- `sent` ✅ - Email sent successfully
- `failed` ❌ - Email sending failed (check error_message)
- `bounced` 📧 - Email bounced (invalid address)

## Common Error Messages & Solutions

### Error: "Access denied"
**Cause:** User is not authenticated as admin or super admin
**Solution:**
- Verify you're logged in
- Check that your user exists in the `admins` table with status='active'
- Refresh your session by logging out and back in

### Error: "Failed to send reminders"
**Cause:** Edge function encountered an error
**Solution:**
- Check Edge Function logs in Supabase dashboard
- Verify Resend API key is configured
- Check network connectivity

### Error: "All flats have submitted payment confirmation"
**Cause:** All flats already have approved payments
**Solution:** This is expected behavior - no action needed!

### No emails received
**Possible causes:**
1. **Check spam/junk folder** - Emails might be filtered
2. **Invalid email addresses** - Verify emails in flat_email_mappings
3. **Resend API limits** - Check if you've exceeded free tier (3,000/month)
4. **Email not registered** - User's email might not be in flat_email_mappings

### Button shows "Sending..." but nothing happens
**Cause:** Edge function hanging or timing out
**Solution:**
- Check browser console for errors (F12)
- Check Edge Function logs in Supabase
- Verify network tab shows request completing
- Check if apartment has too many flats (might timeout)

## Testing Checklist

Before reporting an issue, verify:

- [ ] Button is visible on Payment Status tab
- [ ] Clicking button shows confirmation dialog
- [ ] After confirming, button shows "Sending..."
- [ ] Success/error message appears after sending
- [ ] At least one flat has email address registered
- [ ] At least one flat does NOT have Approved payment
- [ ] User is logged in as admin with proper permissions
- [ ] Browser console has no JavaScript errors
- [ ] Edge Function logs show no errors

## Performance Considerations

**Sending to many flats:**
- Emails are sent sequentially (one after another)
- Expect ~1-2 seconds per email
- For 100 flats: ~2-3 minutes total
- Edge functions have 150-second timeout (supports ~75 emails max)

**If you need to send to more than 75 flats:**
Consider implementing batch processing or background jobs.

## Support & Next Steps

If issues persist after following this guide:

1. **Check browser console** (F12 → Console tab)
2. **Check Edge Function logs** (Supabase Dashboard → Edge Functions)
3. **Check email_reminders table** for error messages
4. **Verify Resend dashboard** for delivery status

**Still need help?**
Provide:
- Error message from browser console
- Edge Function log output
- Database query results from troubleshooting section
- Number of flats with emails registered

---

**Status:** ✅ Fix Applied - Button Now Visible to Admins

**Last Updated:** 2025-12-16
