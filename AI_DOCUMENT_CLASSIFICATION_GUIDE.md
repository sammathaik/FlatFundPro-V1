# AI Document Classification System - Phase 1 Guide

## Overview

The AI Document Classification System automatically categorizes payment screenshots using OpenAI GPT-4 Turbo. This guide explains how the system works and how to use it.

## What Gets Classified

The system analyzes OCR text extracted from payment screenshots and classifies them into these categories:

1. **UPI payment confirmation** - Screenshots from PhonePe, Google Pay, Paytm, BHIM, etc.
2. **Bank transfer confirmation** - Online banking (NEFT, RTGS, IMPS)
3. **Cheque image** - Photos of physical cheques
4. **Cash receipt** - Receipts for cash payments
5. **Non-payment document** - Invoices, bills, random images
6. **Unclear or insufficient data** - Blurry or incomplete text

## Confidence Levels

Each classification includes a confidence level:

- **High (80-100%)**: AI is very confident in the classification
- **Medium (50-79%)**: Moderately confident
- **Low (0-49%)**: Uncertain classification

## How It Works

### Automatic Classification

1. **Payment Submitted** → User submits payment with screenshot
2. **OCR Extraction** → Text is extracted from the screenshot
3. **Fraud Detection** → Fraud analysis runs (priority 1)
4. **Classification** → Document is classified by AI (priority 2)
5. **Admin Notification** → If confidence is Low, admin is notified

### Manual Classification

Admins can manually trigger classification for any payment:

1. Go to **Payment Management**
2. View payment details
3. Click **"Classify Document"** button
4. View classification results

## Admin Notifications

Admins receive automatic notifications for:

- **Low confidence classifications** (< 50%)
- **Non-payment documents** detected
- **Unclear or insufficient data** cases

### Managing Notifications

1. Click the **Bell icon** in the admin header
2. View unread notifications
3. Mark as read or resolve notifications
4. Review related payments

## Classification Analytics

View detailed analytics at **Admin Dashboard > Classification Analytics**:

### Key Metrics

- **Total Classifications**: Number of documents analyzed
- **Total Cost**: AI processing costs (GPT-4 Turbo usage)
- **Avg Processing Time**: AI response time in milliseconds
- **High Confidence**: Count and percentage of high-confidence classifications

### Charts

- **By Confidence Level**: Distribution across High/Medium/Low
- **By Document Type**: Breakdown by category

## Cost Information

### Pricing

- **Model**: GPT-4 Turbo (gpt-4-turbo-preview)
- **Cost**: ~$0.02 per classification (average)
- **Monthly Estimate**: $20 for 1,000 payments, $200 for 10,000 payments

### Cost Tracking

All costs are tracked in the database:
- Per-classification cost in cents
- Total tokens used
- Processing time
- Model version used

## Database Tables

### `payment_document_classifications`

Stores classification results:
- Document type and confidence
- Payment method and app/bank name
- Key identifiers (transaction IDs, references)
- AI model metadata (tokens, cost, time)
- Classification reasoning

### `admin_notifications`

Stores admin alerts:
- Notification type and severity
- Related payment and classification
- Read/resolved status
- Resolution notes

## API Endpoints

### Edge Function: `classify-payment-document`

**URL**: `/functions/v1/classify-payment-document`

**Method**: POST

**Request Body**:
```json
{
  "payment_submission_id": "uuid",
  "ocr_text": "extracted text from payment screenshot"
}
```

**Response**:
```json
{
  "success": true,
  "classification_id": "uuid",
  "result": {
    "document_type": "UPI payment confirmation",
    "confidence_level": "High",
    "confidence_score": 92,
    "payment_method": "UPI",
    "app_or_bank_name": "PhonePe",
    "classification_reasoning": "Clear PhonePe transaction with all required details"
  }
}
```

## Database Functions

### `get_classification_statistics(p_apartment_id)`

Returns classification statistics for an apartment:
```sql
SELECT get_classification_statistics('apartment-uuid');
```

Returns:
```json
{
  "total_classifications": 150,
  "by_confidence": {
    "High": 120,
    "Medium": 25,
    "Low": 5
  },
  "by_document_type": {
    "UPI payment confirmation": 100,
    "Bank transfer confirmation": 40,
    "Cheque image": 10
  },
  "total_cost_usd": 3.00,
  "avg_processing_time_ms": 1450,
  "last_30_days_count": 75
}
```

### `manually_classify_document(p_payment_id)`

Manually trigger classification for a payment:
```sql
SELECT manually_classify_document('payment-uuid');
```

## UI Components

### `DocumentClassificationBadge`

Shows classification results in payment details:
- Compact mode: Badge with confidence level
- Expanded mode: Full classification details
- Re-classify button for manual re-analysis

**Usage**:
```tsx
import DocumentClassificationBadge from './DocumentClassificationBadge';

<DocumentClassificationBadge
  paymentId={payment.id}
  ocrText={payment.ocr_text}
  compact={false}
/>
```

### `AdminNotifications`

Notification bell with dropdown:
- Unread count badge
- Notification list with severity indicators
- Mark as read/resolved actions

**Usage**:
```tsx
import AdminNotifications from './AdminNotifications';

<AdminNotifications />
```

### `ClassificationAnalytics`

Analytics dashboard for classification metrics:
- Summary cards (total, cost, time, confidence)
- Confidence level distribution chart
- Document type breakdown

**Usage**:
```tsx
import ClassificationAnalytics from './ClassificationAnalytics';

<ClassificationAnalytics />
```

## Security & Privacy

### Row Level Security (RLS)

All tables have RLS enabled:
- Apartment admins see only their apartment's data
- Super admins see all data
- Occupants have no access to classification data

### API Access

- Edge function requires valid JWT token
- Service role key used for database operations
- OpenAI API key stored securely in environment

## Troubleshooting

### Classification Not Working

1. **Check OCR text**: Payment must have `ocr_text` field populated
2. **Verify OCR length**: Text must be at least 10 characters
3. **Check API key**: Ensure `OPENAI_API_KEY` is configured
4. **Review logs**: Check edge function logs for errors

### High Costs

1. **Review statistics**: Check classifications per month
2. **Filter unnecessary calls**: Only classify approved payments
3. **Optimize triggers**: Ensure classification isn't called multiple times

### Low Confidence Rate

1. **Check OCR quality**: Improve screenshot resolution
2. **Enhance OCR extraction**: Better preprocessing
3. **Review failed cases**: Analyze what AI struggled with

## Future Enhancements (Phase 2+)

Planned improvements:
- GPT-4 Vision for image analysis
- Batch processing for efficiency
- Machine learning model training
- Auto-approval for High confidence + Low fraud
- Multi-language support
- Custom classification rules
- Integration with payment approval workflow

## Support

For issues or questions:
1. Check database logs: `audit_logs` table
2. Review edge function logs in Supabase
3. Check admin notifications for alerts
4. Contact system administrator

---

**Last Updated**: December 29, 2024
**Version**: Phase 1 - GPT-4 Text Analysis
**Status**: Production Ready
