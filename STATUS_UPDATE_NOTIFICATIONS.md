# Status Update Notifications System

## Overview

When an admin updates a payment status to "Approved" from the Payment Management page, the system automatically sends notifications to the resident via:
1. **Email** (using Resend) - Always sent if email address is available
2. **WhatsApp** (using Gupshup) - Only sent if mobile number is present AND resident has opted in

## How It Works

### Status Update Flow

1. Admin clicks three-dot menu (⋮) on a payment
2. Selects "Update Status"
3. Chooses "Approved" from dropdown
4. Clicks "Update Status" button
5. System:
   - Updates payment status to "Approved"
   - Records reviewer and timestamp
   - Logs action in audit trail
   - **Automatically sends notifications**
   - Shows success message

### Notification Logic

```typescript
if (newStatus === 'Approved') {
  // 1. Get flat email mapping (for mobile and opt-in status)
  // 2. Get apartment name
  // 3. Prepare notification payload
  // 4. Call send-payment-approval-notification edge function
  // 5. Non-blocking with 10-second timeout
}
```

### Email Notification (via Resend)

**When sent:**
- Always sent when status changes to "Approved"
- Requires valid email address in payment submission

**Email Content:**
- Professional HTML template
- Green gradient header with "Payment Approved"
- Payment details table:
  - Apartment name
  - Flat number
  - Approved amount (formatted as ₹X,XXX)
  - Payment date (formatted)
- "Committee Verified" badge
- FlatFund Pro branding

**Email Tracking:**
- Column: `approval_email_sent_at`
- Updated when email successfully sent
- Timestamp in ISO format

### WhatsApp Notification (via Gupshup)

**When sent:**
- Only if `whatsapp_opt_in = true` in `flat_email_mappings`
- Only if mobile number is present and not empty
- Conditional based on resident preference

**Message Content:**
```
Your maintenance payment for [Apartment Name] has been approved after committee verification. Thank you!

Flat: [Flat Number]
Amount: ₹[Amount]
Date: [Date]
```

**WhatsApp Tracking:**
- Column: `approval_whatsapp_sent_at`
- Updated when WhatsApp successfully sent
- Stored in `notification_outbox` table first
- Processed by `send-whatsapp-notification` edge function

### Data Sources

**Resident Information:**
1. **Primary Source:** Payment submission record
   - `email` - Recipient email
   - `name` - Submitter name
   - `contact_number` - Fallback mobile

2. **Enhanced Data:** `flat_email_mappings` table
   - `whatsapp_opt_in` - WhatsApp permission flag
   - `mobile` - Preferred mobile number
   - `name` - Registered occupant name

3. **Apartment Data:** `apartments` table
   - `apartment_name` - Full apartment name

**Data Hierarchy:**
- Name: `flat_email_mappings.name` → `payment_submission.name`
- Mobile: `flat_email_mappings.mobile` → `payment_submission.contact_number`
- WhatsApp Opt-in: `flat_email_mappings.whatsapp_opt_in` (default: false)

## Edge Function Details

### Function: `send-payment-approval-notification`

**Location:** `supabase/functions/send-payment-approval-notification/index.ts`

**Input Payload:**
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

**Process:**
1. Validate environment variables (RESEND_API_KEY, SUPABASE_URL)
2. Send email via Resend API
3. If WhatsApp opted-in and mobile present:
   - Insert record to `notification_outbox`
   - Call `send-whatsapp-notification` function
4. Update payment submission with notification timestamps
5. Return results for both channels

**Output:**
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
- Email failure does not block WhatsApp
- WhatsApp failure does not block email
- Both are logged but non-blocking
- Status update succeeds even if notifications fail

## Environment Variables Required

### Resend (Email)
- `RESEND_API_KEY` - Resend API key for sending emails
- Automatically available in Supabase environment

### WhatsApp (via Gupshup)
- `GUPSHUP_API_KEY` - Gupshup API key
- `GUPSHUP_APP_NAME` - Gupshup app name
- Already configured in existing edge function

