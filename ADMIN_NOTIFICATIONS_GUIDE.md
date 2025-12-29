# Admin Notifications System - Complete Guide

## Overview

FlatFundPro now has a comprehensive real-time notification system that alerts apartment admins about important events related to payment submissions, OCR extraction, fraud detection, and more. The system automatically triggers notifications based on various events and displays them in the admin dashboard.

## Notification Types Implemented

### 1. Payment Submission Notification
**Type**: `payment_submitted`
**Severity**: Medium
**Trigger**: When a new payment submission is created by a tenant or owner

**Details**:
- Shows occupant name and flat number
- Displays payment amount
- Includes payment date and occupant type in metadata
- Triggered immediately upon payment submission

**Example**:
```
Title: "New Payment Submission"
Message: "New payment submission from John Doe (Flat 101) - Amount: ₹15000"
Severity: Medium
```

**When it triggers**:
- Tenant submits payment through public form
- Owner submits payment through occupant portal
- Admin manually creates payment entry

---

### 2. OCR Extraction Completed
**Type**: `ocr_completed`
**Severity**: Low
**Trigger**: When OCR text extraction completes successfully (other_text field populated)

**Details**:
- Confirms successful OCR processing
- Shows extracted amount, date, and transaction reference
- Includes OCR quality score and confidence level
- Only triggers when other_text field transitions from empty to populated

**Example**:
```
Title: "OCR Extraction Completed"
Message: "OCR text extraction completed successfully for payment from Flat 101 - Amount: ₹15000"
Severity: Low
Metadata: {
  "extracted_amount": 15000,
  "extracted_date": "2024-01-15",
  "ocr_quality": "high",
  "ocr_confidence_score": 95
}
```

**When it triggers**:
- After payment image is processed by OCR service
- When other_text field gets populated with extracted text
- Typically within 10-30 seconds of payment submission

---

### 3. Fraud Detection Alert
**Type**: `fraud_alert`
**Severity**: Critical
**Trigger**: When fraud detection system flags a payment as suspicious

**Details**:
- Shows fraud score (0-100)
- Lists specific fraud indicators detected
- Includes all fraud-related metadata
- Requires immediate admin attention

**Example**:
```
Title: "⚠️ Fraud Alert - Suspicious Payment"
Message: "FRAUD ALERT: Payment from Flat 101 flagged as suspicious - Fraud Score: 85/100.
         Indicators: duplicate_transaction: true, amount_mismatch: true"
Severity: Critical
Metadata: {
  "fraud_score": 85,
  "fraud_indicators": {
    "duplicate_transaction": true,
    "amount_mismatch": true
  }
}
```

**When it triggers**:
- Fraud detection system identifies suspicious patterns
- When is_fraud_flagged changes from false to true
- Automatically during payment processing

---

### 4. Large Amount Alert
**Type**: `large_amount`
**Severity**: High
**Trigger**: When payment amount exceeds ₹50,000

**Details**:
- Alerts admin about unusually large payments
- Threshold: ₹50,000 (configurable)
- Suggests careful review
- Helps prevent errors and fraud

**Example**:
```
Title: "Large Payment Amount Submitted"
Message: "Large payment amount of ₹75000 submitted from Flat 101 - Please review carefully"
Severity: High
Metadata: {
  "payment_amount": 75000,
  "threshold": 50000
}
```

**When it triggers**:
- Payment submission with amount > ₹50,000
- Immediately upon submission
- Before OCR or fraud detection

---

### 5. OCR Extraction Failed
**Type**: `ocr_failed`
**Severity**: Medium
**Trigger**: When OCR extraction requires manual review

**Details**:
- Indicates OCR couldn't extract data confidently
- Shows reason for failure
- Includes OCR quality and confidence scores
- Requires admin to manually verify payment details

**Example**:
```
Title: "OCR Extraction Requires Manual Review"
Message: "OCR extraction for payment from Flat 101 requires manual review.
         Reason: Low confidence or failed extraction"
Severity: Medium
Metadata: {
  "manual_review_reason": "Low confidence score",
  "ocr_quality": "low",
  "ocr_confidence_score": 45
}
```

**When it triggers**:
- OCR confidence score below threshold
- Image quality too poor for extraction
- Unusual payment proof format
- When requires_manual_review is set to true

---

### 6. Payment Status Changed (Approved)
**Type**: `payment_approved`
**Severity**: Low
**Trigger**: When payment status changes from pending to approved

**Details**:
- Confirms successful approval
- Shows who approved and when
- Includes old and new status
- Informational notification

