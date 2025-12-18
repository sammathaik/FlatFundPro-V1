# Payment Acknowledgment Email System

## Overview

The system automatically sends a professional acknowledgment email to occupants immediately after they submit a payment. This provides instant confirmation and sets expectations about the review process.

## Features

### Automatic Email Sending
- Triggered automatically on payment submission
- Non-blocking (payment succeeds even if email fails)
- Professional HTML email with beautiful design
- Plain text fallback for email clients that don't support HTML

### Email Content

The acknowledgment email includes:

1. **Visual Confirmation**
   - Green header with checkmark icon
   - "Payment Received!" heading

2. **Payment Details Box**
   - Payment type (Maintenance/Contingency/Emergency)
   - Payment quarter (if applicable)
   - Amount in ₹ format
   - Submission date and time

3. **What Happens Next Section**
   - Clear explanation that payment is under review
   - Admin will verify against bank statements
   - Approval confirmation will follow

4. **Expected Timeline**
   - 1-3 business days for verification
   - Confirmation email upon approval
   - No action required from occupant

5. **Contact Information**
   - Support for questions
   - Link to dashboard for status checking

## How It Works

### Technical Architecture

```
Payment Submitted
    ↓
Database Trigger Fires
    ↓
Collects Payment Data
    ↓
Calls Edge Function (async)
    ↓
Sends Email via Resend
    ↓
Occupant Receives Email
```

### Database Components

1. **Trigger**: `trigger_payment_acknowledgment`
   - Fires AFTER INSERT on `payment_submissions`
   - Executes for each new row

2. **Function**: `send_payment_acknowledgment_email()`
   - Retrieves email from `flat_email_mappings`
   - Collects flat and apartment details
   - Makes async HTTP call to edge function
   - Handles errors gracefully

3. **Edge Function**: `send-payment-acknowledgment`
   - Receives payment data
   - Formats beautiful HTML email
   - Sends via Resend API
   - Returns success/failure status

## Testing the System

### 1. Submit a Test Payment

```sql
-- Ensure you have a flat with email mapping
SELECT * FROM flat_email_mappings LIMIT 1;

-- Insert a test payment
INSERT INTO payment_submissions (
  flat_id,
  payment_type,
  payment_amount,
  payment_quarter,
  payment_date,
  name,
  email,
  mobile,
  status
) VALUES (
  '<flat_id_from_above>',
  'maintenance',
  5000,
  'Q1-2024',
  CURRENT_DATE,
  'Test User',
  'your-email@example.com',
  '9876543210',
  'pending'
);
```

### 2. Check Email

Within a few seconds, check the email inbox for:
- Subject: "Payment Received - Under Review | Maintenance ₹5,000"
- From: FlatFund Pro <noreply@flatfundpro.com>
- Beautiful HTML email with all payment details

### 3. Verify in Database

```sql
-- Check if trigger executed
-- Look for NOTICE messages in logs
SELECT * FROM payment_submissions ORDER BY submitted_at DESC LIMIT 5;
```

## Email Sample

### Subject Line
```
Payment Received - Under Review | Maintenance ₹5,000
```

### Email Preview
```
Dear [Name],

We have successfully received your payment submission for Flat [X]
at [Apartment Name]. Your payment details have been recorded in our system.

[Payment Details Box]
- Payment Type: Maintenance for Q1-2024
- Amount: ₹5,000
- Submitted On: December 18, 2024 at 02:30 PM

[What Happens Next]
Your payment is now under review. Our admin team will verify and
reconcile your submission with our bank statements...

[Timeline & Contact Info]
```

## Configuration

### Required Environment Variables

The system uses the following (automatically configured in Supabase):
- `RESEND_API_KEY` - For sending emails via Resend
- Supabase URL and keys (automatic)

### Email Sender

**Default**: `FlatFund Pro <noreply@flatfundpro.com>`

To customize, edit the edge function:
```typescript
from: 'Your Apartment <noreply@yourdomain.com>'
```

## Monitoring

### Check Email Sending Status

```sql
-- View recent payment submissions
SELECT
  ps.id,
  ps.name,
  ps.email,
  ps.payment_type,
  ps.payment_amount,
  ps.submitted_at,
  fem.email as mapped_email
FROM payment_submissions ps
LEFT JOIN flat_email_mappings fem ON ps.flat_id = fem.flat_id
ORDER BY ps.submitted_at DESC
LIMIT 10;
```

### Error Handling

The system is designed to be fault-tolerant:

1. **No Email Found**: Logs warning, payment succeeds
2. **Edge Function Error**: Logs warning, payment succeeds
3. **Resend API Error**: Logged in edge function, payment succeeds

Check Supabase logs for any warnings or errors.

## Benefits

### For Occupants
- Instant confirmation of payment receipt
- Clear understanding of next steps
- Reduced anxiety about payment status
- Professional communication experience

### For Administrators
- Reduced support queries ("Did you receive my payment?")
- Better occupant experience
- Automated communication
- Professional image

## Customization

### Modify Email Template

Edit `/supabase/functions/send-payment-acknowledgment/index.ts`:

1. Update `emailHtml` for HTML version
2. Update `emailText` for plain text version
3. Redeploy edge function

### Change Email Trigger Conditions

Edit the trigger function to add conditions:
```sql
-- Example: Only send for amounts over ₹1000
IF NEW.payment_amount > 1000 THEN
  -- Send email
END IF;
```

### Add Additional Recipients

Modify edge function to CC administrators:
```typescript
to: [email],
cc: ['admin@yourapartment.com'],
```

## Troubleshooting

### Email Not Received

1. Check spam/junk folder
2. Verify email exists in `flat_email_mappings`
3. Check Supabase function logs
4. Verify Resend API key is configured

### Check Logs

```sql
-- Enable detailed logging
SET client_min_messages TO NOTICE;

-- Test the trigger function directly
SELECT send_payment_acknowledgment_email();
```

### Test Edge Function Directly

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/send-payment-acknowledgment \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "flat_number": "101",
    "apartment_name": "Test Apartment",
    "payment_type": "maintenance",
    "payment_amount": 5000,
    "payment_quarter": "Q1-2024",
    "submission_date": "2024-12-18T14:30:00Z"
  }'
```

## Future Enhancements

Potential additions:
- Payment approval confirmation email
- Payment rejection email with reason
- Monthly payment summary emails
- Reminder emails for pending payments
- SMS notifications option
- Multi-language support

## Support

For issues or questions:
1. Check Supabase function logs
2. Review edge function deployment
3. Verify Resend API configuration
4. Check database trigger status
