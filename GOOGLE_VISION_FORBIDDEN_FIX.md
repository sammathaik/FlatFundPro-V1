# Fix Google Vision API "Forbidden" Error

## Problem
Getting "Google Vision API error: Forbidden" when calling from Supabase Edge Functions.

## Root Cause
The API key likely has **Application Restrictions** or **API Restrictions** that block requests from Supabase's servers.

## Solution: Remove All API Key Restrictions

### Step 1: Go to API Key Settings
1. Open: https://console.cloud.google.com/apis/credentials
2. Find your API key in the list
3. Click on the key name to edit it

### Step 2: Remove Application Restrictions
Scroll to **Application restrictions** section:
- Select: **None** (not "HTTP referrers" or "IP addresses")
- This allows requests from any source, including Supabase edge functions

### Step 3: Check API Restrictions
Scroll to **API restrictions** section:
- Option 1: Select **Don't restrict key** (easiest for testing)
- Option 2: If you want to restrict, make sure **Cloud Vision API** is in the list

### Step 4: Save
- Click **Save** button at the bottom
- Wait 1-2 minutes for changes to propagate

## Verification

After removing restrictions, test again:

1. Go to OCR Testing page in your app
2. Upload a payment screenshot
3. Should now work without "Forbidden" error

## Security Note

For production, you should:
1. Create a separate API key for production
2. Restrict it to only Cloud Vision API (not all APIs)
3. Never restrict by IP/domain (Supabase uses dynamic IPs)
4. Monitor usage in Google Cloud Console

## Alternative: Check Billing

If removing restrictions doesn't work:

1. Go to: https://console.cloud.google.com/billing
2. Verify billing account is linked to your project
3. Check if there's a spending limit reached
4. Enable "Cloud Vision API" again: https://console.cloud.google.com/apis/library/vision.googleapis.com

## Common Mistakes

❌ **Wrong:** Setting HTTP referrer restrictions
❌ **Wrong:** Setting IP address restrictions
❌ **Wrong:** Not enabling billing
❌ **Wrong:** API key not saved after changes

✅ **Correct:** Application restrictions = None
✅ **Correct:** API restrictions = Don't restrict key (or only Cloud Vision API)
✅ **Correct:** Billing enabled and linked
✅ **Correct:** Waited 1-2 minutes after saving