**Example**:
```
Title: "Payment Approved"
Message: "Payment from Flat 101 (₹15000) has been approved"
Severity: Low
Metadata: {
  "old_status": "pending",
  "new_status": "approved",
  "reviewed_by": "admin-uuid",
  "reviewed_at": "2024-01-15T10:30:00Z"
}
```

**When it triggers**:
- Admin approves a pending payment
- Status changes from 'pending' to 'approved'

---

### 7. Payment Status Changed (Rejected)
**Type**: `payment_rejected`
**Severity**: Medium
**Trigger**: When payment status changes from pending to rejected

**Details**:
- Alerts about payment rejection
- Shows reviewer and timestamp
- Helps track rejected payments
- May require follow-up with occupant

**Example**:
```
Title: "Payment Rejected"
Message: "Payment from Flat 101 (₹15000) has been rejected"
Severity: Medium
Metadata: {
  "old_status": "pending",
  "new_status": "rejected",
  "reviewed_by": "admin-uuid",
  "reviewed_at": "2024-01-15T10:30:00Z"
}
```

**When it triggers**:
- Admin rejects a pending payment
- Status changes from 'pending' to 'rejected'

---

### 8. Validation Failed
**Type**: `validation_failed`
**Severity**: High
**Trigger**: When payment validation fails

**Details**:
- Shows validation failure reason
- Includes confidence score
- Indicates discrepancies detected
- Requires admin attention

**Example**:
```
Title: "Payment Validation Failed"
Message: "Payment validation failed for Flat 101.
         Reason: Amount mismatch detected. Confidence: 75%"
Severity: High
Metadata: {
  "validation_status": "failed",
  "validation_reason": "Amount mismatch detected",
  "validation_confidence_score": 75
}
```

**When it triggers**:
- Payment proof validation detects issues
- Amount doesn't match expected collection
- Date outside expected range
- When validation_status is set to 'failed'

---

## Notification Severity Levels

### Critical
- **Color**: Red
- **Icon**: Alert Circle
- **Use**: Fraud alerts, security issues
- **Action**: Immediate attention required

### High
- **Color**: Indigo/Purple (changed from purple to blue gradient in UI)
- **Icon**: Alert Triangle
- **Use**: Large amounts, validation failures
- **Action**: Review soon

### Medium
- **Color**: Yellow
- **Icon**: Info Circle
- **Use**: Payment submissions, status changes, OCR failures
- **Action**: Review when convenient

### Low
- **Color**: Blue
- **Icon**: Info Circle
- **Use**: OCR completion, approvals, informational
- **Action**: For information only

---

## How to Access Notifications

### In Admin Dashboard

1. **Notification Bell Icon**: Located in the top-right of the admin dashboard
2. **Unread Count Badge**: Red circle shows number of unread notifications
3. **Dropdown Menu**: Click bell icon to view recent notifications
4. **Auto-Refresh**: Updates every 30 seconds automatically

### Notification Actions

- **Mark as Read**: Click the eye icon to mark individual notification as read
- **Mark as Resolved**: Click the checkmark icon to resolve and archive notification
- **View Related Payment**: Click notification to navigate to related payment (if applicable)
- **Close Dropdown**: Click X or click outside to close

---

## Testing Notifications

### Test Scenario 1: Payment Submission

**Setup**:
```
1. Go to public landing page (/)
2. Fill payment form for an apartment
3. Upload payment screenshot
4. Submit form
```

**Expected Notifications**:
1. `payment_submitted` - Immediate (Medium)
2. If amount > ₹50,000: `large_amount` - Immediate (High)
3. `ocr_completed` - After 10-30 seconds (Low)

**Verification**:
```sql
SELECT notification_type, title, severity, created_at
FROM admin_notifications
WHERE apartment_id = 'your-apartment-id'
ORDER BY created_at DESC
LIMIT 5;
```

---

### Test Scenario 2: OCR Extraction

**Setup**:
```sql
-- Manually trigger OCR completion
UPDATE payment_submissions
SET other_text = 'Extracted OCR text data here'
WHERE id = 'payment-id'
AND (other_text IS NULL OR other_text = '');
```

**Expected Notification**:
- `ocr_completed` - Immediate (Low)

**Verification**:
- Check notification appears in admin dashboard
- Verify metadata contains OCR details

---

### Test Scenario 3: Fraud Detection

**Setup**:
```sql
-- Manually flag payment as fraud
UPDATE payment_submissions
SET
  is_fraud_flagged = true,
  fraud_score = 85,
  fraud_indicators = '{"duplicate_transaction": true, "amount_mismatch": true}'::jsonb
WHERE id = 'payment-id';
```

**Expected Notification**:
- `fraud_alert` - Immediate (Critical)

