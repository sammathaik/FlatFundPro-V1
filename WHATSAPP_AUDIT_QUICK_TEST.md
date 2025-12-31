# WhatsApp Communication Audit - Quick Test Guide

## How to Access

### For Super Admin
1. Log in as Super Admin
2. Navigate to **"WhatsApp Audit"** in the sidebar
3. Select an apartment from the dropdown
4. View WhatsApp communications

### For Apartment Admin
1. Log in as Apartment Admin
2. Navigate to **"WhatsApp Audit"** in the sidebar
3. Communications load automatically for your apartment

---

## What You Should See

### Key Visual Elements

#### 1. Page Header
- Green WhatsApp icon
- Title: "WhatsApp Communication Audit"
- Subtitle explaining governance purpose

#### 2. Sandbox Mode Banner (Amber)
```
⚠ Gupshup Sandbox Mode
All WhatsApp communications shown here are sent via GUPSHUP_SANDBOX.
This is a test environment...
```

#### 3. Apartment Selector (Super Admin Only)
```
🏢 Select Apartment
[Dropdown: Choose apartment to view WhatsApp communications...]
```

#### 4. Summary Statistics (6 Cards)
```
┌─────────┬──────┬────────┬─────────┬──────────┬─────────────┐
│ Total   │ Sent │ Failed │ Skipped │ Opted In │ No Opt-in   │
├─────────┼──────┼────────┼─────────┼──────────┼─────────────┤
│   45    │  32  │   1    │   12    │    32    │     13      │
└─────────┴──────┴────────┴─────────┴──────────┴─────────────┘
```

#### 5. Communications Table
```
┌────────────────┬─────────┬───────────────┬────────────┬────────────┬──────────────────┬────────────────────┬─────────┐
│ Date & Time    │ Flat    │ Resident      │ Mobile     │ Opt-in     │ Trigger          │ Status             │ Actions │
├────────────────┼─────────┼───────────────┼────────────┼────────────┼──────────────────┼────────────────────┼─────────┤
│ 31 Dec 2024    │ A1-301  │ Ramesh Kumar  │ ******3210 │ ✓ Opted In │ Payment Approved │ ✓ Sent via Sandbox │ Details │
│ 10:30 AM       │         │               │            │            │                  │                    │         │
├────────────────┼─────────┼───────────────┼────────────┼────────────┼──────────────────┼────────────────────┼─────────┤
│ 31 Dec 2024    │ B2-1104 │ Priya Shah    │ ******7890 │ ⊗ No Opt-in│ Payment Approved │ ⊗ Not Sent - No    │ Details │
│ 10:30 AM       │         │               │            │            │                  │    Opt-in          │         │
└────────────────┴─────────┴───────────────┴────────────┴────────────┴──────────────────┴────────────────────┴─────────┘
```

---

## Test Scenarios

### Scenario 1: Super Admin - Apartment Selection

**Steps:**
1. Log in as Super Admin
2. Click "WhatsApp Audit" in sidebar
3. Verify empty state shows: "Select an Apartment to View WhatsApp Communications"
4. Select "Esteem Enclave" from dropdown
5. Verify data loads for that apartment

**Expected:**
- Empty state before selection
- Apartment name shown in summary footer: "Showing X communications for Esteem Enclave"
- All records show data for that apartment only

---

### Scenario 2: Apartment Admin - Auto-Load

**Steps:**
1. Log in as Apartment Admin (e.g., admin@esteemenclave.com)
2. Click "WhatsApp Audit" in sidebar
3. Verify data loads immediately (no selector)

**Expected:**
- No apartment selector visible
- Data loads automatically
- Summary shows correct apartment name
- All records belong to admin's apartment

---

### Scenario 3: Mobile Number Masking

**Steps:**
1. Open WhatsApp Audit
2. Look at "Mobile" column in table

**Expected:**
- All mobile numbers show as: `******XXXX` (last 4 digits only)
- Full number NEVER visible
- Example: `******3210`, `******7890`

---

### Scenario 4: Opt-In Status Display

**Steps:**
1. Open WhatsApp Audit
2. Look at "Opt-in" column

