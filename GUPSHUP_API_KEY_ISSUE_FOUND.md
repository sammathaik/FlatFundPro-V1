# Gupshup API Key Issue - Root Cause Found

## Test Results for +919686394010

### Diagnostic Test Results

✅ **GUPSHUP_API_KEY is configured in Supabase**
- Status: Present and accessible
- Length: 35 characters
- Format: `sk_d...784a`
- No spaces or quotes
- Configuration: Correct

✅ **Environment Variables Working**
- SUPABASE_URL: ✓
- SUPABASE_SERVICE_ROLE_KEY: ✓
- GUPSHUP_API_KEY: ✓
- GUPSHUP_APP_NAME: ✓

### The Real Problem

❌ **The Gupshup API key itself is INVALID**

When testing with phone +919686394010, the error returned was:
```
"Portal User Not Found With APIKey"
```

This means:
- The API key IS configured in Supabase ✓
- The API key IS being passed to Gupshup ✓
- But Gupshup **does not recognize** this API key ✗

## Root Cause Analysis

The API key currently configured is:
- **Current Key:** `sk_ded57b9abdba4d2da6a09c58f9ed784a`
- **App Name:** `fc27d30f_a1e9_e84c_cd55_0de6ee10b598`

**Gupshup's Error:** "Portal User Not Found"

This error specifically means one of the following:

1. **Wrong API Key Type**
   - You may have copied a different type of key
   - Gupshup has multiple key types (Sandbox vs Production)
   - The key format `sk_*` might not be the correct format for Gupshup

2. **Expired or Revoked Key**
   - The API key might have been regenerated
   - The account might need re-verification
   - The key might have expired

3. **Wrong Account/Portal**
   - The API key is from a different Gupshup account
   - The account associated with this key doesn't exist

4. **Incorrect Key Source**
   - Not copied from the correct location in Gupshup dashboard
   - Might be a test key that's no longer valid

## Solution: Get the Correct API Key

### Step 1: Verify Your Gupshup Account

1. **Log into Gupshup:**
   - Go to: https://www.gupshup.io/
   - Log in with your credentials

2. **Go to Developer Dashboard:**
   - URL: https://www.gupshup.io/developer/home
   - Look for the "API Key" section

3. **Verify Key Format:**
   - Gupshup API keys are typically longer (40-60 characters)
   - They usually DON'T start with `sk_`
   - They look more like: `abc123def456...` (alphanumeric)

### Step 2: Get the Correct API Key

The current key `sk_ded57b9abdba4d2da6a09c58f9ed784a` appears to be:
- Either a test/sandbox key that's no longer valid
- Or from a different service (the `sk_` prefix is more common with Stripe)
- Or an old/expired Gupshup key

**To get the correct key:**

1. In Gupshup Dashboard, look for:
   - "API Key" or "Authentication"
   - "Credentials" section
   - Usually near "Apps" or "WhatsApp Business API"

2. **Important:** The key should be:
   - Much longer than 35 characters (usually 50-60+)
   - Alphanumeric without special prefixes
   - Associated with your WhatsApp Business app

### Step 3: Update the Key in Supabase

Once you have the correct API key:

1. **Go to Supabase Dashboard:**
   - https://app.supabase.com/project/rjiesmcmdfoavggkhasn/settings/functions

2. **Update the Secret:**
   - Find `GUPSHUP_API_KEY` in secrets
   - Click "Edit" or delete and re-add
   - Paste the NEW correct key from Gupshup
   - Save

3. **Wait 30 seconds** for changes to propagate

4. **Test again** using the diagnostic tool in your dashboard

### Step 4: Verify the App Name

The current app name is: `fc27d30f_a1e9_e84c_cd55_0de6ee10b598`

This looks like a UUID, which might be correct for Gupshup. However, verify:

1. In Gupshup Dashboard, check your WhatsApp app name
2. It might be shown as:
   - App ID
   - App Name
   - Source Name
3. Update `GUPSHUP_APP_NAME` if different

## Testing After Fix

Once you've updated the API key:

### Test 1: Run Diagnostic
```
Admin Dashboard → API Diagnostic → Run Diagnostic Test
```

Should show:
- ✓ Gupshup API Key configured
- ✓ Longer key length (50+ characters)
- ✓ No `sk_` prefix

### Test 2: Send Test Message
```
Admin Dashboard → WhatsApp Notifications → Find notification → Test Send
```

Expected results:
- Either: ✓ "Message sent successfully"
- Or: "Phone number not whitelisted" (this is GOOD - means key works!)

### Test 3: Check with Your Phone
If you see "Phone number not whitelisted":
1. Go to Gupshup Sandbox settings
2. Add +919686394010 to whitelist
3. Test again - message should be delivered

## Common Gupshup Key Mistakes

### ❌ Wrong: Keys that DON'T work
- `sk_*` prefix keys (these are usually Stripe keys)
- Keys shorter than 40 characters
- Test keys from documentation/examples
- Old keys from previous accounts

### ✓ Correct: Gupshup API keys typically:
- Are 50-60+ characters long
- Are alphanumeric (letters and numbers)
- Don't have special prefixes like `sk_` or `pk_`
- Are found in the main API Key section of Gupshup Dashboard

## Quick Verification Checklist

Before updating the key, verify:

- [ ] Logged into the CORRECT Gupshup account
- [ ] Viewing the main developer dashboard
- [ ] Found the "API Key" section (not App ID or other IDs)
- [ ] Key is 40+ characters long
- [ ] Key is alphanumeric without special prefixes
- [ ] Copied the entire key without truncation
- [ ] No extra spaces or quotes when pasting

## Summary

**Current Status:**
- ✓ Supabase configuration: WORKING
- ✓ Edge functions: WORKING
- ✓ Environment variables: WORKING
- ✗ Gupshup API key: **INVALID/INCORRECT**

**Action Required:**
Get the correct API key from Gupshup Dashboard and update it in Supabase Edge Functions secrets.

**The problem is NOT:**
- Missing configuration ✓ (already configured)
- Supabase setup ✓ (working correctly)
- Edge function deployment ✓ (deployed and running)

**The problem IS:**
- The actual API key value is not recognized by Gupshup
- Need to get the correct, valid API key from your Gupshup account

---

**Test Phone:** +919686394010
**Test Date:** December 30, 2024
**Test Result:** API key configured but invalid
**Next Step:** Update with correct Gupshup API key
