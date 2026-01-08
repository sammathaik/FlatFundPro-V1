# Gupshup API Key Troubleshooting Guide

## The Issue

The GUPSHUP_API_KEY environment variable is not being detected by the edge functions, even after multiple configuration attempts and redeployments.

## Solution: Use the Built-in Diagnostic Tool

I've created a comprehensive diagnostic tool to help identify and fix the issue.

### Step 1: Access the Diagnostic Tool

1. Log into your Admin Dashboard
2. Look for the new **"API Diagnostic"** tab in the sidebar
3. Click on it to open the diagnostic page

### Step 2: Run the Diagnostic

1. Click the **"Run Diagnostic Test"** button
2. Wait for the results (should take 1-2 seconds)
3. Review the detailed output

### Step 3: Interpret the Results

The diagnostic will show:

#### ✅ **If Configured Correctly:**
- "Gupshup API Key is Configured ✓" (green banner)
- `Exists: YES`
- `Length: [number]` (usually 32-40 characters)
- `First 4 chars: [xxxx]` (first 4 characters of your key)
- `Last 4 chars: [xxxx]` (last 4 characters of your key)
- `Has spaces: NO`
- `Has quotes: NO`

#### ❌ **If NOT Configured:**
- "Gupshup API Key NOT Found ✗" (red banner)
- `Exists: NO`
- `Length: 0`
- Clear instructions will be shown on what to do next

#### ⚠️ **If Configured Incorrectly:**
- Key exists BUT has spaces or quotes
- Warning message will be displayed
- Instructions to fix will be provided

### Step 4: Fix Based on Diagnostic Results

#### Problem A: API Key Not Found

**What to do:**

1. **Go to Supabase Dashboard:**
   - URL: https://app.supabase.com/project/rjiesmcmdfoavggkhasn/settings/functions
   - Click on **"Edge Functions"** in the left sidebar
   - Click **"Manage secrets"** button

2. **Add the Secret:**
   - Click **"Add new secret"**
   - **Name:** `GUPSHUP_API_KEY` (exactly as shown, case-sensitive)
   - **Value:** Your Gupshup API key from https://www.gupshup.io/developer/home
   - Click **Save**

3. **Get Your API Key from Gupshup:**
   - Log into https://www.gupshup.io/
   - Go to Developer Dashboard: https://www.gupshup.io/developer/home
   - Look for "API Key" section
   - Copy the key (should be a long alphanumeric string)

4. **Important - Copy Correctly:**
   - Copy ONLY the API key
   - NO spaces before or after
   - NO quotation marks
   - NO extra characters

5. **Wait and Redeploy:**
   - After saving the secret, wait 30 seconds
   - The edge functions should automatically pick it up
   - If not, they may need redeployment (Supabase usually handles this automatically)

6. **Test Again:**
   - Go back to the API Diagnostic tab
   - Click "Run Diagnostic Test" again
   - Verify the key is now detected

#### Problem B: API Key Has Spaces or Quotes

**What to do:**

1. **Delete the Existing Secret:**
   - Go to Supabase Dashboard → Edge Functions → Manage secrets
   - Find `GUPSHUP_API_KEY`
   - Delete it

2. **Re-copy Your API Key:**
   - Go to Gupshup dashboard
   - Copy the API key fresh
   - Paste it into a plain text editor (like Notepad)
   - Check for any spaces or quotes
   - Remove them if present

3. **Add the Secret Again:**
   - In Supabase, click "Add new secret"
   - Name: `GUPSHUP_API_KEY`
   - Value: Your cleaned API key
   - Save

4. **Test Again:**
   - Wait 30 seconds
   - Run the diagnostic test again

#### Problem C: API Key Exists But Still Getting Errors

**Verify the Key is Correct:**

1. **Check First/Last 4 Characters:**
   - The diagnostic shows the first and last 4 characters of your key
   - Compare these with your actual API key from Gupshup
   - If they don't match, you copied the wrong key

2. **Verify in Gupshup:**
   - Log into Gupshup: https://www.gupshup.io/developer/home
   - Find your API key
   - Compare the first 4 and last 4 characters

3. **If Different:**
   - Delete the secret in Supabase
   - Copy the correct API key from Gupshup
   - Add it back to Supabase
   - Wait 30 seconds
   - Test again

#### Problem D: Secret is Correct But Edge Functions Don't See It

