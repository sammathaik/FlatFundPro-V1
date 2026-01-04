# Collection Status Sharing System - Implementation Guide

## Overview

The Collection Status Sharing System allows apartment committee members to transparently communicate payment status for specific collections with all registered residents through secure, read-only visual summaries.

---

## Purpose & Benefits

### For Committees
- **Reduce follow-ups:** Share status once instead of individual WhatsApp messages
- **Increase transparency:** All residents see the same neutral, visual status
- **Save time:** Automated communication to all registered residents
- **Maintain professionalism:** Structured, non-judgmental communication
- **Full auditability:** Every share action is logged in communication audit

### For Residents
- **Clear visibility:** See collection progress at a glance
- **Privacy protected:** Individual amounts are NOT displayed
- **No login required:** Access via simple link
- **Non-pressuring:** Informational only, not enforcement

---

## Architecture & Components

### Database Layer

#### 1. Collection Status Shares Table
**Table:** `collection_status_shares`

Tracks all generated share links with metadata:
- `id` - Unique identifier
- `expected_collection_id` - Links to collection
- `apartment_id` - Links to apartment
- `share_code` - Unique 8-character code for URL
- `created_by` - Admin who created the share
- `expires_at` - Optional expiration (default: 30 days)
- `view_count` - Tracks how many times link was accessed
- `last_viewed_at` - Last access timestamp
- `is_active` - Can be deactivated

**Security:** Full RLS enabled - only admins can create/view shares

#### 2. Database Functions

##### `get_collection_status_summary(p_expected_collection_id)`
Returns payment status for all flats in a collection:
- Building and flat information
- Occupant name (or "Not Registered")
- Payment status: paid, underpaid, overpaid, unpaid
- Total paid amount
- Amount due
- Approved/pending/rejected counts

**Status Logic:**
```sql
CASE
  WHEN total_paid = 0 THEN 'unpaid'
  WHEN total_paid < amount_due THEN 'underpaid'
  WHEN total_paid = amount_due THEN 'paid'
  WHEN total_paid > amount_due THEN 'overpaid'
END
```

##### `create_collection_share_link(p_expected_collection_id, p_apartment_id, p_expires_in_days)`
Generates secure shareable link:
- Creates unique 8-character URL-safe code
- Inserts record into `collection_status_shares`
- Returns `share_id`, `share_code`, `share_url`

##### `get_collection_share_data(p_share_code)`
Public function for link access:
- Validates share code and expiry
- Updates view count and timestamp
- Returns collection details
- **No authentication required**

---

### Frontend Components

#### 1. CollectionStatusGrid
**File:** `src/components/admin/CollectionStatusGrid.tsx`

Visual grid component showing payment status:
- **Color-coded cards:** Green (paid), Yellow (underpaid), Blue (overpaid), Red (unpaid)
- **Grouped by building:** Organized display
- **Interactive tooltips:** Hover for details
- **Legend:** Clear explanation of status indicators
- **Summary statistics:** Counts for each status
- **Privacy mode:** Optional amounts display (off for public)

**Props:**
- `flats: FlatStatus[]` - Array of flat status data
- `showAmounts?: boolean` - Toggle amount visibility (default: false for public)
- `showLegend?: boolean` - Show legend section (default: true)

#### 2. ShareCollectionStatusModal
**File:** `src/components/admin/ShareCollectionStatusModal.tsx`

Admin modal for sharing collection status:

**Step 1: Preview**
- Shows visual status grid as residents will see it
- Displays important notes about privacy and behavior
- Preview button to generate link

**Step 2: Share**
- Displays generated shareable link
- Copy to clipboard functionality
- Open in new tab option
- Send to all residents button
- Success/failure reporting

**Props:**
- `isOpen: boolean` - Modal visibility
- `onClose: () => void` - Close handler
- `collectionId: string` - Collection to share
- `collectionName: string` - Display name
- `apartmentId: string` - Apartment context
- `apartmentName: string` - Display name

