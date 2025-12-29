# Notification Bell Icon - Complete Guide

## Overview

The notification bell icon is an automated alert system that notifies apartment admins about important events that require their attention. It appears in the top-right corner of the admin dashboard.

## Current Status

**ALREADY ENABLED** for Apartment Admins
- Location: Top-right corner of the admin dashboard header
- Auto-refreshes: Every 30 seconds
- Shows unread count badge (red circle with number)

**NOT ENABLED** for Super Admins (by design, as they monitor system-wide analytics)

## How It Works

### Visual Indicators

1. **Bell Icon**: Always visible in the admin header
2. **Red Badge**: Shows number of unread notifications (e.g., "3" or "9+" if more than 9)
3. **Dropdown Panel**: Click the bell to see notification details

### Notification Lifecycle

1. **Created**: System automatically creates notification when trigger event occurs
2. **Unread**: Shows with blue background and counts in badge
3. **Read**: Admin marks as read (removes from unread count)
4. **Resolved**: Admin resolves the issue (removes from notification list)

## Automatic Notification Triggers

### 1. Document Classification Issues

**Trigger**: When AI classifies a payment document with low confidence

**Conditions**:
- Confidence Level = "Low"
- Document Type = "Non-payment document"
- Document Type = "Unclear or insufficient data"

**Severity Levels**:
- **HIGH** (Orange): Non-payment document detected
- **MEDIUM** (Yellow): Low confidence classification
- **LOW** (Blue): Other review-needed cases

**Example Notification**:
```
Title: Payment Classification Needs Review
Message: Payment from John Doe (Flat A-101) has Low confidence
         classification: Bank statement. Please review the document.
Severity: Medium
```

### 2. Future Triggers (Planned)

Additional triggers can be added for:
- Fraud detection alerts (high-risk payments)
- Duplicate payment warnings
- Payment approval deadlines
- System configuration changes
- Failed payment verifications
- Bulk upload errors

## How to Test

### Method 1: Upload Document That Triggers Classification Alert

1. **Login as Apartment Admin**
   - Use test credentials from `TEST_CREDENTIALS.md`
   - Example: meenakshi.admin@example.com / password123

2. **Submit a Payment with Non-Standard Document**
   - Go to your apartment's public payment form
   - Upload a document that's NOT clearly a payment proof:
     - Screenshot of random webpage
     - Photo of a building
     - Text document
     - Invoice or bill (not a payment receipt)

3. **Wait for Classification**
   - AI will classify the document (usually within seconds)
   - If confidence is low or non-payment detected → notification created

4. **Check the Bell Icon**
   - Red badge should appear with "1"
   - Click bell to see notification details

### Method 2: Manually Insert Test Notification

```sql
-- Insert a test notification for your apartment
INSERT INTO admin_notifications (
  apartment_id,
  notification_type,
  title,
  message,
  severity,
  is_read,
  is_resolved
) VALUES (
  'YOUR_APARTMENT_ID_HERE',
  'test_notification',
  'Test Notification',
  'This is a test notification to verify the bell icon is working.',
  'medium',
  false,
  false
);
```

### Method 3: Check Existing Notifications

```sql
-- View current notifications in the system
SELECT
  notification_type,
  title,
  message,
  severity,
  is_read,
  is_resolved,
  created_at
FROM admin_notifications
WHERE apartment_id = 'YOUR_APARTMENT_ID'
ORDER BY created_at DESC;
```

## Admin Actions

### Mark as Read
- Click "Mark as read" button
- Removes from unread count
- Notification stays in dropdown but without blue background

### Resolve
- Click "Resolve" button
- Completely removes notification from dropdown
- Stored in database with resolution timestamp
- Can be tracked for audit purposes

## Use Cases

### 1. Quality Control
**Scenario**: Occupant uploads wrong document type
- **Trigger**: AI detects non-payment document
- **Admin Action**: Contact occupant, request correct document
- **Benefit**: Prevents invalid submissions from cluttering payment queue

