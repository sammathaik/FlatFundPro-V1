# Verify Gupshup API Key Setup

## Current Status

✅ Edge function is working (receiving requests)
✅ Notifications are being created in database
✅ API key is being sent to Gupshup
❌ Gupshup is rejecting the API key with: "Portal User Not Found With APIKey"

## What This Error Means

This specific error means:
1. The API key IS configured in Supabase
2. The edge function IS sending it to Gupshup
3. BUT Gupshup doesn't recognize this API key

## Step-by-Step Verification

### Step 1: Verify Your Gupshup API Key

1. **Log in to Gupshup:**
   - Go to: https://www.gupshup.io/developer/home
   - Make sure you're logged in

2. **Find Your API Key:**
   - Look for "API Key" section on the dashboard
   - It should be a long string like: `abc123def456ghi789jkl012mno345pqr678stu901vwx234`
   - Click "Show" or "Copy" to get the full key

3. **Important Checks:**
   - Is the API key active? (not expired or disabled)
   - Do you have a WhatsApp app/sandbox created?
   - Is your account verified?

### Step 2: Verify Supabase Configuration

1. **Open Supabase Dashboard:**
   - Go to: https://app.supabase.com/project/rjiesmcmdfoavggkhasn

2. **Check Edge Functions Secrets:**
   - Click "Project Settings" (gear icon)
   - Click "Edge Functions" in left menu
   - Click "Manage secrets" button
   - Look for: `GUPSHUP_API_KEY`

3. **Verify the API Key Value:**
   - Does it match EXACTLY what's in Gupshup dashboard?
   - No extra spaces at start or end?
   - No quotation marks?
   - Full key copied (not truncated)?

### Step 3: Update or Regenerate API Key

If you're not sure the API key is correct:

