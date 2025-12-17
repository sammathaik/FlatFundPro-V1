# OpenAI API Setup for Payment Validation

## Current Status
⚠️ **OpenAI API key is NOT configured** - System is using rule-based detection only (70-80% accuracy)

## Why Add OpenAI?
- **Without OpenAI**: 70-80% accuracy (rules only)
- **With OpenAI**: 90-95% accuracy (rules + AI)
- **Cost**: ~$0.001 per validation (~$1-2/month for 1000 validations)

## Step-by-Step Setup

### Step 1: Get OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign up or log in to your OpenAI account
3. Click **"Create new secret key"**
4. Give it a name (e.g., "FlatFund Payment Validation")
5. Copy the key (starts with `sk-proj-...` or `sk-...`)
6. **SAVE IT SECURELY** - you can only view it once!

### Step 2: Add to Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/rjiesmcmdfoavggkhasn
2. In the left sidebar, click **"Edge Functions"**
3. Look for **"Environment Variables"** or **"Secrets"** section
4. Click **"Add new secret"** or **"+ New Environment Variable"**
5. Enter:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: `sk-proj-...` (your copied key)
6. Click **"Save"** or **"Add"**

### Step 3: Verify Configuration

Run this test script:

```bash
node test-api-payment.js
```

**Look for**:
- ✅ `OpenAI API KEY is CONFIGURED and WORKING!` - Success!
- ⚠️ `OpenAI API KEY is NOT configured` - Not set up yet

## Test with Real Payment

To properly test OpenAI integration, you need a payment screenshot with text:

1. Upload a **real UPI/bank payment screenshot** (with visible amount, date, UTR)
2. Wait 5-10 seconds for validation
3. Check admin panel for validation results
4. Look for "AI high confidence" or "AI medium confidence" in the reason
5. Check `ai_classification` field in database

## Checking Configuration via Database

```sql
-- Check if recent validations used AI
SELECT
  name,
  validation_status,
  validation_confidence_score,
  validation_reason,
  ai_classification IS NOT NULL as used_openai,
  validation_performed_at
FROM payment_submissions
WHERE validation_performed_at IS NOT NULL
ORDER BY validation_performed_at DESC
LIMIT 5;
```

If `used_openai` is `true`, then OpenAI is working!

## Troubleshooting

### Issue: Still showing "NOT configured" after adding key

**Solutions**:
1. Wait 1-2 minutes for Supabase to apply the change
2. Check the exact variable name: must be `OPENAI_API_KEY` (case-sensitive)
3. Verify the key starts with `sk-` and is complete
4. Check Edge Function logs for API errors

### Issue: OpenAI API errors in logs

**Common causes**:
- Invalid or expired API key
- Insufficient OpenAI credits/quota
- API key doesn't have access to gpt-4o-mini model

**Solutions**:
- Verify key is valid at https://platform.openai.com/api-keys
- Add credits to your OpenAI account
- Check OpenAI API status: https://status.openai.com/

### Issue: Validation takes too long

**Normal timing**:
- OCR: 5-10 seconds
- OpenAI API: 2-4 seconds
- Total: 10-15 seconds average

If it's taking > 30 seconds, check Edge Function logs.

## Cost Estimation

**OpenAI gpt-4o-mini pricing** (as of Dec 2024):
- Input: $0.00015 per 1K tokens
- Output: $0.0006 per 1K tokens
- Average per validation: ~$0.001

**Monthly estimates**:
- 100 validations: ~$0.10
- 500 validations: ~$0.50
- 1000 validations: ~$1.00
- 5000 validations: ~$5.00

Very affordable for the accuracy boost!

## Alternative: Skip OpenAI

If you prefer not to use OpenAI:
- System works without it (rule-based only)
- 70-80% accuracy is often sufficient
- No additional costs
- Just accept that some edge cases will need manual review

## Verification Checklist

- [ ] OpenAI API key created
- [ ] Key added to Supabase Edge Functions environment variables
- [ ] Name exactly `OPENAI_API_KEY`
- [ ] Waited 1-2 minutes for changes to apply
- [ ] Tested with real payment screenshot
- [ ] Checked database for `ai_classification` data
- [ ] Verified "AI confidence" appears in validation reason

---

**Need help?** Check Edge Function logs in Supabase Dashboard for detailed error messages.