**Verification**:
- Notification should appear prominently (red background)
- Should show fraud score and indicators
- Should be at top of notification list

---

### Test Scenario 4: Large Amount

**Setup**:
```
1. Submit payment with amount = 75000
2. Check notifications immediately
```

**Expected Notifications**:
1. `payment_submitted` - Medium
2. `large_amount` - High

**Verification**:
- Two notifications should appear
- Large amount notification should have higher severity

---

### Test Scenario 5: OCR Failure

**Setup**:
```sql
UPDATE payment_submissions
SET
  requires_manual_review = true,
  manual_review_reason = 'Low confidence score',
  ocr_quality = 'low',
  ocr_confidence_score = 45
WHERE id = 'payment-id';
```

**Expected Notification**:
- `ocr_failed` - Immediate (Medium)

**Verification**:
- Notification explains why manual review is needed
- Metadata contains quality scores

---

### Test Scenario 6: Payment Approval/Rejection

**Setup**:
```
1. Go to admin dashboard
2. Navigate to Payment Management
3. Approve or reject a pending payment
```

**Expected Notification**:
- `payment_approved` (Low) OR `payment_rejected` (Medium)

**Verification**:
- Notification shows old and new status
- Includes reviewer information

---

### Test Scenario 7: Validation Failure

**Setup**:
```sql
UPDATE payment_submissions
SET
  validation_status = 'failed',
  validation_reason = 'Amount mismatch detected',
  validation_confidence_score = 75
WHERE id = 'payment-id';
```

**Expected Notification**:
- `validation_failed` - Immediate (High)

**Verification**:
- Notification shows failure reason
- Includes confidence score

---

## Database Queries for Testing

### View All Notifications for an Apartment
```sql
SELECT
  id,
  notification_type,
  title,
  severity,
  is_read,
  is_resolved,
  created_at,
  metadata
FROM admin_notifications
WHERE apartment_id = 'your-apartment-id'
ORDER BY created_at DESC;
```

### Count Unread Notifications
```sql
SELECT COUNT(*) as unread_count
FROM admin_notifications
WHERE apartment_id = 'your-apartment-id'
AND is_read = false
AND is_resolved = false;
```

### Notifications by Type
```sql
SELECT
  notification_type,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM admin_notifications
WHERE apartment_id = 'your-apartment-id'
GROUP BY notification_type
ORDER BY count DESC;
```

### Critical Notifications
```sql
SELECT *
FROM admin_notifications
WHERE apartment_id = 'your-apartment-id'
AND severity = 'critical'
AND is_resolved = false
ORDER BY created_at DESC;
```

### Recent Notifications (Last 24 hours)
```sql
SELECT *
FROM admin_notifications
WHERE apartment_id = 'your-apartment-id'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## Additional Notification Suggestions

### Already Implemented ✅
1. Payment submission
2. OCR extraction completed
3. Fraud detection alerts
4. Large amount alerts
5. OCR extraction failures
6. Payment status changes
7. Validation failures

### Future Enhancements 🔮

#### 1. Collection Deadline Reminders
**Type**: `collection_reminder`
**Trigger**: 3 days before collection deadline
**Severity**: Medium
**Use Case**: Remind admin to follow up on pending payments

```sql
-- Example implementation
CREATE OR REPLACE FUNCTION notify_collection_deadline()
RETURNS void AS $$
BEGIN
  INSERT INTO admin_notifications (...)
  SELECT ...
  FROM expected_collections ec
  WHERE ec.end_date = CURRENT_DATE + INTERVAL '3 days'
  AND ec.collection_status != 'completed';
END;
$$ LANGUAGE plpgsql;
```

#### 2. Low Collection Rate Alerts
**Type**: `low_collection_rate`
**Trigger**: Collection rate below 70% and deadline < 7 days
**Severity**: High
**Use Case**: Alert admin about poor collection performance

#### 3. Duplicate Payment Detection
**Type**: `duplicate_detected`
**Trigger**: Multiple payments from same flat for same period
**Severity**: High
**Use Case**: Prevent duplicate processing

#### 4. Occupant Registration Pending
**Type**: `registration_pending`
**Trigger**: New flat without registered occupant > 7 days
**Severity**: Low
**Use Case**: Prompt admin to complete registration

#### 5. Payment Pattern Anomaly
**Type**: `pattern_anomaly`
**Trigger**: Payment behavior significantly different from historical pattern
**Severity**: Medium
**Use Case**: Detect unusual payment behavior

#### 6. System Performance Alerts
**Type**: `system_alert`
**Trigger**: OCR service down, database slow, etc.
**Severity**: Critical
**Use Case**: Inform admin about technical issues

#### 7. Bulk Upload Complete
**Type**: `bulk_complete`
**Trigger**: Bulk payment upload finishes processing
**Severity**: Low
**Use Case**: Confirm bulk operation completion

#### 8. Reminder Email Sent
**Type**: `reminder_sent`
**Trigger**: Automated payment reminder emails sent
**Severity**: Low
**Use Case**: Track communication with occupants

---

## Performance Considerations

### Indexes Created
```sql
-- Efficient query for unread notifications
idx_admin_notifications_apartment_id_is_read

