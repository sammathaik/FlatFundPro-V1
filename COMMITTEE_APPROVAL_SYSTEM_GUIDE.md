# Committee Payment Approval System - Complete Guide

## Overview

A comprehensive committee approval workflow has been implemented that empowers housing society management committees to review, verify, edit, and approve payment submissions while maintaining complete audit trails and automatically notifying residents.

## Key Features

### 1. Three-Section Review Interface

#### Section 1: Original Submission Summary (Read-Only)
Displays exactly what was submitted:
- Submitter information (Resident or Committee)
- Flat details and occupant type
- Current payment status
- Original transaction details (date, amount, reference, method)
- Uploaded payment proof
- OCR extraction data
- Fraud detection alerts (if flagged)

**Visual Indicators:**
- Badge: "Submitted by Resident" (blue) or "Submitted by Committee" (purple)
- Status badges with color coding
- Document classification tags

#### Section 2: Committee Action Panel (Explicit Choice)
Four mutually exclusive actions:

1. **Approve as submitted**
   - Accept payment exactly as resident submitted
   - No edits required
   - Reason optional

2. **Edit and approve**
   - Correct details based on bank statement
   - Preserve original values in audit trail
   - Reason mandatory

3. **Submit on behalf of owner/tenant**
   - Enter payment confirmed through bank reconciliation
   - Payment proof optional (not mandatory)
   - Reason mandatory

4. **Mark as unverifiable**
   - Unable to verify payment
   - Returns to "Received" status
   - Requires resident follow-up
   - Reason mandatory

#### Section 3: Editable Payment Details (Conditional)
Enabled ONLY when "Edit and approve" OR "Submit on behalf" is selected:

**Editable Fields:**
- Payment Date (required)
- Payment Amount (required)
- Transaction Reference/UTR
- Payment Method (UPI, Bank Transfer, Check, etc.)

**Helper Text:**
"Payment proof is optional for committee-entered submissions"

### 2. Governance Controls

#### Mandatory Reason Field
Required for:
- Edit and approve
- Submit on behalf
- Mark as unverifiable

NOT required for:
- Approve as submitted

**Examples of Good Reasons:**
- "Confirmed via bank statement dated [date]"
- "OCR extraction error - correct amount is ₹5000"
- "Screenshot unreadable - resident provided verbal confirmation"
- "Verified with society treasurer's records"
- "Payment reference confirmed through NEFT receipt"

#### Audit Trail System
Automatically logs:
- Who made the change (admin email and role)
- When it was done (timestamp)
- What action was taken
- Before values (original submission)
- After values (modified data)
- Reason provided
- Metadata (action type, submission source, verification status)

**Audit Trail Table: `payment_audit_trail`**
- Immutable (insert-only)
- Comprehensive history
- Visible to admins only
- Expandable section in review panel

### 3. Automatic Notifications

#### Email Notification (Mandatory - Via Resend)
Sent automatically when:
- Committee approves payment (any path)
- Committee edits and approves
- Committee submits on behalf

**Email Content:**
- Professional, neutral tone
- Confirmation of approval
- Approved amount and date
- Flat and society details
- "Committee Verified" badge
- No accusatory language

**Email Rules:**
- Always sent to resident email
- HTML formatted with society branding
- Non-blocking (approval succeeds even if email fails)
- Delivery timestamp recorded

#### WhatsApp Notification (Conditional - Via FlatFund Pro)
Sent ONLY IF:
- Mobile number exists in `flat_email_mappings`
- Resident has explicitly opted-in (`whatsapp_opt_in = true`)
- Approval action is taken

**WhatsApp Message:**
```
Your maintenance payment for [Society Name] has been approved after committee verification. Thank you!

Flat: [Flat Number]
Amount: ₹[Amount]
Date: [Date]
```

**WhatsApp Rules:**
- Uses existing Gupshup integration
- Queued via `notification_outbox` table
- Non-blocking (approval succeeds even if WhatsApp fails)
- Delivery timestamp recorded
- Respects opt-in preference

## Database Schema

### Extended `payment_submissions` Table

New columns added:

