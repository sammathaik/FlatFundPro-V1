# Email Reminder System - Complete Guide

## Overview

The Email Reminder System allows apartment admins to send automated payment reminders to owners/tenants who have not submitted payment confirmation for active collections. The system uses Resend API to send professionally formatted emails with payment details.

## Features Implemented

### 1. **Database Schema**
- **email_reminders** table to track all sent reminders
- Stores recipient email, reminder type, status, and timestamp
- Tracks success/failure of each email sent
- RLS policies ensure only admins can view/create reminders

### 2. **Supabase Edge Function: send-payment-reminders**
- Deployed at: `{SUPABASE_URL}/functions/v1/send-payment-reminders`
- Authenticates the requesting user (admin or super admin)
- Fetches all flats without payment confirmation for a specific collection
- Sends beautifully formatted HTML emails via Resend API
- Logs each email attempt to the database

### 3. **Admin UI Integration**
- **"Send Reminders"** button appears next to each active collection
- Button is only visible when `allowManagement` is true
- Shows loading state while sending emails
- Displays success/error messages with count of sent/failed emails

## How It Works

### Reminder Logic Based on Due Date

The system automatically determines the urgency of the reminder based on the due date:

| Days Until Due | Urgency Level | Email Subject Prefix | Message |
|---------------|---------------|---------------------|---------|
| < 0 (Overdue) | **OVERDUE** | [OVERDUE] | "This payment is X days overdue. Late fees may apply." |
| 0-3 days | **URGENT** | [URGENT] | "Only X days remaining until the due date." |
| 4-7 days | **REMINDER** | [REMINDER] | "Payment is due in X days." |
| > 7 days | **NOTICE** | [NOTICE] | "Payment is due on [date]." |

### Email Content

Each reminder email includes:
- **Professional design** with gradient header
- **Urgency banner** (color-coded: red for overdue, amber for urgent, blue for notice)
- **Complete payment details:**
  - Apartment name and block
  - Flat number and occupant type
  - Collection name and payment type
  - Amount due (formatted with rupee symbol)
  - Due date
  - Daily late fee (if applicable)
- **Call to action** to submit payment confirmation
- **Note** that reminds users to ignore if already submitted

### Who Receives Reminders?

Reminders are sent to:
- ✅ Flats with registered email addresses (in `flat_email_mappings`)
- ✅ Flats that have NOT submitted an **Approved** payment for the collection
- ❌ Flats without email addresses are skipped
- ❌ Flats with approved payments are excluded

## Testing the System

### Step 1: Prerequisites

Ensure you have:
1. ✅ Resend API key configured: `re_5QPkg65p_HiceUXsHJyo7nd41mTwbuaWJ` (already configured)
2. ✅ Active collection created with due date
3. ✅ Flats with email addresses mapped in `flat_email_mappings`
4. ✅ Some flats without approved payments

### Step 2: Test Flow

1. **Login as Admin**
   - Go to admin login page
   - Login with your apartment admin credentials

2. **Navigate to Collection Management**
   - Go to "Collections & Status" tab
   - Or directly access Payment Status Dashboard

3. **View Active Collections**
   - You should see your active collections displayed
   - Each collection shows stats: Paid, Partial, Unpaid counts

4. **Click "Send Reminders" Button**
   - Click the blue "Send Reminders" button next to an active collection
   - Confirm the action in the popup dialog
   - The button will show "Sending..." while processing

