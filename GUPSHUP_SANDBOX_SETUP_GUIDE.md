# Gupshup Sandbox WhatsApp Integration - Setup Guide

## Overview
This guide explains how to enable Gupshup Sandbox WhatsApp message delivery for testing purposes. Messages will be attempted via Gupshup's API when notification records are created.

## Important Notes

### Sandbox Mode
- This is for TESTING ONLY
- Messages may not reach actual users
- No production guarantees
- Used to validate integration flow

### Non-Blocking Design
- Message delivery never blocks payment submission
- Failures are logged but don't stop workflows
- Status updates are informational only

## Prerequisites

### 1. Gupshup Account Setup
1. Sign up at [Gupshup](https://www.gupshup.io/)
2. Create a WhatsApp Business API sandbox app
3. Complete verification process
4. Note your API credentials

### 2. Required Credentials
You need:
- **Gupshup API Key** - Your authentication key
- **Gupshup App Name** - Your WhatsApp sender name (e.g., "FlatFundPro")

## Configuration Steps

### Step 1: Add Environment Variables to Supabase

1. **Navigate to Supabase Dashboard**
   - Go to your project settings
   - Select "Edge Functions" → "Manage secrets"

2. **Add Secrets**
   ```bash
   GUPSHUP_API_KEY=your_actual_api_key_here
   GUPSHUP_APP_NAME=FlatFundPro
   ```

3. **Verify Secrets**
   - Secrets should appear in the list
   - They will be available to all edge functions

### Step 2: Deploy the Edge Function

The edge function `send-whatsapp-notification` has been created and needs to be deployed:

```bash
# Deploy the function
npx supabase functions deploy send-whatsapp-notification
```

Or if using Supabase CLI:
```bash
supabase functions deploy send-whatsapp-notification
```

### Step 3: Verify Database Migration

The following database changes have been applied:

**New Columns in notification_outbox:**
- `sent_at` - Timestamp when message was sent
- `failure_reason` - Error message if delivery failed
- `delivery_attempts` - Number of delivery attempts

**New Status Values:**
- `SIMULATED` - Initial status (not sent)
- `SANDBOX_SENT` - Successfully sent via Gupshup
- `SANDBOX_FAILED` - Delivery failed

Verify by running:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notification_outbox';
```

### Step 4: Configure Automatic Delivery (Optional)

The database trigger `attempt_whatsapp_delivery()` has been created but requires configuration:

**Option A: Configure Database Settings (Recommended for Production)**

Add these settings to your Supabase project:
```sql
-- Set Supabase URL
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';

-- Set Service Role Key (use with caution)
ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'your-service-role-key';
```

**Option B: Manual Triggering (Recommended for Testing)**

Instead of automatic triggering, test manually first:
1. Create a test notification
2. Call the edge function manually
3. Verify delivery status

## Testing the Integration

### Manual Test via Edge Function

1. **Create a Test Notification**
   ```sql
   INSERT INTO notification_outbox (
     payment_submission_id,
     recipient_name,
     recipient_phone,
     message_preview,
     trigger_reason,
     template_name
   ) VALUES (
     'test-payment-001',
     'Test User',
     '+919876543210',
     'Hello Test User! This is a test notification from FlatFund Pro.',
     'Manual Test',
     'test_template'
   ) RETURNING id;
   ```

2. **Call Edge Function Manually**

   Using curl:
   ```bash
   curl -X POST 'https://your-project.supabase.co/functions/v1/send-whatsapp-notification' \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "id": "notification-id-from-step-1",
       "recipient_phone": "+919876543210",
       "message_preview": "Test message",
       "recipient_name": "Test User"
     }'
   ```

3. **Check Notification Status**
   ```sql
   SELECT
     id,
     recipient_name,
     recipient_phone,
     status,
     sent_at,
     failure_reason,
     delivery_attempts
   FROM notification_outbox
   WHERE id = 'notification-id-from-step-1';
   ```

### Expected Results

**Success Case:**
- `status` = `SANDBOX_SENT`
- `sent_at` has timestamp
- `failure_reason` is NULL
- `delivery_attempts` = 1

**Failure Case:**
- `status` = `SANDBOX_FAILED`
- `sent_at` is NULL
- `failure_reason` contains error message
- `delivery_attempts` = 1

## Troubleshooting

### Issue: Edge Function Not Found
**Solution:**
- Deploy the function: `supabase functions deploy send-whatsapp-notification`
- Check function list: `supabase functions list`

### Issue: API Key Error
**Solution:**
- Verify GUPSHUP_API_KEY is set correctly
- Check for extra spaces or quotes
- Regenerate API key in Gupshup dashboard

### Issue: Phone Number Format Error
**Solution:**
- Ensure phone numbers start with `+`
- Include country code (e.g., `+91` for India)
- No spaces or special characters except `+`

### Issue: Messages Not Sending
**Solution:**
1. Check Gupshup sandbox is active
2. Verify phone number is whitelisted in sandbox
3. Check Gupshup API logs
4. Review edge function logs in Supabase

### Issue: Trigger Not Firing
**Solution:**
1. Check if pg_net extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```
2. Verify database settings are configured:
   ```sql
   SHOW app.settings.supabase_url;
   ```
