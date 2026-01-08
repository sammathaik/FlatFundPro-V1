# Payment Collections Management Guide

## Overview

The payment collections system has been enhanced with flexible payment frequencies, activation controls, and reminder functionality. This guide explains the new features and how to use them.

## Key Features

### 1. Payment Frequency Options

Collections can now be created with different frequencies:

- **One-Time**: For special collections (e.g., emergency repairs, special assessments)
- **Monthly**: Recurring monthly collections
- **Quarterly**: Standard quarterly collections (default)
- **Yearly**: Annual collections (e.g., yearly maintenance)

### 2. Collection Activation System

**Collections are INACTIVE by default** when created. This allows admins to:
- Prepare collections in advance
- Review collection details before making them visible
- Activate collections only when ready to accept payments

**Active collections** appear in the resident payment form, while inactive collections remain hidden.

### 3. Reminder Functionality

Admins can send reminders for active collections to notify residents about pending payments. The system automatically identifies flats that haven't paid or have partial payments.

## Admin Workflow

### Creating a New Collection

1. Navigate to **Expected Collections** in the admin dashboard
2. Click **Create Collection**
3. Fill in the collection details:

   **Basic Information:**
   - **Collection Name**: User-friendly name (e.g., "Q1 Maintenance 2025")
   - **Payment Type**: Maintenance, Contingency, or Emergency
   - **Payment Frequency**: One-time, Monthly, Quarterly, or Yearly

   **Frequency-Specific Fields:**

   **For One-Time Collections:**
   - Start Date (when collection begins)
   - End Date (optional, when collection closes)
   - Due Date (payment deadline)

   **For Monthly Collections:**
   - Monthly Due Day (e.g., 5th of each month)
   - Due Date (first payment deadline)

   **For Quarterly Collections:**
   - Financial Year (e.g., FY25)
   - Quarter (Q1, Q2, Q3, Q4)
   - Due Date (payment deadline)

   **For Yearly Collections:**
   - Financial Year (e.g., FY25 or 2025)
   - Due Date (payment deadline)

   **Payment Details:**
   - Amount Due per Flat
   - Daily Fine (optional late payment penalty)
   - Notes (optional instructions for residents)

4. Click **Create Collection**
   - Collection is created as **INACTIVE**
   - Not yet visible to residents

### Activating a Collection

1. Find the collection in the collections list
2. Click the **toggle icon** (currently gray/off)
3. Collection turns **green** and shows **ACTIVE** badge
4. Now visible to residents in the payment submission form

### Deactivating a Collection

1. Find the active collection (green with ACTIVE badge)
2. Click the **toggle icon** (currently green/on)
3. Collection becomes inactive
4. Hidden from resident payment forms

### Sending Reminders

1. Ensure the collection is **ACTIVE**
2. Click the **bell icon** on the collection card
3. System identifies flats with:
   - No payment submitted
   - Partial payments
   - Unapproved payments
4. Confirmation shows how many residents will be notified

### Editing a Collection

1. Click the **edit icon** on the collection card
2. Modify collection details
3. Click **Update Collection**
4. Changes are saved (activation status remains unchanged)

### Deleting a Collection

1. Click the **delete icon** on the collection card
2. Confirm deletion
3. Collection is permanently removed
4. **Warning**: This cannot be undone

## Resident Experience

### Payment Submission

When submitting a payment, residents will see:

1. **Active Collections Only**: Dropdown shows only collections that admins have activated
2. **Collection Details**: Name, amount due, and due date clearly displayed
3. **No Active Collections Message**: If no collections are active, a message instructs them to contact the admin

### Example Payment Collection Display

```
Collection Dropdown:
- Q1 Maintenance 2025 - ₹5,000 (Due: 15/4/2025)
- Emergency Repair Fund - ₹2,500 (Due: 30/3/2025)
```

## Best Practices

### 1. Collection Naming

Use clear, descriptive names:
- ✅ "Q1 Maintenance 2025"
- ✅ "Annual Sinking Fund 2025"
- ✅ "Emergency Roof Repair"
- ❌ "Collection 1"
- ❌ "Payment"

### 2. Activation Timing

- Create collections in advance
- Review all details before activating
- Activate 7-14 days before due date
- Deactivate after collection period ends

### 3. Using Frequencies

**One-Time**: Emergency repairs, special assessments, one-off expenses
**Monthly**: Regular monthly maintenance
**Quarterly**: Standard maintenance fees (most common)
**Yearly**: Annual funds, major projects

### 4. Daily Fines

- Set reasonable fine amounts (e.g., ₹10-50 per day)
- Clearly communicate fine policy to residents
- Apply consistently across all collections

### 5. Reminder Usage

- Send initial reminder 7 days before due date
- Send follow-up reminder on due date
- Send final reminder 3 days after due date
- Don't spam - space reminders reasonably

## Database Schema

### New Fields in `expected_collections` Table

```sql
payment_frequency TEXT NOT NULL DEFAULT 'quarterly'
  CHECK (payment_frequency IN ('one-time', 'monthly', 'quarterly', 'yearly'))

is_active BOOLEAN NOT NULL DEFAULT false

collection_name TEXT

start_date DATE

end_date DATE
```

### Migration Impact

- Existing collections automatically set to 'quarterly' frequency
- All existing collections remain **inactive** by default
- Collection names auto-generated from existing data
- No data loss or breaking changes

## Troubleshooting

### Collection Not Showing for Residents

**Issue**: Residents can't see a collection in the payment form

**Solution**: Check that the collection is activated (green toggle, ACTIVE badge)

### Can't Send Reminder

**Issue**: Reminder button doesn't work

**Solution**: Ensure the collection is active. Reminders can only be sent for active collections.

### Multiple Collections of Same Type

**Issue**: Need multiple maintenance collections in same period

**Solution**: Different frequencies or start dates allow multiple collections of the same type. Use descriptive names to differentiate.

### Editing Active Collections

**Issue**: Need to change amount on active collection

**Solution**: Edit the collection normally. Changes apply immediately. Consider deactivating first if major changes needed.

## Security

- Only admins can create, edit, activate, or delete collections
- Residents can only view active collections
- All RLS policies remain intact
- Audit logging tracks all collection changes

## Future Enhancements

Potential improvements for future versions:
- Email notifications for reminders
- SMS integration
- Scheduled auto-activation
- Bulk collection creation
- Collection templates
- Payment tracking dashboard per collection