### Supabase
- `SUPABASE_URL` - Auto-provided
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided

## Database Tables Updated

### `payment_submissions`

**Columns Updated:**
- `status` → "Approved"
- `reviewed_by` → Admin ID
- `reviewed_at` → Current timestamp
- `approval_notification_sent` → true (if email sent)
- `approval_email_sent_at` → Timestamp (if email sent)
- `approval_whatsapp_sent_at` → Timestamp (if WhatsApp sent)

### `notification_outbox`

**New Record Created (if WhatsApp sent):**
- `apartment_id` → null
- `recipient_phone` → Mobile number
- `recipient_name` → Recipient name
- `message_type` → "payment_approval"
- `message_preview` → WhatsApp message text
- `full_message_data` → JSON with payment details
- `status` → "PENDING" initially, then updated by edge function

## User Experience

### Admin View

**Success Message:**
- **Approved:** "Payment approved and notifications sent to [Name]!"
- **Other Status:** "Payment status updated to "[Status]" successfully!"

**Notification Feedback:**
- Success message displays for 3 seconds
- Console logs show notification results
- No error shown to admin if notifications fail (non-blocking)

### Resident View

**Email:**
- Arrives within seconds
- Professional HTML design
- Clear payment details
- "Committee Verified" badge for trust

**WhatsApp:**
- Arrives if opted-in
- Concise text message
- Contains all key details
- Branded with FlatFund Pro

## Testing Checklist

### Email Testing
- [ ] Update status to "Approved"
- [ ] Check email inbox for resident
- [ ] Verify all details are correct (amount, date, flat)
- [ ] Check `approval_email_sent_at` timestamp in database
- [ ] Test with missing email address
- [ ] Test with invalid email address

### WhatsApp Testing
- [ ] Set `whatsapp_opt_in = true` in `flat_email_mappings`
- [ ] Update status to "Approved"
- [ ] Check WhatsApp message received
- [ ] Verify message content is correct
- [ ] Check `approval_whatsapp_sent_at` timestamp
- [ ] Test with `whatsapp_opt_in = false` (should not send)
- [ ] Test with missing mobile number (should not send)
- [ ] Test with empty mobile number (should not send)

### Error Handling Testing
- [ ] Test with missing RESEND_API_KEY (email should fail gracefully)
- [ ] Test with network timeout >10s (should timeout but approve)
- [ ] Test with invalid Gupshup credentials (WhatsApp should fail gracefully)
- [ ] Verify status update succeeds even when notifications fail

### Integration Testing
- [ ] Approve payment from "Received" → "Approved"
- [ ] Approve payment from "Reviewed" → "Approved"
- [ ] Approve payment from Committee Review panel
- [ ] Update to "Received" or "Reviewed" (no notifications)
- [ ] Verify audit logs capture status change
- [ ] Check notification timing (should be <10 seconds)

## Notification Opt-In Management

### Setting Up Opt-In

**Location:** `flat_email_mappings` table

**Fields:**
- `flat_id` - Links to flat
- `apartment_id` - Links to apartment
- `email` - Occupant email
- `mobile` - Occupant mobile (10 digits)
- `whatsapp_opt_in` - Boolean (default: false)
- `name` - Occupant name
- `occupant_type` - 'Owner' or 'Tenant'

**How to Enable WhatsApp:**
1. Navigate to Occupant Management
2. Add or edit occupant record
3. Enter mobile number
4. Check "WhatsApp Opt-in" checkbox
5. Save

**Bulk Enable:**
```sql
UPDATE flat_email_mappings
SET whatsapp_opt_in = true
WHERE mobile IS NOT NULL AND mobile != '';
```

## Monitoring and Logs

### Success Logs
```
Console: "Notifications sent: { email_sent: true, whatsapp_sent: true }"
```

### Failure Logs
```
Console: "Notification send failed (non-blocking): [Error details]"
Console: "Error preparing notifications: [Error details]"
```

### Database Tracking