3. Check trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_whatsapp_delivery';
   ```

## Monitoring and Logs

### View Recent Notifications
```sql
SELECT
  id,
  recipient_name,
  recipient_phone,
  status,
  trigger_reason,
  sent_at,
  failure_reason,
  delivery_attempts,
  created_at
FROM notification_outbox
ORDER BY created_at DESC
LIMIT 20;
```

### View Failed Notifications
```sql
SELECT
  id,
  recipient_name,
  recipient_phone,
  failure_reason,
  delivery_attempts,
  created_at
FROM notification_outbox
WHERE status = 'SANDBOX_FAILED'
ORDER BY created_at DESC;
```

### View Successful Deliveries
```sql
SELECT
  id,
  recipient_name,
  recipient_phone,
  sent_at,
  created_at,
  (sent_at - created_at) as delivery_time
FROM notification_outbox
WHERE status = 'SANDBOX_SENT'
ORDER BY sent_at DESC;
```

### Edge Function Logs
View in Supabase Dashboard:
1. Go to Edge Functions
2. Select `send-whatsapp-notification`
3. Click "Logs" tab
4. Filter by time range

## Security Considerations

### API Key Protection
- Never commit API keys to code
- Use Supabase secrets only
- Rotate keys periodically
- Monitor usage for anomalies

### Phone Number Privacy
- All notification data follows RLS policies
- Admins see only their apartment's data
- Super admins have full visibility
- Audit logs track all access

### Service Role Key
- Use sparingly and with caution
- Only store in database settings if needed
- Consider alternative authentication methods
- Monitor for unauthorized usage

## Production Readiness Checklist

Before enabling in production:

- [ ] Gupshup account verified and approved
- [ ] API credentials tested and working
- [ ] Phone number formatting verified
- [ ] Delivery success rate acceptable (>90%)
- [ ] Error handling tested thoroughly
- [ ] Monitoring and alerting configured
- [ ] Cost implications understood
- [ ] User consent obtained
- [ ] Privacy policy updated
- [ ] Opt-out mechanism implemented

## Sandbox Limitations

### Gupshup Sandbox Restrictions
- Limited to whitelisted phone numbers
- May have rate limits
- Messages might not be delivered
- No delivery guarantees
- For testing purposes only

### When to Move to Production
- After thorough testing
- When Gupshup account is fully verified
- After obtaining WhatsApp Business approval
- When ready for real user communication

## Next Steps

### Phase 1: Manual Testing (Current)
1. Deploy edge function
2. Configure environment variables
3. Test with sample notifications
4. Verify status updates work
5. Review error handling

### Phase 2: Automated Testing
1. Configure database settings
2. Enable automatic trigger
3. Test with real payment submissions
4. Monitor delivery rates
5. Fix any issues

### Phase 3: Production Deployment
1. Get Gupshup production approval
2. Update delivery_mode to PRODUCTION
3. Remove sandbox restrictions
4. Enable for all users
5. Monitor and optimize

## Support Resources

### Gupshup Documentation
- [API Documentation](https://docs.gupshup.io/)
- [WhatsApp Business API Guide](https://docs.gupshup.io/docs/whatsapp-api-overview)
- [Sandbox Testing Guide](https://docs.gupshup.io/docs/sandbox)

### Supabase Documentation
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Environment Variables](https://supabase.com/docs/guides/functions/secrets)
- [Database Extensions](https://supabase.com/docs/guides/database/extensions)

### Internal Documentation
- `WHATSAPP_NOTIFICATIONS_PREVIEW_GUIDE.md` - Admin UI guide
- `TEST_WHATSAPP_NOTIFICATIONS_SCREEN.md` - Testing procedures
- Edge function code: `supabase/functions/send-whatsapp-notification/index.ts`

## FAQ

### Q: Will failed deliveries affect payment processing?
A: No. The delivery system is completely non-blocking. Payment submissions succeed regardless of notification status.

### Q: How do I know if a message was delivered?
A: Check the `status` field in notification_outbox. `SANDBOX_SENT` means Gupshup accepted it, but actual delivery to user's phone is not guaranteed in sandbox.

### Q: Can I resend failed notifications?
A: Not currently. Future versions may add a retry button. For now, create a new notification record.

### Q: How much does Gupshup cost?
A: Sandbox is free. Production pricing varies by message volume. Check Gupshup pricing page for details.

### Q: What phone number format should I use?
A: International format with + prefix: `+[country_code][number]`. Example: `+919876543210` for India.

### Q: Can I customize the message templates?
A: Yes, but message content is currently set in the notification creation trigger. Future versions may add template management UI.

### Q: Is this GDPR compliant?
A: Notification system respects privacy, but you must ensure proper consent and opt-out mechanisms are in place before production use.

## Conclusion

The Gupshup Sandbox integration is ready for testing. Follow this guide to configure credentials, deploy the edge function, and test message delivery. Start with manual testing before enabling automatic delivery.

For questions or issues, refer to the troubleshooting section or contact your system administrator.

---

**Last Updated:** December 30, 2024
**Status:** Ready for Configuration and Testing
