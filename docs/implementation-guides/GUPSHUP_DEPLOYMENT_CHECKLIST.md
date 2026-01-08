# Gupshup Sandbox WhatsApp - Quick Deployment Checklist

## Pre-Deployment

### 1. Gupshup Account Setup
- [ ] Signed up at [Gupshup.io](https://www.gupshup.io/)
- [ ] Created WhatsApp Business API sandbox app
- [ ] Completed verification process
- [ ] Obtained API key
- [ ] Noted app name

### 2. Environment Preparation
- [ ] Supabase project accessible
- [ ] Database migrations applied
- [ ] notification_outbox table exists
- [ ] Edge Functions feature enabled

## Deployment Steps

### Step 1: Configure Supabase Secrets
```bash
# In Supabase Dashboard → Settings → Edge Functions → Secrets
```

- [ ] Added `GUPSHUP_API_KEY` secret
- [ ] Added `GUPSHUP_APP_NAME` secret (e.g., "FlatFundPro")
- [ ] Verified secrets are saved

### Step 2: Deploy Edge Function
```bash
# Option A: Supabase CLI
supabase functions deploy send-whatsapp-notification

# Option B: npx
npx supabase functions deploy send-whatsapp-notification
```

- [ ] Edge function deployed successfully
- [ ] Function appears in Supabase Dashboard
- [ ] Function URL is accessible

### Step 3: Verify Database Schema
```sql
-- Check new columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'notification_outbox'
  AND column_name IN ('sent_at', 'failure_reason', 'delivery_attempts');
```

- [ ] `sent_at` column exists
- [ ] `failure_reason` column exists
- [ ] `delivery_attempts` column exists
- [ ] Indexes created

### Step 4: Test Edge Function Manually
```bash
curl -X POST 'https://YOUR-PROJECT.supabase.co/functions/v1/send-whatsapp-notification' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-id",
    "recipient_phone": "+919876543210",
    "message_preview": "Test message",
    "recipient_name": "Test User"
  }'
```

- [ ] Edge function responds (success or failure is okay)
- [ ] No 404 or 500 errors
- [ ] Response is valid JSON

## Testing

### Test 1: Create Test Notification
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
  'Admin Test',
  '+91YOUR_WHITELISTED_NUMBER',  -- Use your actual number
  'Hello! This is a test notification from FlatFund Pro Sandbox.',
  'Manual Test',
  'test_template'
);
```

- [ ] Notification created successfully
- [ ] Appears in WhatsApp Notifications screen
- [ ] Status is SIMULATED

### Test 2: Manual Test Send via UI
- [ ] Logged into Admin Dashboard
- [ ] Navigated to WhatsApp Notifications
- [ ] Found test notification
- [ ] Clicked "Test Send" button
- [ ] Received success or failure alert
- [ ] Status updated to SANDBOX_SENT or SANDBOX_FAILED

### Test 3: Verify Results
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

**Expected if successful:**
- [ ] Status: SANDBOX_SENT
- [ ] sent_at: Has timestamp
- [ ] failure_reason: NULL
- [ ] delivery_attempts: 1

**Expected if failed:**
- [ ] Status: SANDBOX_FAILED
- [ ] sent_at: NULL
- [ ] failure_reason: Contains error message
- [ ] delivery_attempts: 1

### Test 4: End-to-End Payment Flow
- [ ] Submit a test payment as Owner or Tenant
- [ ] Payment submission succeeds
- [ ] Notification created in notification_outbox
- [ ] Check WhatsApp Notifications screen
- [ ] Test Send button appears
- [ ] Click Test Send
- [ ] Verify status updates

## Optional: Enable Automatic Delivery

### Configure Database Settings
```sql
-- Set Supabase URL
ALTER DATABASE postgres
SET app.settings.supabase_url = 'https://YOUR-PROJECT.supabase.co';

-- Set Service Role Key (use with caution)
ALTER DATABASE postgres
SET app.settings.supabase_service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

- [ ] Database settings configured
- [ ] Settings verified with SHOW command
- [ ] pg_net extension enabled

### Verify Automatic Trigger
```sql
-- Check trigger exists
SELECT
  tgname,
  tgenabled,
  tgtype
FROM pg_trigger
WHERE tgname = 'trigger_whatsapp_delivery';
```

- [ ] Trigger exists
- [ ] Trigger is enabled
- [ ] Trigger type is AFTER INSERT