#### 3. PublicCollectionStatusPage
**File:** `src/components/PublicCollectionStatusPage.tsx`

Public-facing status view page:
- **No login required**
- Validates share code
- Displays collection information
- Shows status grid with legend
- Informational notes about privacy
- Handles expired links gracefully

**Route:** `/collection-status/:shareCode`

---

### Admin Integration

#### CollectionManagement Component Updates
**File:** `src/components/admin/CollectionManagement.tsx`

Added Share button to active collections:
```tsx
{collection.is_active && (
  <button
    onClick={() => openShareModal(collection)}
    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg"
    title="Share Collection Status"
  >
    <Share2 className="w-5 h-5" />
  </button>
)}
```

**Placement:** Next to "Send Reminder" button, before Edit/Delete
**Visibility:** Only for active collections
**Icon:** Share2 from lucide-react

---

### Communication System

#### Edge Function: share-collection-status
**File:** `supabase/functions/share-collection-status/index.ts`

Handles sending status updates to residents:

**Input:**
```json
{
  "collection_id": "uuid",
  "apartment_id": "uuid",
  "share_code": "ABC12345",
  "share_url": "https://app.flatfundpro.com/collection-status/ABC12345"
}
```

**Process:**
1. Validates authentication (JWT required)
2. Fetches collection and apartment details
3. Gets all registered residents from `flat_email_mappings`
4. Sends emails to all registered residents
5. Sends WhatsApp to opt-in residents only
6. Logs all communications to `communication_audit`

**Email Content:**
- Subject: "Payment Status Update | [Collection Name]"
- Professional HTML template
- Collection details (name, period, due date)
- "View Collection Status" button with share URL
- Privacy note
- FlatFund Pro branding

**WhatsApp Content:**
```
*Payment Status Update*

Maintenance collection update for *[Collection Name]* is now available.

View the current payment status here:
[Share URL]

– FlatFund Pro
[Apartment Name]
```

**Communication Audit Logging:**
```json
{
  "apartment_id": "uuid",
  "channel": "email" | "whatsapp",
  "recipient": "email@example.com" | "phone",
  "communication_type": "collection_status_share",
  "metadata": {
    "collection_id": "uuid",
    "collection_name": "Q1 FY25 Maintenance",
    "share_code": "ABC12345",
    "share_url": "https://..."
  },
  "status": "sent" | "failed"
}
```

---

## User Workflows

### Admin Workflow: Share Collection Status

1. **Navigate to Collection Management**
   - Admin Dashboard → Collection Management

2. **Find Target Collection**
   - Ensure collection is **active** (Share button only visible for active collections)

3. **Click Share Button**
   - Click the purple Share icon next to the collection
   - Modal opens showing preview

4. **Review Preview**
   - See visual status grid as residents will see it
   - Note privacy protections (no amounts shown)
   - Review important notes

5. **Generate Share Link**
   - Click "Generate Share Link"
   - System creates unique code and URL
   - Link valid for 30 days

6. **Share Options:**
   - **Copy Link:** Manual sharing via any channel
   - **Open Link:** Preview in new tab
   - **Send to All Residents:** Automated email + WhatsApp

7. **Send to Residents**
   - Click "Send to All Residents"
   - System sends emails to all registered residents
   - System sends WhatsApp to opt-in residents
   - View sent/failed counts

8. **Close and Track**
   - All communications logged in audit trail
   - View counts tracked automatically

### Resident Experience: View Collection Status

1. **Receive Communication**
   - Email or WhatsApp with share link
   - No login credentials required

2. **Click Share Link**
   - Opens `/collection-status/:shareCode`
   - Public page, no authentication

3. **View Status Grid**
   - See apartment name and collection details
   - View color-coded status for all flats
   - Grouped by building
   - Legend explains status indicators

4. **Understand Status**
   - 🟢 **Green:** Paid in full
   - 🟡 **Yellow:** Partially paid (underpaid)
   - 🔵 **Blue:** Overpaid
   - 🔴 **Red:** Not paid yet