**Expected:**
- Green badge with checkmark: `✓ Opted In`
- Gray badge with X: `⊗ No Opt-in`
- Neutral colors (not success/error)

---

### Scenario 5: Skipped Messages

**Steps:**
1. Open WhatsApp Audit
2. Find records where opt-in = "No Opt-in"
3. Check "Status" column

**Expected:**
- Status shows: `⊗ Not Sent - No Opt-in` (gray badge)
- NOT shown as error or failure
- Clear explanation why message wasn't sent

---

### Scenario 6: Sandbox Badge

**Steps:**
1. Open WhatsApp Audit
2. Look at "Status" column for sent messages

**Expected:**
- Status shows: `✓ Sent via Sandbox` (green badge)
- NOT "Delivered" (misleading)
- Clear indication this is sandbox mode

---

### Scenario 7: Search Functionality

**Steps:**
1. Open WhatsApp Audit
2. Click "Filters" button
3. Enter flat number in search: "A1-301"

**Expected:**
- Only shows records for flat A1-301
- Updates count in summary
- Shows: "Showing X of Y communications for [Apartment]"

---

### Scenario 8: Opt-In Filter

**Steps:**
1. Open WhatsApp Audit
2. Click "Filters"
3. Select "Opted In" from opt-in dropdown

**Expected:**
- Only shows records where opt-in = Yes
- Updates summary stats
- Export includes only filtered records

---

### Scenario 9: Details Expansion

**Steps:**
1. Open WhatsApp Audit
2. Click "Details" button on any record

**Expected:**
- Row expands showing:
  - Apartment Name
  - Template Name
  - Sent At timestamp
  - Payment Amount (if linked)
  - Payment Date (if linked)
  - Error Details (if failed)
  - Message Preview (full WhatsApp message)
- Close button at bottom

---

### Scenario 10: CSV Export

**Steps:**
1. Open WhatsApp Audit
2. Select apartment (Super Admin) or verify data loaded (Admin)
3. Click "Export CSV" button

**Expected:**
- File downloads: `whatsapp-audit-[apartment-name]-[date].csv`
- Contains columns: Date, Time, Flat, Resident, Mobile, Opt-in, Trigger, Status, Payment Amount
- Mobile numbers are masked in CSV
- Opens correctly in Excel

---

### Scenario 11: Dispute Resolution Workflow

**Scenario:**
Resident calls: "I never received WhatsApp notification about my payment approval"

**Steps:**
1. Open WhatsApp Audit
2. Enter resident's flat number in search: "B2-1104"
3. Find payment approval record
4. Check opt-in status

**Expected Outcome A (Opted In, Message Sent):**
- Status: "Sent via Sandbox"
- Opt-in: "✓ Opted In"
- Response: "Message was sent to your number ******7890 on [date]. Please check your WhatsApp."

**Expected Outcome B (No Opt-in, Message Skipped):**
- Status: "Not Sent - No Opt-in"
- Opt-in: "⊗ No Opt-in"
- Response: "Your WhatsApp opt-in is not active. Would you like to activate it?"

**Expected Outcome C (Opted In, Send Failed):**
- Status: "Sandbox Failed"
- Opt-in: "✓ Opted In"
- Error: [Shows error details]
- Response: "There was an issue sending. Let me resend or use email instead."

**Resolution Time:** < 2 minutes

---

## Visual Checks

### Colors Should Be:

| Element | Color | Why |
|---------|-------|-----|
| Opted In badge | Green | Neutral confirmation |
| No Opt-in badge | Gray | Neutral absence (not error) |
| Sent status | Green | Success |
| Failed status | Red | Error |
| Skipped status | Gray | Not an error, just skipped |
| Sandbox banner | Amber | Warning/info |

### Icons Should Be:

| Element | Icon | Unicode |
|---------|------|---------|
| WhatsApp Audit | MessageSquare | - |
| Apartment | Building2 | 🏢 |
| Flat | Home | 🏠 |
| Resident | User | 👤 |
| Mobile | Phone | 📱 |
| Date | Calendar | 📅 |
| Opted In | CheckCircle2 | ✓ |
| No Opt-in | XCircle | ⊗ |
| Sandbox Alert | AlertCircle | ⚠ |

---

## Common Issues & Solutions

