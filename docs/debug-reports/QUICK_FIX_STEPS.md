# Quick Fix Steps - "Portal User Not Found" Error

## What's Happening

Your Gupshup API key is configured, but Gupshup is rejecting it with:
```
Portal User Not Found With APIKey
```

## Why This Happens

1. **Wrong API key** - The key in Supabase doesn't match your Gupshup account
2. **Missing redeploy** - Edge function not redeployed after adding the key
3. **Formatting issue** - Extra spaces, quotes, or incomplete key
4. **Account issue** - Gupshup account not verified or key expired

## 3-Minute Fix

### Step 1: Get Correct API Key (1 minute)

1. Open: https://www.gupshup.io/developer/home
2. Log in to your Gupshup account
3. Find "API Key" section
4. Click "Copy" button (don't manually select the text)
5. Keep this window open

### Step 2: Update Supabase (1 minute)

1. Open: https://app.supabase.com/project/rjiesmcmdfoavggkhasn/settings/functions
2. Click "Manage secrets" button
3. Find `GUPSHUP_API_KEY` in the list

**If it exists:**
- Click "..." menu next to it
- Click "Edit" or "Delete"
- If editing: paste the new key
- If deleted: click "New secret" and add it

**If it doesn't exist:**
- Click "New secret" button
- Name: `GUPSHUP_API_KEY` (exactly as shown)
- Value: Paste your API key
- Click "Save"

4. Verify:
   - No spaces before or after the key
   - No quotation marks
   - Full key pasted (not truncated)

### Step 3: Redeploy Edge Function (1 minute)

**CRITICAL:** You MUST redeploy or the function won't see the new key!

1. Go to: https://app.supabase.com/project/rjiesmcmdfoavggkhasn/functions
2. Find: `send-whatsapp-notification`
3. Click the "..." menu (three dots)
4. Click "Redeploy"
5. Wait 30 seconds

### Step 4: Test Again

1. Refresh your browser
2. Go to Admin → WhatsApp Notifications
3. Find notification with status "SIMULATED"
4. Click "Test Send"

## Expected Results

### ✅ Success (API key is now working):
- Message: "Message sent via Gupshup Sandbox"
- Status changes to "SANDBOX_SENT"

### ⚠️ New Error (API key is working, but new issue):
- "Phone number not whitelisted in sandbox"
- This is GOOD! API key is valid
- Go to: https://www.gupshup.io/whatsappsandbox
- Add phone: +919606555442
- Test again

### ❌ Still Same Error (API key still invalid):
- "Portal User Not Found With APIKey"
- Continue to Advanced Troubleshooting below

## Advanced Troubleshooting

### Option 1: Test API Key Directly

Run this command to test your API key:
```bash
bash test-gupshup-api-key.sh YOUR_API_KEY_HERE
```

This will tell you if the API key is valid before testing in the app.

### Option 2: Regenerate API Key

1. Go to Gupshup dashboard
2. Look for option to regenerate API key
3. Click regenerate
4. Copy the NEW key
5. Update in Supabase (Step 2 above)
6. Redeploy function (Step 3 above)
7. Test again

### Option 3: Check Gupshup Account Status

1. Verify email address is confirmed
2. Verify phone number is confirmed
3. Check if account needs verification
4. Check if you have any active WhatsApp apps/sandbox

### Option 4: Check Edge Function Logs

1. Go to: https://app.supabase.com/project/rjiesmcmdfoavggkhasn/functions/send-whatsapp-notification/logs
2. Look for recent log entries
3. Check what's being sent to Gupshup

**Look for:**
```
Gupshup API response status: 401
Gupshup returned non-JSON response: Portal User Not Found
```

This confirms the API key is the issue.

## Using Sample Data

You have test data ready in the database:

**Test Notification:**
- Name: TANISH SAM MATHAI
- Phone: 9606555442
- Status: SIMULATED
- Amount: ₹2500

This notification is ready to be sent via the "Test Send" button.

## Verification Checklist

Before testing, confirm:

- [ ] API key copied from Gupshup (not typed manually)
- [ ] API key pasted into Supabase exactly as: `GUPSHUP_API_KEY`
- [ ] No extra spaces or quotes in the value
- [ ] Edge function redeployed (check deployment timestamp)
- [ ] Waited at least 30 seconds after redeploy
- [ ] Browser refreshed

## Still Not Working?

### Check These:

1. **Is the API key from the right Gupshup account?**
   - Make sure you're logged into the correct account

2. **Is the API key active?**
   - Keys can expire or be disabled
   - Check Gupshup dashboard for key status

3. **Did you wait long enough after redeploy?**
   - Edge functions can take 30-60 seconds to restart
   - Try waiting 2 minutes

4. **Did the redeploy actually happen?**
   - Check the deployment timestamp in Supabase
   - Should show recent time

## What to Do Next

Once the API key works, you'll need to:

1. **Whitelist phone numbers** in Gupshup sandbox
2. **Test with real phone numbers** you have access to
3. **Verify messages are received** on WhatsApp
4. **Plan production deployment** (see GUPSHUP_DEPLOYMENT_CHECKLIST.md)

## Files to Reference

- **VERIFY_GUPSHUP_API_KEY.md** - Detailed verification guide
- **FIX_GUPSHUP_API_KEY_ERROR.md** - Comprehensive troubleshooting
- **GUPSHUP_SANDBOX_SETUP_GUIDE.md** - Complete setup instructions
- **TEST_WHATSAPP_WITH_SAMPLE.sql** - SQL queries for testing
- **test-gupshup-api-key.sh** - Script to test API key directly

## Contact Points

- **Gupshup Dashboard:** https://www.gupshup.io/developer/home
- **Supabase Functions:** https://app.supabase.com/project/rjiesmcmdfoavggkhasn/functions
- **Edge Function Secrets:** https://app.supabase.com/project/rjiesmcmdfoavggkhasn/settings/functions

---

**Remember:** The key thing is to ensure the EXACT API key from Gupshup is in Supabase with the EXACT name `GUPSHUP_API_KEY`, and then REDEPLOY the edge function.

**Last Updated:** December 30, 2024