```sql
submission_source text DEFAULT 'resident'
  -- Values: 'resident' | 'admin_on_behalf'

admin_action_type text
  -- Values: 'approve_as_is' | 'edit_and_approve' | 'submit_on_behalf' | 'rejected'

committee_action_reason text
  -- Mandatory reason for governance

original_values jsonb DEFAULT '{}'::jsonb
  -- Stores original submission before edits

committee_verified boolean DEFAULT false
  -- Flag indicating committee review

approved_by uuid REFERENCES admins(id)
  -- Admin who approved

approved_at timestamptz
  -- Approval timestamp

approval_notification_sent boolean DEFAULT false
  -- Email sent flag

approval_email_sent_at timestamptz
  -- Email delivery timestamp

approval_whatsapp_sent_at timestamptz
  -- WhatsApp delivery timestamp
```

### New Table: `payment_audit_trail`

Complete audit history for every payment:

```sql
CREATE TABLE payment_audit_trail (
  id uuid PRIMARY KEY,
  payment_submission_id uuid NOT NULL,
  apartment_id uuid NOT NULL,
  action_type text NOT NULL,
    -- Values: 'created', 'status_changed', 'amount_modified',
    -- 'date_modified', 'details_modified', 'approved',
    -- 'rejected', 'committee_override'
  performed_by uuid REFERENCES admins(id),
  performed_by_email text,
  performed_by_role text,
    -- Values: 'apartment_admin' | 'super_admin' | 'system'
  before_values jsonb DEFAULT '{}'::jsonb,
  after_values jsonb DEFAULT '{}'::jsonb,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

**Indexes for Performance:**
- `payment_submission_id, created_at DESC`
- `apartment_id, created_at DESC`
- `performed_by`
- `action_type`

**RLS Policies:**
- Super admins: View all
- Apartment admins: View their apartment only
- Admins: Can insert entries

## Edge Functions

### `send-payment-approval-notification`

**Purpose:** Send email and WhatsApp notifications after committee approval

**Trigger:** Called automatically after payment approval

**Flow:**
1. Receives payment and recipient details
2. Sends email via Resend API (mandatory)
3. Sends WhatsApp via existing system (conditional)
4. Updates `payment_submissions` with delivery timestamps
5. Returns success/failure for each channel

**Request Payload:**
```typescript
{
  payment_submission_id: string;
  recipient_email: string;
  recipient_name: string;
  recipient_mobile?: string;
  flat_number: string;
  apartment_name: string;
  approved_amount: number;
  approved_date: string;
  whatsapp_opt_in?: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  results: {
    email_sent: boolean;
    whatsapp_sent: boolean;
    email_error: string | null;
    whatsapp_error: string | null;
  }
}
```

**Error Handling:**
- Non-blocking: Approval succeeds even if notifications fail
- Errors logged but not thrown
- Separate error tracking for email and WhatsApp
- Retry not attempted (logged for manual review)

## Frontend Components

### `PaymentReviewPanel.tsx` (New)

Complete redesign implementing the three-section layout:

**State Management:**
```typescript
const [payment, setPayment] = useState<PaymentDetails | null>(null);
const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
const [selectedAction, setSelectedAction] = useState<CommitteeAction | null>(null);
const [committeeReason, setCommitteeReason] = useState('');
const [editedPayment, setEditedPayment] = useState({...});
```

**Key Functions:**
- `loadPaymentDetails()` - Fetch payment data
- `loadAuditHistory()` - Fetch audit trail
- `handleActionChange()` - Update selected action and enable/disable fields
- `validateForm()` - Ensure required fields filled
- `handleSubmit()` - Save changes, trigger notifications, update audit

**Validation Rules:**
- Action selection required
- Reason required for all actions except "approve_as_is"
- Amount required and > 0 for edit/submit actions
- Date required for edit/submit actions

**Integration:**
```typescript
// In PaymentManagement.tsx
<PaymentReviewPanel
  paymentId={reviewingPaymentId}
  onClose={() => setShowReviewPanel(false)}
  onSuccess={handleReviewSuccess}
