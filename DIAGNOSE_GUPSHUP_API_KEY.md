# Diagnose Gupshup API Key Issue

## Problem
The GUPSHUP_API_KEY environment variable is not being detected even after multiple configuration attempts and redeployments.

## Diagnostic Steps

### Step 1: Deploy Diagnostic Function

This function will help us see exactly what environment variables are available:

```bash
npx supabase functions deploy test-env-vars
```

### Step 2: Test the Diagnostic Function

Run this command to test the diagnostic function:

```bash
curl -X POST 'https://rjiesmcmdfoavggkhasn.supabase.co/functions/v1/test-env-vars' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Or test from your browser console:
```javascript
const response = await fetch('https://rjiesmcmdfoavggkhasn.supabase.co/functions/v1/test-env-vars', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  }
});
const result = await response.json();
console.log('Diagnostic Results:', result);
```

### Step 3: Analyze Results

The diagnostic function will show:
1. Which environment variables are set
2. Details about the GUPSHUP_API_KEY (if present)
   - Whether it exists
   - Its length
   - First and last 4 characters (for verification)
   - Whether it contains spaces or quotes (common issues)
3. All available environment variable keys

### Expected Results

**If properly configured:**
```json
{
  "gupshupDetails": {
    "exists": true,
    "length": 32,
    "firstChars": "abcd",
    "lastChars": "xyz9",
    "hasSpaces": false,
    "hasQuotes": false
  },
  "diagnostics": {
    "gupshupConfigured": true,
    "supabaseConfigured": true,
    "allRequiredPresent": true
  }
}
```

**If NOT configured:**
```json
{
  "gupshupDetails": {
    "exists": false,
    "length": 0,
    "firstChars": "N/A",
    "lastChars": "N/A",
    "hasSpaces": false,
    "hasQuotes": false
  },
  "diagnostics": {
    "gupshupConfigured": false,
    "supabaseConfigured": true,
    "allRequiredPresent": false
  }
}
```

## Common Issues and Solutions

### Issue 1: API Key Not Showing Up at All

**Symptoms:**
- `gupshupDetails.exists`: `false`
- `gupshupDetails.length`: `0`

**Possible Causes:**
1. Secret not added to Supabase Edge Functions
2. Wrong secret name (must be exactly `GUPSHUP_API_KEY`)
3. Edge function not redeployed after adding secret

**Solution:**
1. Go to Supabase Dashboard: https://app.supabase.com/project/rjiesmcmdfoavggkhasn/settings/functions
2. Click "Manage secrets"
3. Verify `GUPSHUP_API_KEY` is in the list
4. If not, click "Add new secret"
   - Name: `GUPSHUP_API_KEY` (exactly, case-sensitive)
   - Value: Your API key from Gupshup
5. After adding/updating, redeploy ALL edge functions:
   ```bash
   npx supabase functions deploy test-env-vars
   npx supabase functions deploy send-whatsapp-notification
   ```
6. Wait 60 seconds, then test again

### Issue 2: API Key Has Spaces or Quotes

**Symptoms:**
- `gupshupDetails.hasSpaces`: `true` OR
- `gupshupDetails.hasQuotes`: `true`

**Solution:**
1. Delete the existing secret from Supabase
2. Go to Gupshup dashboard and copy the API key again
3. Paste into a plain text editor first
4. Remove any leading/trailing spaces
5. Remove any quotation marks
6. Copy the clean key
7. Add back to Supabase
8. Redeploy functions
9. Test again

### Issue 3: Wrong API Key

**Symptoms:**
- Key exists but Gupshup returns "Portal User not found"
- `gupshupDetails.exists`: `true`
- But `firstChars` and `lastChars` don't match what you expect

**Solution:**
1. Log into Gupshup: https://www.gupshup.io/developer/home
2. Verify which API key is shown there
3. Compare first/last 4 characters with diagnostic output
4. If different, update the secret in Supabase
5. Redeploy functions

### Issue 4: Functions Not Redeployed

**Symptoms:**
- You added the secret but it's still not showing up
- Secret is visible in Supabase dashboard

**Solution:**
Edge functions must be redeployed after adding/updating secrets:

```bash
# Deploy all functions
npx supabase functions deploy test-env-vars
npx supabase functions deploy send-whatsapp-notification
npx supabase functions deploy send-payment-acknowledgment
npx supabase functions deploy send-payment-reminders
```

Or deploy them one by one:
```bash
npx supabase functions deploy send-whatsapp-notification
```

**Important:** Wait 30-60 seconds after deploying before testing.

### Issue 5: Supabase Edge Functions Secrets Not Working

**Symptoms:**
- Secret is configured correctly
- Functions are deployed
- But still not detected

**Nuclear Option - Recreate the Secret:**

1. **Delete existing secret:**
   - Go to Supabase Dashboard → Project Settings → Edge Functions
   - Find `GUPSHUP_API_KEY` and delete it

2. **Clear browser cache and log out/in to Supabase Dashboard**

3. **Re-add the secret:**
   - Add new secret with name: `GUPSHUP_API_KEY`
   - Paste value: Your Gupshup API key
   - Save

4. **Redeploy all functions:**
   ```bash
   npx supabase functions deploy test-env-vars
   npx supabase functions deploy send-whatsapp-notification
   ```

5. **Wait 2 minutes** (longer than usual)

6. **Test diagnostic function again**

## Verification Checklist

Before contacting support, verify:

- [ ] Secret named exactly `GUPSHUP_API_KEY` (case-sensitive)
- [ ] Secret value has NO spaces before/after
- [ ] Secret value has NO quotation marks
- [ ] Secret is visible in Supabase Dashboard under Edge Functions → Manage secrets
- [ ] Edge functions have been redeployed AFTER adding secret
- [ ] Waited at least 60 seconds after redeployment
- [ ] Tested with diagnostic function
- [ ] Browser cache cleared
- [ ] API key is correct and from Gupshup dashboard

## Alternative: Use Supabase CLI Instead of npx

If `npx supabase` is not working, try:

1. **Install Supabase CLI globally:**
   ```bash
   npm install -g supabase
   ```

2. **Link to your project:**
   ```bash
   supabase link --project-ref rjiesmcmdfoavggkhasn
   ```

3. **Deploy functions:**
   ```bash
   supabase functions deploy test-env-vars
   supabase functions deploy send-whatsapp-notification
   ```

## Still Not Working?

If after all these steps the API key is still not detected:

### Check Supabase Project Status
- Verify your project is active and not paused
- Check for any platform-wide issues: https://status.supabase.com/

### Check Edge Function Logs
1. Go to Supabase Dashboard → Edge Functions
2. Select `test-env-vars`
3. Click "Logs"
4. Look for any errors or warnings
5. Check if the function is actually being invoked

### Contact Supabase Support
If the secret is configured but edge functions can't access it, this might be a platform issue:
- Open a support ticket with Supabase
- Include:
  - Project ID: `rjiesmcmdfoavggkhasn`
  - Secret name: `GUPSHUP_API_KEY`
  - Steps you've already taken
  - Diagnostic function output

## Clean Up After Diagnosis

Once you've fixed the issue, you can optionally remove the diagnostic function:

```bash
# Delete the diagnostic function
supabase functions delete test-env-vars
```

Or keep it for future troubleshooting.

---

**Created:** December 30, 2024
**Purpose:** Comprehensive diagnostic for Gupshup API key configuration issues
