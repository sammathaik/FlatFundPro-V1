# Payment Reminder System - Implementation Guide

## Overview

A comprehensive WhatsApp-based payment reminder system has been implemented to automatically notify tenants and owners about upcoming payment due dates. The system sends three automated reminders: 7 days, 3 days, and 1 day before the due date.

## Key Features

1. **WhatsApp Opt-In System**
   - Privacy-first approach with explicit consent required
   - Opt-in checkbox in payment submission form
   - Toggle preference in occupant portal
   - Default: disabled (false)

2. **Automated Reminder Schedule**
   - **7 days before due date**: First reminder
   - **3 days before due date**: Second reminder
   - **1 day before due date**: Final reminder

3. **Smart Filtering**
   - Only sends to occupants who have opted in
   - Skips flats that have already submitted payment
   - Prevents duplicate reminders
   - Calculates expected amount based on collection mode (A/B/C)

4. **WhatsApp Integration**
   - Uses existing Gupshup WhatsApp API
   - Messages queued to `notification_outbox` table
   - Automatic delivery via `send-whatsapp-notification` edge function

## Database Schema

### 1. New Field: `flat_email_mappings.whatsapp_opt_in`

```sql
ALTER TABLE flat_email_mappings
ADD COLUMN whatsapp_opt_in boolean DEFAULT false;
```

- Stores occupant's consent for WhatsApp notifications
- Indexed for efficient querying
- Defaults to `false` for privacy compliance

### 2. New Table: `payment_reminders`

Tracks all sent reminders to prevent duplicates and provide audit trail:

```sql
CREATE TABLE payment_reminders (
  id uuid PRIMARY KEY,
  apartment_id uuid NOT NULL,
  expected_collection_id uuid NOT NULL,
  flat_id uuid NOT NULL,
  block_id uuid NOT NULL,
  recipient_email text NOT NULL,
  recipient_phone text NOT NULL,
  recipient_name text NOT NULL,
  reminder_type text CHECK (reminder_type IN ('7_days_before', '3_days_before', '1_day_before')),
  due_date date NOT NULL,
  collection_name text NOT NULL,
  expected_amount numeric(10, 2),
  sent_at timestamptz DEFAULT now(),
  notification_id uuid REFERENCES notification_outbox(id),
  created_at timestamptz DEFAULT now()
);
```

### 3. Database Function: `check_and_queue_payment_reminders()`

Automatically identifies occupants needing reminders and queues WhatsApp messages:

**Key Logic:**
- Scans all active collections with due dates in next 7 days
- Identifies reminder days (7, 3, or 1 day before due)
- Loops through flats with WhatsApp opt-in and mobile numbers
- Checks if payment already submitted
- Checks if reminder already sent
- Calculates expected amount based on collection mode
- Creates personalized WhatsApp message
- Inserts into `notification_outbox` table
- Records in `payment_reminders` table

**Returns:**
- Count of reminders queued
- Details of each reminder (flat number, name, due date, etc.)

## Edge Functions

### 1. `check-payment-reminders`

**Purpose:** Scheduled function to check and queue payment reminders

**How to Use:**
```bash
# Manual trigger (for testing)
curl -X POST https://your-project.supabase.co/functions/v1/check-payment-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Recommended Schedule:** Run daily at 9 AM

**What it does:**
1. Calls `check_and_queue_payment_reminders()` database function
2. Retrieves queued notifications from `notification_outbox`
3. Calls `send-whatsapp-notification` for each pending notification
4. Returns summary of reminders queued and sent

### 2. `send-whatsapp-notification` (Updated)

- Removed `TEST_SECRET` check (no longer required)
- Handles WhatsApp delivery via Gupshup Sandbox
- Updates `notification_outbox` status
- Tracks delivery attempts and failures

## Frontend Integration

### 1. Payment Submission Form (`EnhancedPaymentForm.tsx`)

**New Field Added:**
```typescript
interface FormData {
  // ... existing fields
  whatsapp_opt_in: boolean;
}
```

**UI Component:**
- Green highlighted checkbox with "Recommended" badge
- Clear explanation of reminder schedule
- Positioned after payment date field
- Saves preference to `flat_email_mappings` table

**Implementation:**
```typescript
// Update flat_email_mappings with opt-in and mobile
if (formData.contact_number && formData.contact_number.trim()) {
  await supabase
    .from('flat_email_mappings')
    .update({
      whatsapp_opt_in: formData.whatsapp_opt_in,
      mobile: formData.contact_number.trim()
    })
    .eq('apartment_id', apartmentId)
    .eq('flat_id', flatData.id);
}
```

### 2. Occupant Portal (`OccupantDashboard.tsx`)

**New Section: "Notification Preferences"**

**Features:**
- Toggle switch for WhatsApp reminders
- Real-time preference update
- Shows "Active" badge when enabled
- Warns if mobile number not provided
- Disable toggle if no mobile number

**State Management:**
```typescript
const [whatsappOptIn, setWhatsappOptIn] = useState<boolean>(false);
const [updatingPreferences, setUpdatingPreferences] = useState(false);
```

**Update Function:**
```typescript
const handleWhatsAppOptInToggle = async () => {
  setUpdatingPreferences(true);
  try {
    await supabase
      .from('flat_email_mappings')
      .update({ whatsapp_opt_in: !whatsappOptIn })
      .eq('flat_id', selectedFlatId)
      .eq('email', occupant.email);
    setWhatsappOptIn(!whatsappOptIn);
  } finally {
    setUpdatingPreferences(false);
  }
};
```

## Message Format

WhatsApp reminder messages are formatted as:

```
🔔 Payment Reminder

Dear [Name],