/>
```

### Updated `PaymentManagement.tsx`

**New Features:**
- "Committee Review" button in action menu (prominent blue styling)
- Integration with PaymentReviewPanel
- Success message display after review
- Automatic reload after approval

**Menu Integration:**
```typescript
<button
  onClick={() => openReviewPanel(payment.id)}
  className="w-full text-left px-4 py-2 text-sm text-blue-700 font-semibold hover:bg-blue-50 flex items-center gap-2"
>
  <Shield className="w-4 h-4" />
  Committee Review
</button>
```

## User Workflows

### Workflow 1: Approve Payment As Submitted

**Scenario:** Resident submitted correct details with clear proof

1. Admin clicks "Committee Review" in action menu
2. Reviews original submission in Section 1
3. Selects "Approve as submitted" in Section 2
4. Clicks "Submit Committee Action"
5. System:
   - Updates status to "Approved"
   - Sends email to resident
   - Sends WhatsApp (if opted-in)
   - Logs audit entry
6. Success message displayed
7. Payment list refreshed

**No editing required, minimal friction for correct submissions**

### Workflow 2: Edit and Approve Payment

**Scenario:** OCR extracted wrong amount, but payment is valid

1. Admin clicks "Committee Review"
2. Reviews original submission (shows ₹4000 but should be ₹5000)
3. Selects "Edit and approve"
4. Section 3 fields become editable
5. Corrects payment amount to ₹5000
6. Enters reason: "OCR extraction error - correct amount verified via bank statement"
7. Clicks "Submit Committee Action"
8. System:
   - Stores original values in `original_values`
   - Updates payment with corrected values
   - Sets `admin_action_type = 'edit_and_approve'`
   - Logs before/after in audit trail
   - Sends notifications with corrected amount
9. Success message displayed

**Preserves original submission, clear audit trail of changes**

### Workflow 3: Submit on Behalf of Resident

**Scenario:** Payment confirmed via bank reconciliation, no resident submission

1. Admin clicks "Committee Review" on any payment record OR creates new
2. Selects "Submit on behalf of owner/tenant"
3. Section 3 fields become editable (all empty)
4. Enters all payment details:
   - Date: 15-Jan-2024
   - Amount: ₹6000
   - Reference: NEFT123456
   - Method: Bank Transfer
5. Enters reason: "Payment confirmed via bank statement dated 16-Jan-2024 - direct deposit to society account"
6. Clicks "Submit Committee Action"
7. System:
   - Sets `submission_source = 'admin_on_behalf'`
   - Sets `admin_action_type = 'submit_on_behalf'`
   - Marks as "Committee Verified"
   - Sends notifications
8. Payment appears with "Submitted by Committee" badge

**No payment proof required, full transparency**

### Workflow 4: Mark as Unverifiable

**Scenario:** Screenshot too blurry, cannot confirm payment

1. Admin clicks "Committee Review"
2. Reviews submission - screenshot is unreadable
3. Selects "Mark as unverifiable"
4. Enters reason: "Payment screenshot is unreadable - unable to verify transaction. Please resubmit clear payment proof."
5. Clicks "Submit Committee Action"
6. System:
   - Sets `admin_action_type = 'rejected'`
   - Keeps status as "Received" (or reverts to "Received")
   - Does NOT send approval notification
   - Logs in audit trail
7. Admin can follow up with resident separately

**Clear communication, not accusatory**

## Security & Audit

### RLS Policies

**payment_submissions:**
- Existing policies preserved
- No new RLS changes needed
- Committee actions logged separately

**payment_audit_trail:**
- Super admins: View all audit trails
- Apartment admins: View their apartment only
- Service role: Insert entries via trigger
- No public access

### Audit Triggers

**Automatic Logging:**
```sql
CREATE TRIGGER trg_payment_audit_log
AFTER INSERT OR UPDATE ON payment_submissions
FOR EACH ROW
EXECUTE FUNCTION log_payment_modification();
```

**Logged Events:**
- Payment created
- Status changed
- Amount modified
- Date modified
- Details modified
- Approved
- Rejected
- Committee override

**Before/After Tracking:**
Stores snapshots of:
- status
- payment_amount
- payment_date
- transaction_reference
- payment_type

### Fraud Detection Integration

**Preserved Functionality:**
- Fraud checks still run automatically
- Fraud scores still calculated
- Fraud flags still displayed

**New Behavior:**
- Admin-approved payments are trusted
- Fraud alerts shown in review panel
- Committee can override fraud flags
- Override reason required and logged

**Best Practice:**
- Review fraud alerts in Section 1
- Document reason for approval despite flag
- Example: "Fraud flag due to duplicate image - confirmed with resident this is legitimate duplicate payment for arrears"

## Testing the System

### Test Case 1: Approve As Submitted

```sql
-- Find a clean payment
SELECT * FROM payment_submissions
WHERE status = 'Received'
AND fraud_score < 30
LIMIT 1;
```

1. Open Committee Review for this payment
2. Verify all details in Section 1
3. Select "Approve as submitted"
4. Submit
5. Verify:
   - Status changed to "Approved"
   - Email sent to resident
   - WhatsApp sent (if opted-in)
   - Audit entry created

### Test Case 2: Edit and Approve

```sql
-- Create test payment with wrong amount
INSERT INTO payment_submissions (
  apartment_id, block_id, flat_id,
  name, email, payment_amount, payment_date,
  screenshot_url, screenshot_filename,
  status
) VALUES (
  'your-apartment-id', 'block-id', 'flat-id',
  'Test User', 'test@example.com', 4000.00, '2024-01-15',
  'https://example.com/test.jpg', 'test.jpg',
  'Received'
);
```

1. Open Committee Review
2. Select "Edit and approve"
3. Change amount to 5000.00
4. Enter reason: "Testing edit functionality"
5. Submit
6. Verify:
   - `original_values` contains old amount (4000)
   - `payment_amount` is new amount (5000)
   - Audit trail shows before/after
   - Notification shows correct amount (5000)

### Test Case 3: Submit on Behalf

1. Create new blank payment record
2. Open Committee Review
3. Select "Submit on behalf"
4. Enter all details
5. Enter reason: "Testing submit on behalf - bank reconciliation"
6. Submit
7. Verify:
   - `submission_source = 'admin_on_behalf'`
   - Badge shows "Submitted by Committee"
   - All fields populated
   - Notifications sent

### Test Case 4: Notification Delivery

```sql
-- Check notification delivery
SELECT
  ps.id,
  ps.name,
  ps.approval_notification_sent,
  ps.approval_email_sent_at,
  ps.approval_whatsapp_sent_at,
  fem.whatsapp_opt_in
