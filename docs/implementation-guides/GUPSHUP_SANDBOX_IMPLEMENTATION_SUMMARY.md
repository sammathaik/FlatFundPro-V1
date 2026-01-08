# Gupshup Sandbox WhatsApp Integration - Implementation Summary

## Overview
Gupshup Sandbox WhatsApp message delivery functionality has been implemented for testing purposes. This allows admins to test end-to-end WhatsApp integration without affecting production systems or blocking payment workflows.

## What Was Implemented

### 1. Edge Function: send-whatsapp-notification
**Location:** `/supabase/functions/send-whatsapp-notification/index.ts`

**Purpose:** Sends WhatsApp messages via Gupshup Sandbox API

**Features:**
- Accepts notification data (id, recipient_phone, message_preview, recipient_name)
- Formats phone numbers correctly (ensures + prefix)
- Calls Gupshup Sandbox API
- Updates notification_outbox status based on result
- Non-blocking error handling
- Comprehensive logging

**API Integration:**
- Endpoint: `https://api.gupshup.io/sm/api/v1/msg`
- Method: POST
- Content-Type: application/x-www-form-urlencoded
- Authentication: API key in header

**Status Updates:**
- Success → `SANDBOX_SENT` with `sent_at` timestamp
- Failure → `SANDBOX_FAILED` with `failure_reason` message

**Error Handling:**
- Missing API key → SANDBOX_FAILED
- Invalid phone format → Gupshup error returned
- Network errors → Caught and logged
- Never throws to prevent blocking

### 2. Database Schema Updates

**Migration:** `add_whatsapp_delivery_tracking_fields`

**New Columns in notification_outbox:**

```sql
sent_at timestamptz          -- Timestamp when message was delivered
failure_reason text           -- Error message if delivery failed
delivery_attempts int         -- Number of delivery attempts (default 0)
```

**New Indexes:**
- `idx_notification_outbox_sent_at` - For sent notification queries
- `idx_notification_outbox_status` - For status filtering

**Benefits:**
- Track delivery success/failure
- Store error messages for debugging
- Support future retry logic
- Audit trail for all attempts

### 3. Automatic Delivery Trigger

**Migration:** `create_whatsapp_delivery_trigger`

**Function:** `attempt_whatsapp_delivery()`

**Trigger:** `trigger_whatsapp_delivery`

**Behavior:**
- Fires AFTER INSERT on notification_outbox
- Only for channel = 'WHATSAPP' and status = 'SIMULATED'
- Uses pg_net extension for async HTTP calls
- Non-blocking design - never affects transaction
- Increments delivery_attempts counter
- Handles failures gracefully

**Configuration Required:**
```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'your-url';
ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'your-key';
```

**Note:** Automatic trigger is optional. Manual testing via UI is recommended first.

### 4. UI Enhancements: WhatsApp Notifications Screen

**File:** `/src/components/admin/WhatsAppNotifications.tsx`

**New Features:**

#### Test Send Button
- Appears for notifications with `SIMULATED` status
- Green button with Send icon
- Shows loading spinner during send
- Calls edge function directly
- Updates notification list after completion
- Success/failure alerts to admin

#### Enhanced Status Badges
- `SIMULATED` - Blue badge (not sent)
- `SANDBOX_SENT` - Green badge (successfully sent)
- `SANDBOX_FAILED` - Red badge (delivery failed)
- `SENT` - Green badge (production sent)
- `FAILED` - Red badge (production failed)

#### Updated Statistics
- Sent count includes both SENT and SANDBOX_SENT
- Failed count includes both FAILED and SANDBOX_FAILED
- Accurate real-time counts

#### Enhanced Message Modal
- Shows `sent_at` timestamp if delivered
- Shows `failure_reason` if failed
- Shows `delivery_attempts` count
- Color-coded metadata (green for success, red for failure)

#### Updated Info Banner
- Title changed to "Sandbox Mode - Testing Enabled"
- Mentions Test Send button
- Explains sandbox nature
- Clear about message delivery uncertainty

## Configuration Steps