### 2. Manual Review Required
**Scenario**: Payment receipt is unclear or partial
- **Trigger**: Low confidence classification
- **Admin Action**: Manually review document details
- **Benefit**: Catches edge cases AI can't handle confidently

### 3. Fraud Prevention
**Scenario**: Suspicious document patterns detected
- **Trigger**: Fraud detection system flags payment
- **Admin Action**: Investigate before approval
- **Benefit**: Protects apartment from fraudulent payments

### 4. Data Quality
**Scenario**: Missing or incorrect payment information
- **Trigger**: Classification identifies incomplete data
- **Admin Action**: Request additional information
- **Benefit**: Maintains clean, accurate payment records

### 5. Workflow Management
**Scenario**: Bulk payments need review
- **Trigger**: Multiple low-confidence submissions
- **Admin Action**: Prioritize review queue
- **Benefit**: Efficient time management for admins

## Technical Details

### Database Table
```
admin_notifications
├── id (uuid)
├── apartment_id (uuid)
├── notification_type (text)
├── title (text)
├── message (text)
├── severity (text: low|medium|high|critical)
├── related_payment_id (uuid, nullable)
├── related_classification_id (uuid, nullable)
├── is_read (boolean)
├── is_resolved (boolean)
├── resolved_at (timestamptz, nullable)
├── resolved_by_user_id (uuid, nullable)
├── resolution_notes (text, nullable)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

### Security (RLS Policies)
- Apartment admins see ONLY their apartment's notifications
- Super admins can view all notifications (but bell not shown)
- Service role can insert notifications (system triggers)

### Performance
- Auto-refresh: Every 30 seconds
- Limit: Shows last 10 unresolved notifications in dropdown
- Unread count: Real-time badge update

## Troubleshooting

### Bell Icon Not Showing
- **Check**: Are you logged in as Apartment Admin (not Super Admin)?
- **Solution**: Bell only shows for apartment admins

### No Notifications Appearing
- **Check**: Have any documents been uploaded recently?
- **Solution**: Upload a test payment with unclear document

### Badge Not Updating
- **Check**: Wait 30 seconds for auto-refresh
- **Solution**: Refresh page manually or click bell to force reload

### Can't Mark as Read/Resolved
- **Check**: Are you the admin for this apartment?
- **Solution**: Verify RLS policies allow your user_id to update

## Future Enhancements

1. **Email Notifications**: Send email alerts for critical notifications
2. **Push Notifications**: Browser push for real-time alerts
3. **Notification Preferences**: Let admins configure which alerts they receive
4. **Notification History**: View resolved notifications archive
5. **Bulk Actions**: Mark multiple notifications as read at once
6. **Priority Queue**: Sort by severity and age
7. **Custom Triggers**: Let admins create custom notification rules

## Related Documentation

- `AI_DOCUMENT_CLASSIFICATION_GUIDE.md` - How classification works
- `FRAUD_DETECTION_GUIDE.md` - Fraud detection system
- `ADMIN_GUIDE.md` - General admin features
- `TEST_AI_CLASSIFICATION_GUIDE.md` - Testing classification system

## Quick Test Commands

```sql
-- Count your notifications
SELECT COUNT(*) FROM admin_notifications
WHERE apartment_id = 'YOUR_APARTMENT_ID'
AND is_resolved = false;

-- Get your apartment ID
SELECT id, apartment_name FROM apartments
WHERE id IN (
  SELECT apartment_id FROM admins
  WHERE email = 'your.email@example.com'
);

-- Create test notification
INSERT INTO admin_notifications (
  apartment_id, notification_type, title, message, severity
) VALUES (
  (SELECT apartment_id FROM admins WHERE email = 'your.email@example.com' LIMIT 1),
  'test', 'Test Alert', 'Testing notification system', 'low'
);
```