FROM payment_submissions ps
JOIN flat_email_mappings fem ON fem.flat_id = ps.flat_id
WHERE ps.status = 'Approved'
AND ps.approved_at > NOW() - INTERVAL '1 hour'
ORDER BY ps.approved_at DESC;
```

Verify timestamps match approval time.

### Test Case 5: Audit Trail

```sql
-- View audit history for a payment
SELECT * FROM get_payment_audit_history('payment-id');
```

Should show:
- Creation entry
- Modification entries (if edited)
- Approval entry
- All with correct before/after values

## Monitoring & Maintenance

### Key Metrics to Track

```sql
-- Committee approval activity
SELECT
  DATE(approved_at) as date,
  admin_action_type,
  COUNT(*) as count
FROM payment_submissions
WHERE approved_at IS NOT NULL
AND approved_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(approved_at), admin_action_type
ORDER BY date DESC, count DESC;
```

```sql
-- Notification delivery rates
SELECT
  COUNT(*) as total_approved,
  COUNT(*) FILTER (WHERE approval_notification_sent = true) as email_sent,
  COUNT(*) FILTER (WHERE approval_whatsapp_sent_at IS NOT NULL) as whatsapp_sent,
  ROUND(100.0 * COUNT(*) FILTER (WHERE approval_notification_sent = true) / COUNT(*), 2) as email_success_rate
FROM payment_submissions
WHERE status = 'Approved'
AND approved_at > NOW() - INTERVAL '30 days';
```

```sql
-- Most common approval reasons
SELECT
  committee_action_reason,
  admin_action_type,
  COUNT(*) as frequency