### Issue 1: Empty View (Super Admin)
**Symptom:** No data showing
**Cause:** No apartment selected
**Solution:** Select apartment from dropdown at top

### Issue 2: Empty View (Apartment Admin)
**Symptom:** No data showing even though apartment auto-selected
**Cause:** No WhatsApp communications exist for this apartment yet
**Solution:** Create test payment submission to trigger WhatsApp notification

### Issue 3: All Mobile Numbers Show as "N/A"
**Symptom:** Mobile column shows "N/A" instead of masked numbers
**Cause:** Residents haven't added mobile numbers in flat_email_mappings
**Solution:** Go to "Occupants" tab and add mobile numbers

### Issue 4: All Opt-in Status Shows "Unknown"
**Symptom:** Opt-in badge shows gray "Unknown" instead of Yes/No
**Cause:** `whatsapp_opt_in_status` field not populated in communication_logs
**Solution:** Check that notification triggers are setting this field correctly

### Issue 5: Export Button Not Working
**Symptom:** CSV export doesn't download
**Cause:** Browser blocking downloads or apartment not selected
**Solution:** Enable downloads in browser, ensure apartment is selected

---

## Database Verification

To verify data exists, run this SQL in Supabase:

```sql
-- Check if WhatsApp communications exist
SELECT
  a.apartment_name,
  cl.flat_number,
  cl.recipient_name,
  mask_mobile_number(cl.recipient_mobile) as mobile_masked,
  cl.whatsapp_opt_in_status,
  cl.status,
  cl.communication_type,
  cl.created_at
FROM communication_logs cl
LEFT JOIN apartments a ON cl.apartment_id = a.id
WHERE cl.communication_channel = 'WHATSAPP'
ORDER BY cl.created_at DESC
LIMIT 20;
```

**Expected:**
- At least a few rows returned
- `apartment_name` populated (not NULL)
- `mobile_masked` shows `******XXXX` format
- `whatsapp_opt_in_status` is TRUE or FALSE (not NULL)
- `status` is SENT, DELIVERED, FAILED, or SKIPPED

---

## Quick Smoke Test (2 Minutes)

1. ✅ Navigate to WhatsApp Audit
2. ✅ Select apartment (Super Admin) or verify auto-load (Admin)
3. ✅ See sandbox banner (amber)
4. ✅ See summary stats (6 cards with numbers)
5. ✅ See table with columns: Date, Flat, Resident, Mobile, Opt-in, Trigger, Status, Actions
6. ✅ Verify mobile numbers masked (******XXXX)
7. ✅ Verify opt-in badges show (green or gray)
8. ✅ Click "Details" on one record → expands
9. ✅ Click "Export CSV" → file downloads
10. ✅ Click "Filters" → filter panel opens

**If all 10 pass: System is working correctly**

---

## Comparison: Old vs New

### Before (WhatsApp Notifications Preview)

**Purpose:** Testing & message preview
**Location:** "WhatsApp Notifications" tab
**Features:**
- Test Send button
- Message preview modal
- Status tracking
- Full phone numbers visible (privacy issue)

**Use Case:** Development testing

---

### After (WhatsApp Communication Audit)

**Purpose:** Governance & audit trail
**Location:** "WhatsApp Audit" tab
**Features:**
- Apartment selector (Super Admin)
- Flat-level context
- Opt-in status visibility
- Masked mobile numbers
- Sandbox awareness
- Dispute resolution
- Export for compliance

**Use Case:** Production operations & committee governance

---

## Next Steps After Testing

1. **Train Admins**
   - Show them the new "WhatsApp Audit" tab
   - Explain opt-in status badges
   - Practice dispute resolution workflow

2. **Committee Review**
   - Show opt-in coverage stats
   - Explain sandbox vs production
   - Review sample audit records

3. **Document Procedures**
   - How to handle "no opt-in" disputes
   - How to export audit reports
   - When to use Audit vs Preview

4. **Prepare for Production**
   - Once sandbox testing complete
   - Transition to production WhatsApp
   - Same audit interface will work

---

**Testing Date:** 31 December 2024
**Component:** WhatsAppCommunicationAudit
**Status:** ✅ Ready for Testing