5. **Check Results**
   - Success message appears: "Reminders sent to X flats. Y failed."
   - Message auto-dismisses after 8 seconds
   - Check your email inbox (if you're registered as a flat owner/tenant)

### Step 3: Verify Email Delivery

1. **Check Inbox**
   - Look for email from "FlatFund Pro <noreply@flatfundpro.com>"
   - Subject line will have urgency prefix (e.g., "[URGENT] Payment Reminder...")
   - Email should be professionally formatted with all details

2. **Verify Email Content**
   - ✅ Correct apartment and flat details
   - ✅ Correct payment amount and due date
   - ✅ Appropriate urgency message
   - ✅ Late fee information (if applicable)

3. **Check Database Logs**
   ```sql
   SELECT
     er.*,
     fn.flat_number,
     ec.collection_name
   FROM email_reminders er
   LEFT JOIN flat_numbers fn ON er.flat_id = fn.id
   LEFT JOIN expected_collections ec ON er.expected_collection_id = ec.id
   ORDER BY er.sent_at DESC
   LIMIT 10;
   ```

## API Endpoint Details

### POST `/functions/v1/send-payment-reminders`

**Request Body:**
```json
{
  "apartment_id": "uuid",
  "expected_collection_id": "uuid",
  "reminder_type": "manual" // optional: 'due_soon', 'overdue', 'final_notice', 'manual'
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Reminders sent to 15 flats. 0 failed.",
  "sent": 15,
  "failed": 0,
  "details": [
    {
      "flat_number": "101",
      "email": "owner@example.com",
      "status": "sent"
    }
  ]
}
```

**Response (No Reminders Needed):**
```json
{
  "success": true,
  "message": "All flats have submitted payment confirmation. No reminders to send.",
  "sent": 0,
  "failed": 0
}
```

**Response (Error):**
```json
{
  "error": "Access denied. Only admins can send reminders."
}
```

## Database Schema Reference

### email_reminders Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| apartment_id | uuid | Foreign key to apartments |
| expected_collection_id | uuid | Foreign key to expected_collections |
| flat_id | uuid | Foreign key to flat_numbers (nullable) |
| recipient_email | text | Email address where reminder was sent |
| reminder_type | text | 'due_soon', 'overdue', 'final_notice', 'manual' |
| sent_at | timestamptz | When the email was sent |
| status | text | 'sent', 'failed', 'bounced' |
| error_message | text | Error details if failed (nullable) |
| created_by | uuid | User who triggered the reminder |
| created_at | timestamptz | Record creation timestamp |

## Troubleshooting

### Issue: "Access denied" error
**Solution:** Ensure you're logged in as an admin or super admin with access to the apartment.

### Issue: No emails received
**Possible causes:**
1. Check spam/junk folder
2. Verify email addresses are correctly registered in `flat_email_mappings`
3. Check Resend API key is valid
4. Review `email_reminders` table for failed entries with error messages

### Issue: "All flats have submitted payment confirmation"
**Expected behavior:** This means all flats have approved payments. No reminders needed!

### Issue: Button not visible
**Check:** Ensure you're on a page with `allowManagement={true}` prop set on the PaymentStatusDashboard component.

## Future Enhancements (Optional)

Consider implementing:
1. **Scheduled Reminders:** Automatically send reminders X days before due date
2. **SMS Reminders:** Use mobile numbers to send SMS reminders
3. **Reminder History:** View past reminders sent to each flat
4. **Custom Templates:** Allow admins to customize email templates
5. **Reminder Rules:** Set automatic reminder schedules per collection
6. **WhatsApp Integration:** Send reminders via WhatsApp Business API
7. **Email Analytics:** Track open rates and click-through rates

## Security Notes

✅ All endpoints require authentication
✅ RLS policies restrict access to apartment-specific data
✅ Resend API key is securely stored in environment variables
✅ Email sending is logged for audit purposes
✅ Only admins can trigger reminder emails

## Cost Considerations

**Resend API Pricing:**
- Free tier: 3,000 emails/month
- $20/month: 50,000 emails/month
- Additional emails: $1 per 1,000 emails

**Recommendation:** Monitor usage through Resend dashboard to avoid unexpected costs.

## Support

For issues or questions:
1. Check browser console for error messages
2. Review Supabase Edge Function logs
3. Check `email_reminders` table for delivery status
4. Verify Resend API dashboard for delivery issues

---

**Status:** ✅ Fully Implemented and Ready for Testing

**Last Updated:** 2025-12-16