**Option A: Re-copy from Gupshup**
1. Go to Gupshup dashboard
2. Copy the API key again (use the copy button, don't select manually)
3. Go to Supabase → Edge Functions → Manage secrets
4. Delete the existing `GUPSHUP_API_KEY` secret
5. Add it again with the fresh copy
6. Make sure the value has NO extra characters

**Option B: Regenerate API Key in Gupshup**
1. In Gupshup dashboard, look for option to regenerate API key
2. Click regenerate
3. Copy the NEW key
4. Update it in Supabase Edge Functions secrets
5. Save

### Step 4: Redeploy Edge Function

**CRITICAL:** After changing any environment variable, you MUST redeploy the edge function!

The edge function won't see the new environment variable until it's redeployed.

**How to Redeploy via Supabase Dashboard:**
1. Go to: https://app.supabase.com/project/rjiesmcmdfoavggkhasn/functions
2. Find: `send-whatsapp-notification`
3. Click the "..." menu (three dots)
4. Click "Redeploy" or "Deploy"
5. Wait for deployment to complete (should take 10-30 seconds)

**Alternative - Redeploy via CLI (if you have Supabase CLI):**
```bash
supabase functions deploy send-whatsapp-notification
```

### Step 5: Wait and Test

1. **Wait 30-60 seconds** after redeploying
   - The function needs time to restart with new environment variables

2. **Clear any caches:**
   - Refresh your browser
   - Maybe close and reopen the admin panel

3. **Test with sample data:**
   - Go to Admin Dashboard → WhatsApp Notifications
   - Find a notification with status "SIMULATED"
   - Click "Test Send" button

## Test with Sample Data

You have this notification ready for testing:

**Recipient:** TANISH SAM MATHAI
**Phone:** 9606555442
**Status:** SIMULATED
**Message:** Payment acknowledgment for ₹2500

### Expected Results After Fix

**If API key is now valid:**
- ✅ Success: "Message sent via Gupshup Sandbox"
- OR new error: "Phone number not whitelisted" (this is GOOD! It means API key works)

**If API key is still invalid:**
- ❌ Same error: "Portal User Not Found With APIKey"
- Action: Try regenerating the API key in Gupshup

## Common Issues and Solutions

### Issue 1: "I've updated the key but still getting same error"

**Most common cause:** Edge function not redeployed

**Solution:**
1. Verify the function was actually redeployed (check timestamp in Supabase)
2. Wait longer (try 60 seconds)
3. Try hard refresh in browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Check edge function logs for new deployment

### Issue 2: "I'm sure the API key is correct"

**Try this:**
1. Delete the secret completely from Supabase
2. Wait 10 seconds
3. Re-add it with fresh copy
4. Redeploy function
5. Wait 60 seconds
6. Test again

### Issue 3: "I don't see Manage Secrets button"

**Navigation path:**
- Supabase Dashboard
- → Project Settings (gear icon in left sidebar)
- → Edge Functions (in the settings menu)
- → Look for "Manage secrets" or "Environment Variables" button

### Issue 4: "Gupshup says my account is not verified"

**Solution:**
- Complete Gupshup account verification
- Verify email address
- Verify phone number
- May need to wait for manual approval

## Verification Checklist

Before testing again, confirm:

- [ ] Logged into Gupshup and found API key
- [ ] API key copied WITHOUT extra spaces or quotes
- [ ] API key added to Supabase with name exactly: `GUPSHUP_API_KEY`
- [ ] Edge function redeployed (check timestamp)
- [ ] Waited at least 30 seconds after redeploy
- [ ] Browser refreshed / cache cleared
- [ ] Testing with notification that has status "SIMULATED"

## Next Steps After This Works

Once the API key is accepted, you'll need to:

1. **Whitelist test phone numbers:**
   - Go to Gupshup WhatsApp Sandbox
   - Add phone numbers: 9606555442, 9686394010
   - Format: include country code (e.g., +919606555442)

2. **Test again:**
   - Messages should now be sent successfully
   - Status will change to "SANDBOX_SENT"

3. **Production deployment:**
   - See GUPSHUP_DEPLOYMENT_CHECKLIST.md
   - Need to create proper WhatsApp Business app
   - Get app approved by WhatsApp

## Debug Information

### Check Edge Function Logs

1. Go to: https://app.supabase.com/project/rjiesmcmdfoavggkhasn/functions
2. Click on: `send-whatsapp-notification`
3. Click "Logs" tab
4. Look for recent entries

**What to look for:**
```
✅ Good: "Processing WhatsApp notification..."
✅ Good: "Attempting to send via Gupshup Sandbox..."
✅ Good: "Gupshup API response status: 200"
❌ Bad: "Gupshup API response status: 401" or "403"
❌ Bad: "Portal User Not Found With APIKey"
```

### Test Direct API Call

You can test the API key directly using curl:

```bash
curl -X POST "https://api.gupshup.io/sm/api/v1/msg" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "apikey: YOUR_ACTUAL_API_KEY_HERE" \
  -d "channel=whatsapp" \
  -d "source=FlatFundPro" \
  -d "destination=+919606555442" \
  -d "message={\"type\":\"text\",\"text\":\"Test message\"}"
```

Replace `YOUR_ACTUAL_API_KEY_HERE` with your actual API key.

**Expected responses:**
- Valid key: JSON response with `{"status":"success",...}` or phone error
- Invalid key: HTML page with "Portal User Not Found"

## Need More Help?

### Gupshup Support
- Documentation: https://docs.gupshup.io/
- Support: https://www.gupshup.io/developer/docs
- Dashboard: https://www.gupshup.io/developer/home

### Check These Files
- Edge function code: `/supabase/functions/send-whatsapp-notification/index.ts`
- Setup guide: `GUPSHUP_SANDBOX_SETUP_GUIDE.md`
- Deployment checklist: `GUPSHUP_DEPLOYMENT_CHECKLIST.md`

---

**Key Point:** The error "Portal User Not Found With APIKey" means Gupshup received an API key but doesn't recognize it. The solution is to verify the key is correct and matches your Gupshup account, then redeploy the edge function.

**Last Updated:** December 30, 2024