5. **Privacy Protected**
   - Individual payment amounts NOT shown
   - Only status indicators visible
   - Non-judgmental display

---

## Security & Privacy Features

### 1. Link Security
- **Unique codes:** 8-character URL-safe random codes
- **Expiration:** 30-day default expiration
- **Deactivation:** Admins can deactivate links
- **View tracking:** Monitor access patterns

### 2. Data Privacy
- **No amounts displayed:** Only status indicators shown publicly
- **Occupant names:** Generic "Not Registered" for unregistered flats
- **No personal details:** Email/mobile not exposed
- **Aggregated view:** Summary statistics only

### 3. Access Control
- **Public read-only:** No authentication required for viewing
- **Admin creation:** Only admins can create shares
- **RLS enforcement:** Database-level security
- **Audit logging:** Full communication trail

### 4. Communication Privacy
- **Email:** Sent to all registered residents
- **WhatsApp:** Only to explicitly opted-in residents
- **Audit trail:** Every communication logged
- **No spam:** Manual share trigger only

---

## Non-Regression Guarantees

✅ **No Changes To:**
- Payment submission flows
- Payment calculations
- Admin permissions and workflows
- Existing collection management
- OCR, fraud detection, or approval processes
- Resident portal access
- Mobile payment flows

✅ **Additive Only:**
- New Share button added to active collections
- New public route for status viewing
- New database tables for shares
- New edge function for communications
- Existing reminder functionality unchanged

✅ **Communication Logic:**
- Reuses existing email/WhatsApp infrastructure
- Follows same opt-in rules
- Same audit logging patterns
- No duplication of logic

---

## Testing Guide

### Admin Testing

#### 1. Create Collection Share
```sql
-- Prerequisites: Active collection exists
SELECT * FROM expected_collections WHERE is_active = true LIMIT 1;
```

1. Login as admin
2. Navigate to Collection Management
3. Find active collection
4. Click Share (purple icon)
5. Verify modal opens with preview
6. Verify status grid displays correctly
7. Click "Generate Share Link"
8. Verify link created successfully
9. Copy link and open in new incognito tab
10. Verify public page loads without login

#### 2. Send to Residents
1. After generating link
2. Click "Send to All Residents"
3. Verify success message
4. Check communication audit:
```sql
SELECT * FROM communication_audit
WHERE communication_type = 'collection_status_share'
ORDER BY created_at DESC;
```

#### 3. Verify Emails Sent
```sql
-- Check email communications
SELECT
  recipient,
  status,
  created_at,
  metadata->>'collection_name' as collection
FROM communication_audit
WHERE channel = 'email'
  AND communication_type = 'collection_status_share'
ORDER BY created_at DESC;
```

#### 4. Verify WhatsApp Sent (Opt-in Only)
```sql
-- Check WhatsApp communications
SELECT
  recipient,
  status,
  created_at,
  metadata->>'message_id' as message_id
FROM communication_audit
WHERE channel = 'whatsapp'
  AND communication_type = 'collection_status_share'
ORDER BY created_at DESC;
```

### Public Access Testing

#### 1. Valid Link Access
1. Generate share link from admin
2. Open link in incognito browser
3. Verify page loads without login
4. Verify collection details displayed
5. Verify status grid shows all flats
6. Verify legend is visible
7. Verify summary statistics correct

#### 2. Invalid Link Handling
1. Try accessing `/collection-status/INVALID123`
2. Verify error message displayed
3. Verify no sensitive data exposed

#### 3. Expired Link Handling
```sql
-- Manually expire a share
UPDATE collection_status_shares
SET expires_at = now() - interval '1 day'
WHERE share_code = 'TEST1234';
```
1. Access expired link
2. Verify expiry message displayed
3. Verify data not accessible

#### 4. View Count Tracking
```sql
-- Check view count increments
SELECT share_code, view_count, last_viewed_at
FROM collection_status_shares
WHERE share_code = 'YOUR_CODE';
```