**Query to check notification status:**
```sql
SELECT
  id,
  name,
  flat_number,
  status,
  approval_notification_sent,
  approval_email_sent_at,
  approval_whatsapp_sent_at,
  reviewed_at
FROM payment_submissions
WHERE status = 'Approved'
ORDER BY reviewed_at DESC;
```

**Query to check WhatsApp queue:**
```sql
SELECT
  id,
  recipient_name,
  recipient_phone,
  message_type,
  status,
  sent_at,
  error_message,
  created_at
FROM notification_outbox
WHERE message_type = 'payment_approval'
ORDER BY created_at DESC;
```

## Troubleshooting

### Email Not Received

**Possible Causes:**
1. Missing or invalid RESEND_API_KEY
2. Invalid recipient email address
3. Email in spam folder
4. Resend API rate limit reached

**Solution:**
- Check console logs for error details
- Verify email address in payment submission
- Check Resend dashboard for delivery status
- Verify RESEND_API_KEY in environment variables

### WhatsApp Not Received

**Possible Causes:**
1. `whatsapp_opt_in = false` in `flat_email_mappings`
2. Missing or invalid mobile number
3. Gupshup API credentials incorrect
4. Mobile number not in correct format

**Solution:**
- Check `flat_email_mappings.whatsapp_opt_in` value
- Verify mobile number is 10 digits
- Check `notification_outbox` for error messages
- Verify GUPSHUP_API_KEY and GUPSHUP_APP_NAME

### Status Updated But No Notifications

**Possible Causes:**
1. Network timeout (>10 seconds)
2. Edge function deployment issue
3. Missing environment variables

**Solution:**
- Check console for "Notification timeout" error
- Verify edge function is deployed: `send-payment-approval-notification`
- Test edge function directly with curl
- Check Supabase function logs

### Both Notifications Failed

**Possible Causes:**
1. Edge function not deployed
2. CORS or authentication issues
3. Missing environment variables

**Solution:**
- Redeploy edge function
- Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Test edge function in Supabase dashboard
- Check network tab for failed requests

## Performance Considerations

### Timeout Handling
- 10-second timeout prevents long waits
- Uses `Promise.race()` for timeout enforcement
- Non-blocking: status update completes regardless

### Database Queries
- Optimized to fetch only needed data
- Single query per table (flat_email_mappings, apartments)
- Uses `maybeSingle()` to handle missing records gracefully

### Edge Function Performance
- Email and WhatsApp sent sequentially
- Each has independent error handling
- Total execution time typically <3 seconds

## Security Considerations

### Data Privacy
- Email and mobile numbers never logged in plain text
- Only IDs and timestamps stored in logs
- Notification content does not include sensitive info

### Authentication
- Edge function requires valid Supabase auth
- Uses service role key for database updates
- Frontend uses anon key with RLS policies

### Rate Limiting
- Resend has built-in rate limiting
- Gupshup has message quotas
- Non-blocking prevents UI impact

## Future Enhancements

### Possible Improvements
1. **Batch Notifications** - Send multiple approvals at once
2. **SMS Fallback** - If WhatsApp fails, try SMS
3. **Notification Templates** - Admin-configurable email templates
4. **Retry Logic** - Automatic retry for failed notifications
5. **Notification Preferences** - Resident-controlled opt-ins via portal
6. **Delivery Reports** - Track email opens and WhatsApp reads
7. **Multi-language** - Support for regional languages

## Related Documentation

- **Committee Approval System:** `COMMITTEE_APPROVAL_SYSTEM_GUIDE.md`
- **WhatsApp Notifications:** `WHATSAPP_NOTIFICATIONS_QUICK_START.md`
- **Email System:** `PAYMENT_ACKNOWLEDGMENT_EMAIL_GUIDE.md`
- **Notification Outbox:** `NOTIFICATION_SYSTEM_GUIDE.md`

## Support

For issues or questions:
1. Check console logs for error details
2. Review Supabase function logs
3. Test edge functions directly in Supabase dashboard
4. Verify environment variables are set correctly
5. Check database records for notification timestamps