**This is a rare platform issue. Try these steps:**

1. **Clear and Recreate:**
   - Delete the `GUPSHUP_API_KEY` secret
   - Log out of Supabase Dashboard
   - Clear your browser cache
   - Log back into Supabase Dashboard
   - Add the secret again
   - Wait 2 minutes (longer than usual)
   - Test again

2. **Check Supabase Status:**
   - Visit: https://status.supabase.com/
   - Check if there are any ongoing issues with Edge Functions

3. **Contact Supabase Support:**
   - If the secret is configured but edge functions can't access it
   - This might be a platform bug
   - Open a support ticket with:
     - Project ID: `rjiesmcmdfoavggkhasn`
     - Issue: "Edge functions cannot access configured secrets"
     - Include diagnostic output

## Testing After Fix

Once you've configured the API key:

1. **Run Diagnostic Again:**
   - Go to API Diagnostic tab
   - Click "Run Diagnostic Test"
   - Verify: `Gupshup API Key is Configured ✓`

2. **Test WhatsApp Notification:**
   - Go to WhatsApp Notifications tab
   - Find a notification with "SIMULATED" status
   - Click "Test Send" button
   - You should either:
     - See success message (if phone is whitelisted)
     - See a different error (like "phone not whitelisted" - this is GOOD, means API key works)

3. **Check Edge Function Logs:**
   - Go to Supabase Dashboard → Edge Functions
   - Select `send-whatsapp-notification`
   - Click "Logs" tab
   - Look for successful API calls to Gupshup

## Expected Behavior After Fix

### Success Indicators:
- ✅ Diagnostic shows: "Gupshup API Key is Configured ✓"
- ✅ WhatsApp notifications show either:
  - "Message sent successfully" OR
  - "Phone number not whitelisted" (this is GOOD - means API key works)
- ✅ Edge function logs show Gupshup API responses

### You're Still Not Working If:
- ❌ Diagnostic shows: "Gupshup API Key NOT Found ✗"
- ❌ WhatsApp test send shows: "Gupshup API key not configured"
- ❌ Error message contains: "Portal User not found"
- ❌ Error message contains: "Unexpected token 'P'"

## Common Mistakes to Avoid

1. **Wrong Secret Name:**
   - Must be exactly: `GUPSHUP_API_KEY`
   - Case-sensitive
   - No spaces in the name

2. **Including Quotes:**
   - Don't wrap the value in quotes
   - Just paste the raw API key

3. **Copying HTML Instead of Text:**
   - If you copy from a webpage, you might get HTML
   - Use the "Copy" button in Gupshup dashboard
   - Or paste into plain text editor first

4. **Not Waiting After Changes:**
   - Always wait 30-60 seconds after adding/updating secrets
   - Edge functions need time to pick up changes

5. **Using Old/Expired Key:**
   - Gupshup API keys can expire
   - Always use the latest key from your dashboard

## Quick Checklist

Before asking for help, verify:

- [ ] Used the API Diagnostic tool
- [ ] Secret name is exactly `GUPSHUP_API_KEY`
- [ ] API key is from https://www.gupshup.io/developer/home
- [ ] No spaces or quotes in the value
- [ ] Waited at least 60 seconds after adding
- [ ] Ran diagnostic test to confirm
- [ ] Checked first/last 4 characters match
- [ ] Tested with WhatsApp notification

## Additional Resources

- **Diagnostic Tool:** Admin Dashboard → API Diagnostic tab
- **Gupshup Dashboard:** https://www.gupshup.io/developer/home
- **Supabase Edge Functions:** https://app.supabase.com/project/rjiesmcmdfoavggkhasn/functions
- **Supabase Secrets:** https://app.supabase.com/project/rjiesmcmdfoavggkhasn/settings/functions
- **Detailed Guide:** See `DIAGNOSE_GUPSHUP_API_KEY.md`

## Still Need Help?

If you've followed all steps and the diagnostic still shows the key is not configured:

1. Take a screenshot of the diagnostic output
2. Take a screenshot of your Supabase secrets page (blur the actual key value)
3. Take a screenshot of your Gupshup API key page (blur the actual key value)
4. Include these in your support request

---

**Created:** December 30, 2024
**Purpose:** Troubleshoot Gupshup API key configuration issues with built-in diagnostic tool
