# Testing Share Collection Status - Quick Guide

## Prerequisites

✓ Edge function deployed
✓ Build completed successfully
✓ Resident email addresses configured in database

---

## Step-by-Step Testing

### 1. Access the Feature

**Location**: Admin Dashboard → Collection Management

1. Login as admin
2. Navigate to Collection Management
3. Find "Maintenance Collection Q4 - 2026"
4. Click the "Share" or "Share Collection Status" button

### 2. Generate Share Link

1. Modal opens showing status preview
2. Verify the grid shows correct statuses:
   - G-19: **Under Review** (blue badge) ✓
   - Other flats: Not Paid (gray badge)
3. Click "Generate Share Link"
4. Wait for link generation to complete

### 3. Send to Residents

1. Click "Send to All Residents"
2. Watch for success message: "Sent: X, Failed: Y"
3. Expected result: 5 emails sent (to registered residents)

---

## Verification Steps

### A. Check Edge Function Logs

**Supabase Dashboard → Edge Functions → share-collection-status → Logs**

Look for:
```
=== Share Collection Status: Function Entry ===
Fetching collection details...
Collection loaded: Maintenance Collection Q4 - 2026
Fetching residents...
Found 5 resident mappings
Email recipients: 5
=== Starting Email Delivery ===
✓ Email sent successfully to samm51@yahoo.com
✓ Email sent successfully to merlinsam@gmail.com
...
=== Delivery Complete: Sent=5, Failed=0 ===
```

### B. Check Communication Logs

Run this query in Supabase SQL Editor:

```sql
-- Check communication logs for share collection status
SELECT
  created_at,
  flat_number,
  recipient_email,
  communication_channel,
  status,
  message_subject,
  error_message
FROM communication_logs
WHERE communication_type = 'collection_status_share'
  AND apartment_id = '31cefafb-be45-46ee-8558-a75f9f271923'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results:**
- 5 rows (one per email sent)
- `communication_channel` = 'EMAIL'
- `status` = 'DELIVERED'
- `message_subject` = 'Payment Status Update | Maintenance Collection Q4 - 2026'
- `error_message` = NULL (for successful sends)

### C. Check Email Inbox

**Recipients:**
- samm51@yahoo.com (Flat G-19)
- merlinsam@gmail.com (Flat G-20)
- sammathaik@gmail.com (Flat T-19, T-20)
- tanishsammathai@gmail.com (Flat G-21)

**Expected Email:**
- Subject: "Payment Status Update | Maintenance Collection Q4 - 2026"
- From: "FlatFund Pro <onboarding@resend.dev>"
- Professional HTML template with blue gradient header
- Collection details (name, period, due date)
- "View Collection Status" button with share link
- Footer: "Powered by FlatFund Pro"

---

## Quick Database Check

### Verify Residents are Configured

```sql
-- Check residents with email addresses
SELECT
  fn.flat_number,
  fem.email,
  fem.mobile,
  fem.whatsapp_opt_in,
  bbp.block_name
FROM flat_email_mappings fem
JOIN flat_numbers fn ON fn.id = fem.flat_id
JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
WHERE bbp.apartment_id = '31cefafb-be45-46ee-8558-a75f9f271923'
ORDER BY fn.flat_number;
```

**Expected Results:**
- 5 rows with valid email addresses
- `whatsapp_opt_in` = false for all (no WhatsApp messages will be sent)

### Verify Collection Exists

```sql
-- Check collection details
SELECT
  id,
  collection_name,
  quarter,
  financial_year,
  due_date,
  amount_due
FROM expected_collections
WHERE apartment_id = '31cefafb-be45-46ee-8558-a75f9f271923'
  AND collection_name = 'Maintenance Collection Q4 - 2026';
```

**Expected Results:**
- 1 row with collection ID: `7e5bbfc2-b379-489f-9e9e-bc2d9a3c0760`

---

## Troubleshooting

### Issue: "No emails received"

**Check:**
1. Supabase Edge Function logs - did function execute?
2. `communication_logs` table - are entries being created?
3. Check spam/junk folder
4. Verify RESEND_API_KEY is configured (check edge function logs)

### Issue: "Communication logs empty"

**Check:**
1. Edge function logs for SQL errors
2. Table name is `communication_logs` (not `communication_audit`)
3. RLS policies on `communication_logs` table

### Issue: "Function not found"

**Solution:**
- Ensure edge function is deployed
- Check Supabase Dashboard → Edge Functions
- Function name: `share-collection-status`

### Issue: "WhatsApp not sending"

**Expected:**
- No WhatsApp messages will be sent if all residents have `whatsapp_opt_in = false`
- This is correct behavior - WhatsApp is opt-in only
- Check logs for: "WhatsApp recipients (opt-in): 0"

---

## Success Criteria

✓ Edge function executes without errors
✓ Structured logs visible in Supabase dashboard
✓ 5 entries created in `communication_logs` table
✓ All entries have `status = 'DELIVERED'`
✓ 5 emails received in respective inboxes
✓ Emails have proper formatting and share link works
✓ Share link opens public status page showing G-19 as "Under Review"

---

## Test Data Summary

**Apartment:** Meenakshi Residency
**Apartment ID:** `31cefafb-be45-46ee-8558-a75f9f271923`

**Collection:** Maintenance Collection Q4 - 2026
**Collection ID:** `7e5bbfc2-b379-489f-9e9e-bc2d9a3c0760`

**Recipients:**
- G-19: samm51@yahoo.com
- G-20: merlinsam@gmail.com
- G-21: tanishsammathai@gmail.com
- T-19: sammathaik@gmail.com
- T-20: sammathaik@gmail.com

**Expected Delivery:**
- 5 emails via Resend
- 0 WhatsApp messages (all opted out)
- 5 audit log entries

---

## Notes

- This feature only works in **deployed environments** (not local development)
- Test on your staging or production Supabase instance
- Emails are sent via Resend API (production-ready)
- WhatsApp is opt-in only - no spam messages
- All communication is logged for audit compliance
