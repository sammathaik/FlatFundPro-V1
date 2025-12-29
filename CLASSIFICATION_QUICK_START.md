# AI Classification Quick Start Guide

## Setup (One-Time)

### 1. Configure OpenAI API Key

The OpenAI API key needs to be configured in your Supabase project:

```bash
# In Supabase Dashboard:
# Settings > Edge Functions > Secrets
# Add: OPENAI_API_KEY = your-openai-api-key
```

**Getting an OpenAI API Key**:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create new secret key
5. Copy and save the key securely

### 2. Verify Database Tables

Check that these tables exist:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('payment_document_classifications', 'admin_notifications');
```

### 3. Test Classification

Run a test classification:
```sql
-- Find a payment with OCR text
SELECT id, name, LEFT(ocr_text, 50)
FROM payment_submissions
WHERE ocr_text IS NOT NULL
LIMIT 1;

-- Manually classify it (replace with actual payment ID)
SELECT manually_classify_document('payment-id-here');
```

## Using the System

### For Admins

#### 1. View Notifications

Look for the **Bell icon** in the top navigation:
- Red badge shows unread count
- Click to see notification dropdown
- Review low-confidence classifications
- Mark as read or resolve

#### 2. Classify Payments

In **Payment Management**:
1. Expand any payment row
2. Look for **"Classify Document"** button
3. Click to analyze the payment
4. View results in the expanded section

#### 3. View Analytics

Go to **Classification Analytics** page:
- Total classifications count
- Cost tracking ($ spent)
- Processing time metrics
- Confidence distribution
- Document type breakdown

### Classification Results

Each classified payment shows:

**Document Badge**:
- 📱 UPI payment confirmation
- 🏦 Bank transfer confirmation
- 💳 Cheque image
- 💵 Cash receipt
- ❌ Non-payment document
- ❓ Unclear data

**Confidence Level**:
- 🟢 High (80-100%) - Green badge
- 🟡 Medium (50-79%) - Yellow badge
- 🔴 Low (0-49%) - Red badge

**Details Include**:
- Payment method (UPI, NEFT, etc.)
- App/Bank name (PhonePe, HDFC, etc.)
- Key identifiers (Transaction IDs)
- Reasoning for classification

## When to Use

### Auto-Classification

Classification runs automatically when:
- Fraud detection completes
- OCR text is available (>10 characters)
- No existing classification found

### Manual Classification

Click "Classify Document" when:
- Reviewing suspicious payments
- OCR text was updated/corrected
- Want to re-analyze a payment
- Initial classification seems wrong

## Interpreting Results

### High Confidence (80-100%) ✅
**Action**: Likely accurate, safe to approve
**Example**: "UPI payment confirmation - PhonePe transaction with clear details"

### Medium Confidence (50-79%) ⚠️
**Action**: Review manually, verify details
**Example**: "Bank transfer confirmation - Some details unclear"

### Low Confidence (0-49%) ❌
**Action**: Requires manual review, may need re-submission
**You'll get a notification automatically!**
**Example**: "Unclear or insufficient data - Blurry screenshot"

## Common Scenarios

### Scenario 1: Payment with Clear UPI Screenshot
```
Classification: UPI payment confirmation
Confidence: High (95%)
Method: UPI
App: PhonePe
Identifiers: {transaction_id: "T202412290001"}
Reasoning: "Clear PhonePe transaction with amount, date, and reference"
```
**Action**: ✅ Approve payment

### Scenario 2: Blurry Bank Screenshot
```
Classification: Unclear or insufficient data
Confidence: Low (25%)
Method: null
App: null
Reasoning: "OCR text is fragmented and unclear"
```
**Action**: 🔴 Request clearer screenshot from user

### Scenario 3: Invoice Instead of Payment Proof
```
Classification: Non-payment document
Confidence: High (88%)
Reasoning: "Document appears to be an invoice, not a payment confirmation"
```
**Action**: ⚠️ Reject and ask for actual payment proof

## Cost Management

### Current Pricing
- **$0.02 per classification** (average)
- **Tracked in real-time** in analytics

### Monthly Estimates
- 100 payments = $2/month
- 500 payments = $10/month
- 1,000 payments = $20/month
- 10,000 payments = $200/month

### Cost Optimization Tips
1. Only classify payments that need review
2. Use fraud detection first (free)
3. Don't re-classify unnecessarily
4. Batch review low-confidence cases weekly

## Troubleshooting

### "No OCR text available"
**Problem**: Payment has no extracted text
**Solution**:
1. Check if image was processed
2. Try re-uploading clearer image
3. Manually enter payment details

### "Classification failed"
**Problem**: OpenAI API error
**Solution**:
1. Check API key is configured
2. Verify OpenAI account has credits
3. Check Supabase edge function logs
4. Try again in a few minutes

### "Low confidence on obvious payments"
**Problem**: AI not recognizing clear screenshots
**Solution**:
1. Check OCR text quality
2. Ensure full transaction details visible
3. Verify screenshot isn't cropped
4. Consider GPT-4 Vision upgrade (Phase 2)

## Best Practices

### For Users (Educate Your Residents)
1. ✅ Take clear, well-lit screenshots
2. ✅ Include full transaction details
3. ✅ Capture entire screen (not cropped)
4. ✅ Ensure text is readable
5. ❌ Don't submit invoices as payment proof
6. ❌ Don't edit screenshots

### For Admins
1. Review notifications daily
2. Investigate low-confidence cases first
3. Track monthly costs
4. Re-classify if OCR was corrected
5. Provide feedback to improve system
6. Train residents on good screenshot practices

## Integration with Workflow

### Recommended Approval Process

1. **Payment Received**
   - Fraud detection runs automatically
   - Classification runs automatically

2. **Review Payment**
   - Check fraud score first
   - Review classification confidence
   - Verify details match

3. **Decision Matrix**

| Fraud Score | Confidence | Action |
|------------|-----------|--------|
| Low (<40) | High | ✅ Auto-approve |
| Low | Medium | ⚠️ Quick review |
| Low | Low | 🔴 Manual review |
| Medium | Any | ⚠️ Review required |
| High (>70) | Any | 🔴 Investigation |

4. **Notification Response**
   - Review within 24 hours
   - Mark as resolved when done
   - Add notes for future reference

## Getting Help

### Check System Status
```sql
-- Classification statistics
SELECT get_classification_statistics('your-apartment-id');

-- Recent classifications
SELECT * FROM payment_document_classifications
ORDER BY classified_at DESC LIMIT 10;

-- Unresolved notifications
SELECT * FROM unresolved_notifications;
```

### Common Questions

**Q: Does classification block payment submission?**
A: No, it's completely non-blocking. Payments are recorded immediately.

**Q: Can I override AI classification?**
A: Yes, admins can add notes and manually verify.

**Q: What if classification is wrong?**
A: Click "Re-classify" to run again, or manually note the correct type.

**Q: Does it work for all payment types?**
A: Yes, it classifies UPI, bank transfers, cheques, and cash receipts.

**Q: Is my data secure?**
A: Yes, only OCR text is sent to OpenAI (not images). All data has RLS.

---

**Ready to start?** Test with a few payments and monitor the results!

**Need more details?** See [AI_DOCUMENT_CLASSIFICATION_GUIDE.md](./AI_DOCUMENT_CLASSIFICATION_GUIDE.md)