FROM payment_submissions
WHERE committee_action_reason IS NOT NULL
AND approved_at > NOW() - INTERVAL '90 days'
GROUP BY committee_action_reason, admin_action_type
ORDER BY frequency DESC
LIMIT 20;
```

### Troubleshooting

**Issue: Notifications not sending**

Check:
```sql
-- Check recent approvals without notifications
SELECT
  id, name, email, status,
  approval_notification_sent,
  approval_email_sent_at,
  approved_at
FROM payment_submissions
WHERE status = 'Approved'
AND approved_at > NOW() - INTERVAL '1 day'
AND approval_notification_sent = false;
```

**Issue: Audit trail not recording**

Check trigger:
```sql
-- Verify trigger exists
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trg_payment_audit_log';
```

**Issue: Edit fields not enabling**

- Verify action selection state
- Check `isFieldEditable` condition
- Confirm radio button onChange handler

## Best Practices

### For Committee Members

1. **Always review original submission first**
   - Check all details in Section 1
   - Verify payment proof if available
   - Review fraud alerts

2. **Choose the right action**
   - Use "Approve as submitted" when details are correct
   - Use "Edit and approve" for minor corrections
   - Use "Submit on behalf" for bank reconciliation entries
   - Use "Mark as unverifiable" only when cannot verify

3. **Provide clear reasons**
   - Be specific about why action was taken
   - Reference source of information (bank statement date, resident conversation)
   - Avoid vague reasons like "approved" or "looks good"

4. **Document overrides**
   - If overriding fraud flag, explain why
   - If correcting amount, state source of correct amount
   - If entering on behalf, reference bank statement

5. **Review audit history**
   - Check if payment has prior modifications
   - Understand previous committee actions
   - Maintain consistency

### For System Administrators

1. **Monitor notification delivery**
   - Check email and WhatsApp success rates
   - Investigate failed deliveries
   - Update contact information if bouncing

2. **Review audit trails regularly**
   - Spot check for proper governance
   - Ensure reasons are being provided
   - Identify training needs

3. **Analyze approval patterns**
   - Track ratio of approve vs edit vs submit
   - High edit rate may indicate poor submission quality
   - High "on behalf" rate may indicate resident engagement issues

4. **Backup audit data**
   - `payment_audit_trail` table is critical
   - Regular database backups
   - Consider archiving old entries

## UX Highlights

### Intentional Design Choices

1. **Three distinct sections**
   - Clear separation of read-only vs editable
   - Visual hierarchy guides workflow
   - No accidental edits

2. **Explicit action selection**
   - Radio buttons force conscious choice
   - Cannot proceed without selection
   - No default action (prevents accidents)

3. **Conditional editing**
   - Fields only editable when appropriate
   - Reduces cognitive load
   - Prevents confusion

4. **Mandatory reasons**
   - Governance requirement
   - Clear placeholder examples
   - Audit-friendly

5. **Visual indicators**
   - Badges show submission source
   - Color coding for status
   - Icons clarify action types

6. **Non-judgmental language**
   - "Unverifiable" instead of "Rejected"
   - "Committee verification" instead of "Override"
   - Professional, neutral tone

## Integration Points

### Existing Systems Preserved

1. **Fraud Detection**
   - All checks still run
   - Scores still calculated
   - Can be overridden by committee

2. **OCR Extraction**
   - Still runs automatically
   - Results shown in review
   - Can be corrected by committee

3. **Document Classification**
   - Classification badges still displayed
   - AI analysis preserved
   - No impact on workflow

4. **Payment Status Dashboard**
   - All reports use approved amounts
   - Ledgers reflect committee actions
   - Analytics include all payments

5. **Occupant Portal**
   - Residents still see their payments
   - Approval status visible
   - No access to committee reasons (privacy)

## Summary

The Committee Payment Approval System provides:

1. **Empowerment**: Committee can handle all real-world scenarios
2. **Transparency**: Complete audit trail of all actions
3. **Governance**: Mandatory reasons and explicit choices
4. **Communication**: Automatic notifications to residents
5. **Trust**: Professional, non-judgmental process
6. **Compliance**: Full auditability for society records
7. **Flexibility**: Multiple action types for different situations
8. **Safety**: No existing functionality broken

The system reflects real housing society operations while maintaining the highest standards of transparency, auditability, and resident communication.