-- Sorting by recency
idx_admin_notifications_created_at

-- Filtering by severity
idx_admin_notifications_severity

-- Filtering by type
idx_admin_notifications_type

-- Looking up by payment
idx_admin_notifications_payment_id

-- JSONB metadata queries
idx_admin_notifications_metadata
```

### Query Optimization
- Notifications are filtered by `is_resolved = false` in indexes
- Auto-refresh every 30 seconds (not per second)
- Limited to 10 most recent notifications in dropdown
- Older resolved notifications are archived but retained

### Database Load
- Each trigger creates one notification
- Lightweight JSONB metadata storage
- No heavy computations in trigger functions
- All triggers use SECURITY DEFINER for proper permissions

---

## Security & Permissions

### Row Level Security (RLS)
- ✅ Enabled on admin_notifications table
- Apartment admins can only see their apartment's notifications
- Super admins can see all notifications
- Service role can insert via triggers
- Admins can mark as read/resolved

### Policies Created
1. `"Apartment admins can view their notifications"` - SELECT
2. `"Super admins can view all admin notifications"` - SELECT
3. `"Apartment admins can update their notifications"` - UPDATE
4. `"Service role can insert admin notifications"` - INSERT
5. `"Authenticated can insert admin notifications"` - INSERT

---

## Troubleshooting

### Notifications Not Appearing

**Check 1**: Verify triggers are enabled
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname LIKE 'notify%';
```

**Check 2**: Check for errors in trigger execution
```sql
-- Check PostgreSQL logs for trigger errors
```

**Check 3**: Verify RLS policies
```sql
SELECT * FROM admin_notifications
WHERE apartment_id = 'your-apartment-id';
-- If this returns data but UI doesn't show it, check RLS policies
```

### Duplicate Notifications

**Cause**: Trigger firing multiple times
**Solution**: Triggers use WHEN clauses to prevent duplicates

**Check**:
```sql
SELECT notification_type, COUNT(*), created_at::date
FROM admin_notifications
GROUP BY notification_type, created_at::date
HAVING COUNT(*) > 1;
```

### Notification Overload

**Solution**: Implement notification batching
**Example**: Group multiple similar notifications
```sql
-- Instead of 10 payment_submitted notifications,
-- Create one "10 new payments received" notification
```

---

## Best Practices

### For Admins
1. **Check notifications daily** - Don't let critical alerts pile up
2. **Resolve after action** - Mark notifications as resolved after handling
3. **Investigate fraud alerts immediately** - Critical severity requires immediate action
4. **Review large amounts carefully** - High-value payments need extra verification
5. **Follow up on OCR failures** - Manual review ensures data accuracy

### For Developers
1. **Use appropriate severity** - Don't overuse critical
2. **Include helpful metadata** - Add context for admin decisions
3. **Write clear messages** - Admin should understand without clicking
4. **Test trigger conditions** - Ensure no false positives
5. **Monitor notification volume** - Too many = notification fatigue

---

## Summary

The admin notification system provides comprehensive real-time alerts for all important events in the FlatFundPro payment management system. With 8 notification types covering payment submissions, OCR processing, fraud detection, and validation, admins stay informed about everything happening in their apartment.

### Key Features
- ✅ Real-time notifications via database triggers
- ✅ Severity-based prioritization
- ✅ Rich metadata for context
- ✅ Mark as read/resolved functionality
- ✅ Auto-refresh every 30 seconds
- ✅ Row-level security for multi-tenancy
- ✅ Efficient indexing for performance

### Notification Types Summary
| Type | Trigger | Severity | Action Required |
|------|---------|----------|----------------|
| payment_submitted | New submission | Medium | Review |
| ocr_completed | OCR success | Low | Info |
| fraud_alert | Fraud detected | Critical | Immediate |
| large_amount | Amount > 50k | High | Verify |
| ocr_failed | OCR needs review | Medium | Manual check |
| payment_approved | Status → approved | Low | Info |
| payment_rejected | Status → rejected | Medium | Follow-up |
| validation_failed | Validation fails | High | Investigate |

The system is production-ready and will automatically notify admins as events occur throughout the payment lifecycle!