### Step 1: Set Up Gupshup Account
1. Sign up at [Gupshup](https://www.gupshup.io/)
2. Create WhatsApp Business API sandbox
3. Complete verification
4. Note API key and app name

### Step 2: Configure Supabase Secrets
```bash
# In Supabase Dashboard → Edge Functions → Manage Secrets
GUPSHUP_API_KEY=your_api_key_here
GUPSHUP_APP_NAME=FlatFundPro
```

### Step 3: Deploy Edge Function
```bash
# Using Supabase CLI
supabase functions deploy send-whatsapp-notification

# Or using npx
npx supabase functions deploy send-whatsapp-notification
```

### Step 4: Test Integration
1. Navigate to Admin Dashboard → WhatsApp Notifications
2. Find a notification with SIMULATED status
3. Click "Test Send" button
4. Check status updates to SANDBOX_SENT or SANDBOX_FAILED
5. Review failure_reason if failed

### Step 5: Optional - Enable Automatic Trigger
```sql
-- Configure database settings
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'your-service-role-key';
```

## Testing Workflow

### Manual Testing (Recommended First)

**1. Create Test Notification**
```sql
INSERT INTO notification_outbox (
  payment_submission_id,
  recipient_name,
  recipient_phone,
  message_preview,
  trigger_reason,
  template_name
) VALUES (
  'test-001',
  'Test User',
  '+919876543210',
  'Hello Test User! This is a sandbox test from FlatFund Pro.',
  'Manual Test',
  'test_template'
);
```

**2. Test via UI**
- Go to WhatsApp Notifications screen
- Find the test notification
- Click "Test Send"
- Wait for result
- Check updated status

**3. Verify Results**
```sql
SELECT
  recipient_name,
  recipient_phone,
  status,
  sent_at,
  failure_reason,
  delivery_attempts
FROM notification_outbox
WHERE payment_submission_id = 'test-001';
```

### Expected Results

**Success Case:**
- Alert: "Message sent successfully via Gupshup Sandbox!"
- Status: SANDBOX_SENT (green badge)
- sent_at: Current timestamp
- failure_reason: NULL
- delivery_attempts: 1

**Failure Case:**
- Alert: "Failed to send message: [error message]"
- Status: SANDBOX_FAILED (red badge)
- sent_at: NULL
- failure_reason: Error description
- delivery_attempts: 1

### Automatic Testing

**After configuring database settings:**

1. Submit a payment with Owner or Tenant occupant_type
2. Notification is created automatically
3. Trigger fires and calls edge function
4. Check notification status in UI
5. Review logs if needed

## Architecture

### Data Flow

```
Payment Submission (Status: Received)
           ↓
Database Trigger: create_payment_submission_notification()
           ↓
Insert into notification_outbox (Status: SIMULATED)
           ↓
[Option A: Automatic] attempt_whatsapp_delivery() trigger
[Option B: Manual] Admin clicks "Test Send" button
           ↓
Edge Function: send-whatsapp-notification
           ↓
Gupshup Sandbox API
           ↓
Update notification_outbox:
  - Status → SANDBOX_SENT or SANDBOX_FAILED
  - sent_at → timestamp (if success)
  - failure_reason → error message (if failure)
  - delivery_attempts → increment
           ↓
UI Refreshes → Admin sees updated status
```

### Non-Blocking Design

**Critical Principle:** WhatsApp delivery NEVER blocks payment submission

**Implementation:**
1. Notification creation is separate from payment logic
2. Edge function errors don't affect transactions
3. Database trigger uses EXCEPTION handling
4. UI uses async/await with error catching
5. Status updates are informational only

**Guarantees:**
- Payment submission always succeeds
- Notification failure is logged but not blocking
- Users are never affected by delivery issues
- Audit trail is always complete

## Security Considerations

### API Key Protection
- Stored in Supabase secrets only
- Never in code or client-side
- Accessed via environment variables
- Rotatable without code changes

### Phone Number Privacy
- RLS policies enforce data isolation
- Apartment admins see only their data
- Super admins have full visibility
- All access is logged

### Service Role Key
- Only needed for automatic trigger
- Used sparingly
- Not exposed to client
- Alternative: manual triggering recommended

## Monitoring and Debugging

### View Delivery Status
```sql
-- Recent notifications with delivery info
SELECT
  id,
  recipient_name,
  status,
  sent_at,
  failure_reason,
  delivery_attempts,
  created_at
FROM notification_outbox
ORDER BY created_at DESC
LIMIT 20;
```

### View Failed Deliveries
```sql
SELECT
  recipient_phone,
  failure_reason,
  delivery_attempts,
  created_at
FROM notification_outbox
WHERE status = 'SANDBOX_FAILED'
ORDER BY created_at DESC;
```

### View Success Rate
```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM notification_outbox
WHERE delivery_attempts > 0
GROUP BY status;
```

### Edge Function Logs
- View in Supabase Dashboard
- Go to Edge Functions → send-whatsapp-notification → Logs
- Filter by time range
- Search for specific notification IDs

## Known Limitations

### Sandbox Restrictions
- Phone numbers must be whitelisted in Gupshup sandbox
- Rate limits may apply
- Delivery not guaranteed
- For testing purposes only

### Current Implementation
- No automatic retry mechanism
- No delivery confirmation tracking
- Manual refresh needed to see status updates
- Single delivery attempt only

### Future Enhancements
- Automatic retry for failed notifications
- Webhook for delivery confirmation
- Real-time status updates via WebSocket
- Batch sending support
- Template management UI

## Troubleshooting

### Issue: Edge Function Not Found
**Check:**
- Function is deployed: `supabase functions list`
- Function URL is correct
- CORS is configured properly

**Solution:**
```bash
supabase functions deploy send-whatsapp-notification
```

### Issue: API Key Error
**Check:**
- Secret is set in Supabase
- No extra spaces or quotes
- API key is valid in Gupshup

**Solution:**
- Regenerate API key in Gupshup
- Update Supabase secret
- Redeploy function

### Issue: Phone Number Rejected
**Check:**
- Format includes + prefix
- Country code is correct
- Number is whitelisted in sandbox

**Solution:**
- Format: `+[country_code][number]`
- Example: `+919876543210`
- Add number to Gupshup sandbox whitelist

### Issue: Trigger Not Firing
**Check:**
- pg_net extension enabled
- Database settings configured
- Trigger exists and is enabled

**Solution:**
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Check trigger
SELECT * FROM pg_trigger WHERE tgname = 'trigger_whatsapp_delivery';

-- Configure settings
ALTER DATABASE postgres SET app.settings.supabase_url = 'your-url';
```

### Issue: Test Send Button Not Working
**Check:**
- Browser console for errors
- Network tab for failed requests
- Environment variables are set

**Solution:**
- Verify .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Hard refresh browser (Ctrl+F5)
- Check edge function is deployed

## Production Readiness

### Before Going Live

**Technical:**
- [ ] Gupshup production account verified
- [ ] API credentials tested thoroughly
- [ ] Error handling validated
- [ ] Monitoring configured
- [ ] Rate limits understood
- [ ] Cost implications reviewed

**Legal/Compliance:**
- [ ] User consent obtained
- [ ] Privacy policy updated
- [ ] Opt-out mechanism implemented
- [ ] GDPR compliance verified
- [ ] Terms of service updated

**Testing:**
- [ ] End-to-end testing complete
- [ ] Success rate > 95%
- [ ] Failure scenarios handled
- [ ] Load testing performed
- [ ] Security audit completed

### Moving to Production

**1. Update delivery_mode**
```sql
UPDATE notification_outbox
SET delivery_mode = 'GUPSHUP_PRODUCTION'
WHERE delivery_mode = 'GUPSHUP_SANDBOX';
```

**2. Update environment variables**
```bash
# Production API key
GUPSHUP_API_KEY=production_api_key
GUPSHUP_APP_NAME=FlatFundPro
```

**3. Enable for all users**
- Remove sandbox restrictions
- Update status labels in UI
- Monitor delivery rates closely

## Documentation References

### User Guides
- **GUPSHUP_SANDBOX_SETUP_GUIDE.md** - Complete setup instructions
- **WHATSAPP_NOTIFICATIONS_PREVIEW_GUIDE.md** - Admin UI guide
- **TEST_WHATSAPP_NOTIFICATIONS_SCREEN.md** - Testing procedures
- **WHATSAPP_NOTIFICATIONS_QUICK_START.md** - Quick reference

### Technical Docs
- Edge function code: `supabase/functions/send-whatsapp-notification/index.ts`
- UI component: `src/components/admin/WhatsAppNotifications.tsx`
- Database triggers in migrations folder

### External Resources
- [Gupshup API Documentation](https://docs.gupshup.io/)
- [WhatsApp Business API](https://docs.gupshup.io/docs/whatsapp-api-overview)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Success Metrics

### Key Performance Indicators
- **Delivery Success Rate:** Target > 95%
- **Average Delivery Time:** < 5 seconds
- **Error Rate:** < 5%
- **API Response Time:** < 2 seconds

### Monitoring Queries
```sql
-- Success rate (last 24 hours)
SELECT
  ROUND(
    COUNT(*) FILTER (WHERE status = 'SANDBOX_SENT') * 100.0 / COUNT(*),
    2
  ) as success_rate_percentage
FROM notification_outbox
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND delivery_attempts > 0;

-- Average delivery time
SELECT
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_seconds
FROM notification_outbox
WHERE status = 'SANDBOX_SENT'
  AND created_at > NOW() - INTERVAL '24 hours';
```

## Conclusion

The Gupshup Sandbox WhatsApp integration is fully implemented and ready for testing. Key features include:

- Edge function for API communication
- Database schema for tracking delivery
- Optional automatic trigger
- UI with manual test capability
- Comprehensive error handling
- Non-blocking architecture
- Complete audit trail

Start with manual testing via the UI, then optionally enable the automatic trigger once confident in the setup. All components follow best practices for security, performance, and maintainability.

---

**Implementation Date:** December 30, 2024
**Status:** ✅ Complete and Ready for Configuration
**Next Steps:** Configure Gupshup credentials and begin testing
