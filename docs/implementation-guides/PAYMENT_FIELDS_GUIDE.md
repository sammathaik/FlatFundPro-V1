# Payment Fields Guide: payment_type vs payment_source

## Overview

The `payment_submissions` table now has two distinct fields for tracking different aspects of payments:

### 1. `payment_type` - What the payment is for
**Source:** User form submission (resident-facing)
**Purpose:** Categorizes the purpose/type of payment
**Values:**
- `maintenance` - Regular maintenance collection
- `contingency` - Contingency fund
- `emergency` - Emergency fund

**Set by:** Residents when submitting payment proof via the public payment form
**Should NOT be modified by:** External automation or bulk import processes

### 2. `payment_source` - How the payment was made
**Source:** External automation or bulk import
**Purpose:** Identifies the payment method/source
**Values:**
- `UPI` - UPI payments
- `Bank Transfer` - Bank transfers
- `Check` / `Cheque` - Check payments
- `Cash` - Cash payments
- `NEFT` / `RTGS` / `IMPS` - Electronic transfers
- `Online Transfer` - Generic online transfers

**Set by:** External automation scripts, OCR processing, or manual data import
**Should NOT be modified by:** User form submissions

---

## Data Migration Summary

### What Was Done

A database migration was applied (`add_payment_source_field`) that:

1. **Added new column:** Created `payment_source` field in `payment_submissions` table
2. **Migrated existing data:** Moved payment method values from `payment_type` to `payment_source`
   - Records with `payment_type` = 'UPI' → now have `payment_source` = 'UPI', `payment_type` = NULL
   - Records with `payment_type` = 'Bank Transfer' → now have `payment_source` = 'Bank Transfer', `payment_type` = NULL
3. **Added database comments:** Documented the purpose of each field
4. **Created index:** Added performance index on `payment_source` for faster queries

### Current State

After migration (13 total records):
- **1 record** has `payment_type` set (user-submitted from form)
- **2 records** have `payment_source` set (migrated from old payment method data)
- **10 records** have neither field set (submitted before these fields were tracked)

---

## Usage Guidelines

### For Frontend Forms (DynamicPaymentForm.tsx)

The payment form collects `payment_type` from users:

```typescript
<select name="payment_type">
  <option value="">-- Select Type --</option>
  <option value="maintenance">Maintenance collection</option>
  <option value="contingency">Contingency fund</option>
  <option value="emergency">Emergency fund</option>
</select>
```

This field is submitted as-is and should never be overwritten by external processes.

### For External Automation

When processing payment screenshots or importing payment data from banks/UPI:

```typescript
// Set payment_source, NOT payment_type
await supabase
  .from('payment_submissions')
  .update({
    payment_source: 'UPI',  // or 'Bank Transfer', 'Check', etc.
    // Do NOT modify payment_type
  })
  .eq('id', paymentId);
```

### For Display/Reports

Both fields are now displayed in:
- **Payment Management Dashboard** - Shows payment type (what) and payment source (how)
- **CSV Exports** - Includes both columns
- **Payment Details View** - Shows "Payment Method" label for `payment_source`

---

## Database Schema

```sql
-- Column definitions
payment_type text NULL
  COMMENT 'Payment category: maintenance, contingency, emergency, etc. Set by user during submission.'

payment_source text NULL
  COMMENT 'Payment method: UPI, Bank Transfer, Check, etc. Used by external automation.'

-- Index for performance
CREATE INDEX idx_payment_submissions_payment_source
ON payment_submissions(payment_source);
```

---

## Example Scenarios

### Scenario 1: Resident submits payment proof
**User Action:** Fills form and selects "Maintenance collection"
**Result:**
- `payment_type` = `'maintenance'` ✓
- `payment_source` = `NULL`

**Later:** OCR detects it's a UPI payment
**External Process Updates:**
- `payment_type` = `'maintenance'` (unchanged) ✓
- `payment_source` = `'UPI'` ✓

### Scenario 2: Bulk import from bank statement
**Import Process:**
- `payment_type` = `NULL` (not known from bank data)
- `payment_source` = `'Bank Transfer'` ✓

**Later:** Admin reviews and manually sets category
**Admin Updates:**
- `payment_type` = `'maintenance'` ✓
- `payment_source` = `'Bank Transfer'` (unchanged) ✓

---

## Important Notes

1. **Never overwrite user-submitted `payment_type`** - This field represents the resident's stated purpose
2. **Use `payment_source` for automation** - External systems should only modify this field
3. **Both fields are optional** - Not all payments will have both fields populated
4. **Historical data** - Old records may have neither field set
5. **Filtering and reporting** - Both fields are available for filtering in the admin dashboard

---

## Migration File Location

```
supabase/migrations/[timestamp]_add_payment_source_field.sql
```

This migration is idempotent and safe to run multiple times.