### Test Automatic Delivery
```sql
-- Create new notification
INSERT INTO notification_outbox (
  payment_submission_id,
  recipient_name,
  recipient_phone,
  message_preview,
  trigger_reason,
  template_name
) VALUES (
  'auto-test-001',
  'Auto Test',
  '+919876543210',
  'Automatic delivery test.',
  'Auto Test',
  'auto_template'
);
```

- [ ] Notification created
- [ ] Trigger fired automatically
- [ ] Status updated to SANDBOX_SENT or SANDBOX_FAILED
- [ ] No manual intervention needed

## Troubleshooting

### Issue: API Key Error
**Steps:**
- [ ] Verify secret name is exactly `GUPSHUP_API_KEY`
- [ ] Check for extra spaces or quotes
- [ ] Regenerate API key in Gupshup
- [ ] Update Supabase secret
- [ ] Redeploy edge function

### Issue: Phone Number Format Error
**Steps:**
- [ ] Verify format: `+[country_code][number]`
- [ ] No spaces or special characters except +
- [ ] Country code is correct (e.g., +91 for India)
- [ ] Number is whitelisted in Gupshup sandbox

### Issue: Function Not Found
**Steps:**
- [ ] Run `supabase functions list`
- [ ] Verify function name matches exactly
- [ ] Redeploy function
- [ ] Check function logs for errors

### Issue: Trigger Not Firing
**Steps:**
- [ ] Check pg_net extension: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
- [ ] Verify database settings are set
- [ ] Check trigger is enabled
- [ ] Review PostgreSQL logs

### Issue: No Test Send Button
**Steps:**
- [ ] Verify notification status is SIMULATED
- [ ] Hard refresh browser (Ctrl+F5)
- [ ] Check browser console for errors
- [ ] Verify UI component is deployed

## Post-Deployment

### Monitoring Setup
- [ ] Bookmark Supabase Edge Function logs
- [ ] Set up delivery success rate query
- [ ] Create alert for high failure rate
- [ ] Schedule weekly review of failed notifications

### Documentation Review
- [ ] Team trained on Test Send feature
- [ ] Gupshup credentials documented securely
- [ ] Troubleshooting guide shared
- [ ] Escalation process defined

### Success Criteria
- [ ] Test Send button works consistently
- [ ] Success rate > 90% in sandbox
- [ ] Failure reasons are clear and actionable
- [ ] No impact on payment submission flow
- [ ] Admin team comfortable with testing

## Production Planning

### Before Production Release
- [ ] Gupshup production account approved
- [ ] All sandbox tests passing
- [ ] User consent mechanism implemented
- [ ] Privacy policy updated
- [ ] Opt-out functionality ready
- [ ] Cost analysis completed
- [ ] Rate limits understood
- [ ] Monitoring dashboards created

### Production Deployment Steps
1. [ ] Switch to production API credentials
2. [ ] Update delivery_mode to PRODUCTION
3. [ ] Enable for pilot group first
4. [ ] Monitor closely for 48 hours
5. [ ] Gradually roll out to all users
6. [ ] Review and optimize based on metrics

## Sign-Off

**Completed By:** ___________________
**Date:** ___________________
**Environment:** ☐ Staging  ☐ Production

**Sandbox Testing Status:**
- Manual Test Send: ☐ Pass  ☐ Fail
- Automatic Trigger: ☐ Pass  ☐ Fail  ☐ Not Enabled
- End-to-End Flow: ☐ Pass  ☐ Fail

**Ready for:**
☐ Sandbox Testing
☐ Production Planning
☐ Production Deployment

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

---

## Quick Reference

### Important URLs
- Gupshup Dashboard: https://www.gupshup.io/dashboard
- Supabase Dashboard: https://app.supabase.com/
- Edge Functions: [Your Project] → Edge Functions
- Secrets Management: [Your Project] → Settings → Edge Functions

### Key Files
- Edge Function: `supabase/functions/send-whatsapp-notification/index.ts`
- UI Component: `src/components/admin/WhatsAppNotifications.tsx`
- Setup Guide: `GUPSHUP_SANDBOX_SETUP_GUIDE.md`
- Implementation Summary: `GUPSHUP_SANDBOX_IMPLEMENTATION_SUMMARY.md`

### Support Contacts
- Technical Issues: _________________
- Gupshup Support: _________________
- Escalation: _________________

---

**Last Updated:** December 30, 2024
**Version:** 1.0
