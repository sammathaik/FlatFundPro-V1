# Fix: Gupshup API Key Error

## The Problem

You're seeing this error when clicking "Test Send":
```
Unexpected token 'P', "Portal Use"... is not valid JSON
```

**What this means:** The Gupshup API key is not configured in Supabase, so Gupshup is returning an error page instead of processing your request.

## The Solution

### Step 1: Get Your Gupshup API Key

1. **Sign up or log in to Gupshup:**
   - Go to https://www.gupshup.io/
   - Create an account or log in

2. **Find your API key:**
   - After logging in, go to: https://www.gupshup.io/developer/home
   - Look for "API Key" section
   - Copy your API key (it's a long alphanumeric string)

3. **Important:** If you don't have a WhatsApp app yet:
   - Go to: https://www.gupshup.io/whatsappsandbox
   - Create a sandbox app
   - Note the app name (e.g., "FlatFundPro")

### Step 2: Add API Key to Supabase

1. **Open Supabase Dashboard:**
   - Go to https://app.supabase.com/
   - Select your project: `rjiesmcmdfoavggkhasn`

2. **Navigate to Edge Functions Secrets:**
   - Click on "Project Settings" (gear icon in sidebar)
   - Click "Edge Functions" in the left menu
   - Click "Manage secrets" button

3. **Add the API Key:**
   - Click "Add new secret" or similar button
   - **Name:** `GUPSHUP_API_KEY` (exactly as shown, case-sensitive)
   - **Value:** Paste your Gupshup API key
   - Click Save

4. **Add the App Name (optional but recommended):**
   - Click "Add new secret" again
   - **Name:** `GUPSHUP_APP_NAME`
   - **Value:** Your app name (e.g., `FlatFundPro`)
   - Click Save

### Step 3: Redeploy Edge Function

The edge function needs to be redeployed to pick up the new environment variables.

**If you have Supabase CLI installed:**
```bash
cd /tmp/cc-agent/61165999/project
supabase functions deploy send-whatsapp-notification
```

**If you don't have Supabase CLI:**
- You can redeploy through the Supabase Dashboard:
  - Go to Edge Functions
  - Find `send-whatsapp-notification`
  - Click the "..." menu
  - Select "Redeploy" or "Deploy"

**Alternative - Deploy from this environment:**
Since this is a development environment, you might need to use npx:
```bash
npx supabase functions deploy send-whatsapp-notification
```

### Step 4: Test Again

1. **Wait 30 seconds** after deploying for changes to take effect

2. **Go back to your application:**
   - Navigate to Admin Dashboard → WhatsApp Notifications
   - Find a notification with SIMULATED status
   - Click "Test Send" button

3. **Expected results:**
   - If API key is correct: You'll see either success or a different error (like phone number not whitelisted)
   - If API key is still wrong: You'll see the same "Portal User" error

## Verifying Your Setup

### Check Edge Function Logs

1. In Supabase Dashboard, go to Edge Functions
2. Click on `send-whatsapp-notification`
3. Click "Logs" tab
4. Look for recent logs showing:
   - "Processing WhatsApp notification..."
   - "Attempting to send via Gupshup Sandbox..."
   - Response details from Gupshup

### What to Look For in Logs

**If API key is working:**
```
Gupshup API response status: 200
Gupshup API parsed response: {"status":"success",...}
```
OR
```
Gupshup API response status: 400
Gupshup API parsed response: {"message":"Phone not whitelisted",...}
```

**If API key is NOT set:**
```
Gupshup API key not configured - marking as SANDBOX_FAILED
```

**If API key is INVALID:**
```
Gupshup returned non-JSON response: Portal User not found...
```

## Common Issues

### Issue: "Cannot find Supabase CLI"

**Solution:** Deploy through Supabase Dashboard instead of CLI
- Go to Supabase Dashboard → Edge Functions
- Find your function and redeploy through UI

### Issue: "Phone number not whitelisted"

**This is actually GOOD!** It means your API key is working.

**Solution:**
1. Go to Gupshup sandbox settings
2. Add the phone number to whitelist
3. Test again

### Issue: Still seeing "Portal User" error after adding API key

**Possible causes:**
1. Variable name is wrong (must be exactly `GUPSHUP_API_KEY`)
2. API key has extra spaces or quotes
3. Edge function wasn't redeployed
4. Need to wait longer (30-60 seconds)

**Solution:**
1. Double-check variable name in Supabase
2. Re-copy API key from Gupshup (avoid copy-paste issues)
3. Redeploy edge function again
4. Clear browser cache and try again

### Issue: "API key looks correct but still not working"

**Try this:**
1. Delete the secret from Supabase
2. Re-add it with fresh copy of API key
3. Make sure no extra characters
4. Redeploy function
5. Wait 60 seconds
6. Test again

## Quick Checklist

Before testing again, verify:

- [ ] Gupshup account created
- [ ] API key copied from Gupshup dashboard
- [ ] Secret added to Supabase with name `GUPSHUP_API_KEY`
- [ ] No extra spaces or quotes in API key value
- [ ] Edge function redeployed
- [ ] Waited at least 30 seconds after deploy
- [ ] Browser refreshed / cache cleared

## Need More Help?

### View Edge Function Code
The edge function code is at:
```
/tmp/cc-agent/61165999/project/supabase/functions/send-whatsapp-notification/index.ts
```

### View Current Environment in Logs
When you click Test Send, check the browser console and Supabase edge function logs to see what's happening.

### Gupshup Resources
- Dashboard: https://www.gupshup.io/developer/home
- Documentation: https://docs.gupshup.io/
- WhatsApp Sandbox: https://www.gupshup.io/whatsappsandbox

### Supabase Resources
- Dashboard: https://app.supabase.com/project/rjiesmcmdfoavggkhasn
- Edge Functions: https://app.supabase.com/project/rjiesmcmdfoavggkhasn/functions
- Edge Function Secrets: Project Settings → Edge Functions → Manage secrets

## What Happens Next?

Once you fix the API key issue, you might encounter other errors:

1. **"Phone number not whitelisted"** - Normal in sandbox, add phone to whitelist
2. **"Invalid phone format"** - Ensure phone starts with + and includes country code
3. **"Rate limit exceeded"** - Wait and try again, or upgrade Gupshup plan
4. **"App not configured"** - Set GUPSHUP_APP_NAME secret with your app name

These are all normal sandbox limitations and mean your integration is working!

---

**Summary:** The fix is to add your Gupshup API key to Supabase Edge Functions secrets with the name `GUPSHUP_API_KEY`, then redeploy the edge function.

**Estimated Time:** 5-10 minutes

**Last Updated:** December 30, 2024