### Status Display Testing

#### 1. Test All Status Types
Create test payments to generate each status:
```sql
-- Fully paid flat
-- Underpaid flat
-- Overpaid flat
-- Unpaid flat
```

2. Generate share link
3. Verify each status displays correct color:
   - Green for paid
   - Yellow for underpaid
   - Blue for overpaid
   - Red for unpaid

#### 2. Privacy Verification
1. Admin view: Toggle "Show Amounts" in preview
2. Public view: Verify amounts NEVER shown
3. Verify occupant names shown appropriately
4. Verify no email/mobile exposed

---

## Troubleshooting

### Issue: Share Button Not Visible
**Cause:** Collection is not active
**Solution:** Activate collection first using toggle button

### Issue: Link Not Working
**Possible Causes:**
1. Link expired (check `expires_at`)
2. Share deactivated (`is_active = false`)
3. Invalid share code

**Debug:**
```sql
SELECT * FROM collection_status_shares
WHERE share_code = 'YOUR_CODE';
```

### Issue: No Data in Status Grid
**Possible Causes:**
1. No flats registered
2. Collection has no associated apartment
3. Database function error

**Debug:**
```sql
-- Test function directly
SELECT * FROM get_collection_status_summary('collection-uuid-here');
```

### Issue: Communications Not Sent
**Possible Causes:**
1. No registered residents
2. Resend API key missing
3. Gupshup API key missing
4. Edge function error

**Debug:**
```sql
-- Check residents
SELECT email, mobile, whatsapp_optin
FROM flat_email_mappings
WHERE flat_id IN (
  SELECT id FROM flats WHERE apartment_id = 'apartment-uuid'
);

-- Check audit logs
SELECT * FROM communication_audit
WHERE communication_type = 'collection_status_share'
  AND status = 'failed';
```

---

## Future Enhancements

### Phase 2 Possibilities
- Custom expiration periods
- Share analytics dashboard
- Scheduled automatic shares
- Multiple collection comparison
- Export to PDF
- Custom messaging templates
- Resident-specific filters
- Historical snapshots

---

## API Reference

### Database Functions

#### get_collection_status_summary
```sql
get_collection_status_summary(p_expected_collection_id uuid)
RETURNS TABLE (
  building_name text,
  flat_number text,
  flat_id uuid,
  occupant_name text,
  payment_status text,
  total_paid numeric,
  amount_due numeric,
  approved_count integer,
  pending_count integer,
  rejected_count integer
)
```

#### create_collection_share_link
```sql
create_collection_share_link(
  p_expected_collection_id uuid,
  p_apartment_id uuid,
  p_expires_in_days integer DEFAULT 30
)
RETURNS TABLE (
  share_id uuid,
  share_code text,
  share_url text
)
```

#### get_collection_share_data
```sql
get_collection_share_data(p_share_code text)
RETURNS TABLE (
  collection_id uuid,
  collection_name text,
  apartment_name text,
  payment_type text,
  due_date date,
  amount_due numeric,
  financial_year text,
  quarter text,
  is_active boolean,
  share_expires_at timestamptz
)
```

### Edge Function

#### share-collection-status
**Method:** POST
**Auth:** Required (Bearer token)
**URL:** `{SUPABASE_URL}/functions/v1/share-collection-status`

**Request Body:**
```json
{
  "collection_id": "uuid",
  "apartment_id": "uuid",
  "share_code": "string",
  "share_url": "string"
}
```

**Response:**
```json
{
  "success": true,
  "sent": 45,
  "failed": 2,
  "message": "Collection status shared successfully. Sent: 45, Failed: 2"
}
```

---

## Conclusion

The Collection Status Sharing System provides committees with a transparent, professional way to communicate payment status to all residents while:
- Maintaining privacy
- Reducing manual follow-ups
- Creating audit trails
- Working with real resident behavior (no forced app installation)
- Preserving governance continuity

**Built for real housing societies — including during change.**