This is a friendly reminder that your payment for *[Collection Name]* is due on *[Due Date]* ([X] days remaining).

📍 Flat: [Flat Number]
💰 Amount Due: ₹[Amount]
📅 Due Date: [Date]

Please submit your payment at your earliest convenience to avoid late fees.

Thank you!
[Apartment Name] Management
```

## Security & Privacy

### RLS Policies

**payment_reminders table:**
- Super admins: View all reminders
- Apartment admins: View reminders for their apartment
- Service role: Insert reminders (for automated system)

### Data Protection
- Opt-in required by default (false)
- Clear consent mechanism
- Occupants can toggle preference anytime
- Mobile numbers stored securely
- No reminder sent without explicit consent

## Testing the System

### 1. Test Opt-In

1. Submit a payment with WhatsApp opt-in checkbox checked
2. Provide mobile number in format: +919876543210
3. Verify `flat_email_mappings` table updated:
   ```sql
   SELECT whatsapp_opt_in, mobile
   FROM flat_email_mappings
   WHERE flat_id = 'YOUR_FLAT_ID';
   ```

### 2. Test Reminder Queuing

1. Create an active collection with due date 7 days from now
2. Manually trigger the edge function:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/check-payment-reminders \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
   ```
3. Check `notification_outbox` for queued messages:
   ```sql
   SELECT * FROM notification_outbox
   WHERE message_type = 'payment_reminder'
   ORDER BY created_at DESC;
   ```
4. Check `payment_reminders` for tracking:
   ```sql
   SELECT * FROM payment_reminders
   ORDER BY sent_at DESC LIMIT 10;
   ```

### 3. Test Toggle in Occupant Portal

1. Login to occupant portal
2. Navigate to "Notification Preferences" section
3. Toggle WhatsApp reminders on/off
4. Verify database updated immediately

## Scheduling Reminders

### Option 1: Supabase Cron (Recommended)

Use Supabase's pg_cron extension to schedule daily runs:

```sql
-- Run every day at 9 AM
SELECT cron.schedule(
  'check-payment-reminders-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/check-payment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Option 2: External Cron Service

Use services like:
- Cron-job.org
- EasyCron
- AWS CloudWatch Events
- GitHub Actions scheduled workflows

Example GitHub Actions workflow:
```yaml
name: Daily Payment Reminders
on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM UTC daily
jobs:
  trigger-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call reminder function
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/check-payment-reminders \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

## Monitoring & Maintenance

### 1. Check Reminder Stats

```sql
-- Count of reminders sent by type
SELECT
  reminder_type,
  COUNT(*) as count,
  DATE(sent_at) as date
FROM payment_reminders
GROUP BY reminder_type, DATE(sent_at)
ORDER BY date DESC, reminder_type;
```

### 2. Check Failed Deliveries

```sql
-- Check failed WhatsApp deliveries
SELECT
  pr.*,
  no.status,
  no.failure_reason
FROM payment_reminders pr
JOIN notification_outbox no ON no.id = pr.notification_id
WHERE no.status = 'SANDBOX_FAILED'
ORDER BY pr.sent_at DESC;
```

### 3. Opt-In Statistics

```sql
-- Count of occupants with WhatsApp opt-in
SELECT
  a.apartment_name,
  COUNT(*) FILTER (WHERE fem.whatsapp_opt_in = true) as opted_in,
  COUNT(*) as total_occupants,
  ROUND(100.0 * COUNT(*) FILTER (WHERE fem.whatsapp_opt_in = true) / COUNT(*), 2) as opt_in_percentage
FROM flat_email_mappings fem
JOIN apartments a ON a.id = fem.apartment_id
GROUP BY a.apartment_name;
```

## Troubleshooting

### Issue: Reminders not being sent

**Check:**
1. Verify collection is active: `is_active = true`
2. Check due date is within next 7 days
3. Verify occupant has opted in: `whatsapp_opt_in = true`
4. Check mobile number exists and is valid format
5. Verify payment not already submitted
6. Check edge function logs in Supabase dashboard

### Issue: Duplicate reminders

**Check:**
1. Query `payment_reminders` table for duplicates
2. The system automatically prevents duplicates per (collection_id, flat_id, reminder_type)
3. If duplicates exist, check for edge function being called multiple times

### Issue: Occupant can't enable WhatsApp

**Check:**
1. Mobile number provided in `flat_email_mappings`
2. RLS policies allow update on `flat_email_mappings`
3. Browser console for JavaScript errors
4. Network tab for failed API calls

## Benefits

1. **Reduced Late Payments**: Automated reminders help occupants stay on track
2. **Reduced Manual Work**: No need for admins to manually send reminders
3. **Better Communication**: Direct WhatsApp messages are more likely to be seen
4. **Audit Trail**: Complete tracking of all reminders sent
5. **Privacy Compliant**: Opt-in system respects occupant preferences
6. **Scalable**: Handles multiple apartments and collections automatically

## Future Enhancements

1. **SMS Fallback**: Add SMS delivery for non-WhatsApp users
2. **Custom Schedules**: Allow apartments to customize reminder timing
3. **Overdue Reminders**: Send reminders after due date passes
4. **Read Receipts**: Track if WhatsApp messages were read
5. **Response Handling**: Allow occupants to respond with payment status
6. **Multi-Language**: Support multiple languages for messages
7. **Rich Media**: Include payment QR codes in WhatsApp messages

## Summary

The payment reminder system is now fully operational:

- Database tables and functions created
- Edge functions deployed
- Frontend opt-in implemented in payment form
- Occupant portal preferences added
- All existing functionality preserved
- Build completed successfully

The system is ready for production use. Schedule the `check-payment-reminders` edge function to run daily for automated reminder delivery.
