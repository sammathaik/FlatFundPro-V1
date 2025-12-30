# Quick Test Guide: WhatsApp Notifications Preview Screen

## Purpose
This guide helps admins quickly test and verify the WhatsApp Notifications Preview screen functionality.

## Prerequisites
- Admin or Super Admin account access
- At least one payment submission with status "Received" and occupant_type "Owner" or "Tenant"
- Valid phone number in the payment submission

## Test Steps

### Step 1: Create a Test Payment Submission
To generate test notification data, submit a payment:

```sql
-- Run this SQL in Supabase SQL Editor to create a test payment
INSERT INTO payment_submissions (
  apartment_id,
  name,
  block_id,
  flat_id,
  email,
  contact_number,
  payment_amount,
  payment_date,
  screenshot_url,
  screenshot_filename,
  status,
  occupant_type
) VALUES (
  '<your-apartment-id>',
  'John Doe',
  '<your-block-id>',
  '<your-flat-id>',
  'john@example.com',
  '+919876543210',
  5000.00,
  CURRENT_DATE,
  'https://example.com/payment.jpg',
  'payment.jpg',
  'Received',
  'Owner'
);
```

**Expected Result:** A notification record should be automatically created in the `notification_outbox` table.

### Step 2: Verify Notification Creation

Check if the notification was created:

```sql
-- Verify notification exists
SELECT
  id,
  recipient_name,
  recipient_phone,
  status,
  delivery_mode,
  created_at
FROM notification_outbox
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:** You should see a new record with:
- recipient_name: "John Doe"
- recipient_phone: "+919876543210"
- status: "SIMULATED"
- delivery_mode: "GUPSHUP_SANDBOX"

### Step 3: Access the WhatsApp Notifications Screen

1. **Login to Admin Dashboard**
   - Navigate to your admin login page
   - Use your admin credentials
   - Verify successful login

2. **Navigate to WhatsApp Notifications**
   - Look in the left sidebar
   - Click on "WhatsApp Notifications" (MessageSquare icon)
   - Located between "AI Classification" and "Help Center"

**Expected Result:** You should see the WhatsApp Notifications Preview screen load.

### Step 4: Verify Screen Components

Check that all screen elements are present:

#### Header Section
- [ ] Page title displays: "WhatsApp Notifications (Preview)"
- [ ] Description text is visible
- [ ] "Filters" button is present in top-right

#### Info Banner
- [ ] Blue informational banner is visible
- [ ] Text explains sandbox mode
- [ ] Mentions GUPSHUP_SANDBOX
- [ ] States messages are not sent

#### Summary Statistics
- [ ] Total Notifications card shows count
- [ ] Simulated card (blue) shows count
- [ ] Sent card (green) shows 0
- [ ] Failed card (red) shows 0

#### Notifications Table
- [ ] Table headers are visible
- [ ] Your test notification appears in the table
- [ ] All 8 columns are displayed:
  - Created At
  - Recipient Name
  - Recipient Phone
  - Trigger Reason
  - Template
  - Status
  - Delivery Mode
  - Actions

### Step 5: Test Table Display

Verify the test notification row:

- [ ] Created At shows current date/time
- [ ] Recipient Name shows "John Doe"
- [ ] Recipient Phone shows "+919876543210"
- [ ] Trigger Reason shows "Payment Submitted"
- [ ] Template shows "payment_submission_received"
- [ ] Status badge shows "SIMULATED" (blue)
- [ ] Delivery Mode shows "GUPSHUP_SANDBOX" (amber)
- [ ] "View Message" button is present

### Step 6: Test Message Preview Modal

1. **Open Modal**
   - Click "View Message" button on test notification
   - Modal should open with overlay

2. **Verify Modal Content**
   - [ ] Header shows "WhatsApp Message Preview"
   - [ ] Close button (X) is present
   - [ ] Recipient Name displays correctly
   - [ ] Phone Number displays correctly
   - [ ] Trigger Reason is shown
   - [ ] Template name is shown
   - [ ] Status badge is visible
   - [ ] Delivery Mode badge is visible

3. **Verify Message Content**
   - [ ] Green WhatsApp-style background
   - [ ] White message bubble inside
   - [ ] Message text includes:
     - "Hello John Doe"
     - "₹5000.00" (or your test amount)
     - Your society/apartment name
     - "Our team will review it shortly"
     - "– FlatFund Pro"
   - [ ] Line breaks are preserved
   - [ ] Text is readable and formatted correctly

4. **Close Modal**
   - [ ] Test Close button - modal closes
   - [ ] Re-open modal
   - [ ] Test X button - modal closes
   - [ ] Re-open modal
   - [ ] Click outside modal - modal closes

### Step 7: Test Filters

1. **Open Filters Panel**
   - Click "Filters" button
   - Filters panel should expand

2. **Test Status Filter**
   - [ ] Default shows "All Statuses"
   - [ ] Select "SIMULATED" - test notification still visible
   - [ ] Select "SENT" - no notifications shown
   - [ ] Select "FAILED" - no notifications shown
   - [ ] Select "All Statuses" - test notification visible again

3. **Test Trigger Reason Filter**
   - [ ] Default shows "All Triggers"
   - [ ] Select "Payment Submitted" - test notification visible
   - [ ] Change to different trigger (if available) - notification may disappear
   - [ ] Select "All Triggers" - test notification visible again

4. **Test Date Range Filter**
   - [ ] Default shows "All Time"
   - [ ] Select "Today" - test notification should be visible
   - [ ] Select "Last 7 Days" - test notification should be visible
   - [ ] Select "Last 30 Days" - test notification should be visible
   - [ ] Select "All Time" - all notifications visible

5. **Test Clear Filters**
   - Apply multiple filters
   - Click "Clear All Filters"
   - [ ] All filters reset to default values
   - [ ] All notifications visible again

### Step 8: Test Responsive Design

1. **Desktop View (>1024px)**
   - [ ] Sidebar is visible
   - [ ] Table columns are not cramped
   - [ ] Filters display side by side
   - [ ] Statistics cards in 4-column grid

2. **Tablet View (768px - 1024px)**
   - [ ] Layout adapts smoothly
   - [ ] Table is scrollable if needed
   - [ ] Filters remain functional

3. **Mobile View (<768px)**
   - [ ] Sidebar collapses to hamburger menu
   - [ ] Table scrolls horizontally
   - [ ] Statistics cards stack vertically
   - [ ] Modal is full-width
   - [ ] Filters stack vertically

### Step 9: Test Data Isolation (Apartment Admin Only)

If you're an apartment admin (not super admin):

1. **Create test notification in different apartment**
   - Have super admin create a payment in different apartment
   - Or use SQL to create notification for different apartment

2. **Verify Isolation**
   - [ ] You should NOT see notifications from other apartments
   - [ ] Only notifications from your apartment are visible
   - [ ] Total count matches your apartment's notifications only

### Step 10: Test Super Admin View

If you have super admin access:

1. **Login as Super Admin**
   - Use super admin credentials
   - Navigate to WhatsApp Notifications screen

2. **Verify Full Visibility**
   - [ ] You can see notifications from ALL apartments
   - [ ] Total count includes all notifications system-wide
   - [ ] Filter works across all apartments

### Step 11: Performance Test

1. **Create Multiple Test Notifications**
   - Submit 10-20 test payments
   - Each should create a notification

2. **Verify Performance**
   - [ ] Page loads within 2-3 seconds
   - [ ] Table renders all notifications
   - [ ] Filters apply instantly
   - [ ] No lag when opening modals
   - [ ] Smooth scrolling

### Step 12: Verify Read-Only Behavior

1. **Attempt to Modify Data**
   - [ ] No edit buttons present
   - [ ] No delete buttons present
   - [ ] No inline editing capability
   - [ ] No bulk actions available

2. **Confirm Audit Trail Integrity**
   - [ ] All notifications are preserved
   - [ ] Timestamps are accurate
   - [ ] Data remains unchanged after viewing

## Expected Results Summary

### Visual Design
- Clean, professional interface
- Consistent with other admin screens
- Clear visual hierarchy
- Intuitive navigation

### Functionality
- All notifications display correctly
- Filters work as expected
- Modal opens and closes smoothly
- No console errors
- No broken images or icons

### Data Accuracy
- Recipient information is correct
- Message content is properly formatted
- Timestamps are accurate
- Status badges reflect correct state

### Performance
- Fast page load
- Responsive interactions
- No lag or stuttering
- Smooth animations

### Security
- Proper access control
- Data isolation by apartment
- No unauthorized access
- Read-only enforcement

## Common Issues and Solutions

### Issue: No notifications visible
**Solution:**
- Verify payment submissions exist with status "Received"
- Check occupant_type is "Owner" or "Tenant"
- Ensure contact_number field has valid phone number
- Check apartment_id matches admin's apartment

### Issue: Modal doesn't open
**Solution:**
- Check browser console for errors
- Verify JavaScript is enabled
- Try hard refresh (Ctrl+F5)
- Test in different browser

### Issue: Filters not working
**Solution:**
- Check if notifications exist matching filter criteria
- Try clearing filters and reapplying
- Refresh the page
- Check browser console for errors

### Issue: Table not displaying
**Solution:**
- Verify database connection
- Check RLS policies allow access
- Ensure admin has proper permissions
- Check network tab for failed API calls

### Issue: Phone numbers not showing
**Solution:**
- Verify contact_number field is populated
- Check flat_email_mappings table for mobile numbers
- Ensure trigger is properly configured
- Review database trigger function logs

## Test Completion Checklist

- [ ] All screen components render correctly
- [ ] Test notification appears in table
- [ ] Message preview modal works
- [ ] All three filters function properly
- [ ] Statistics cards show accurate counts
- [ ] Responsive design works on all screen sizes
- [ ] Data isolation works for apartment admins
- [ ] Super admin sees all notifications
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Read-only behavior confirmed
- [ ] Documentation reviewed

## Sign-Off

**Tested By:** ___________________
**Date:** ___________________
**Browser:** ___________________
**Screen Resolution:** ___________________
**Result:** PASS / FAIL
**Notes:** ___________________

---

## Next Steps After Testing

1. **If All Tests Pass:**
   - Screen is ready for use
   - Train other admins on how to use it
   - Monitor for any issues in production
   - Gather feedback from users

2. **If Issues Found:**
   - Document specific issues encountered
   - Include screenshots if possible
   - Report to development team
   - Re-test after fixes are applied

3. **Feedback Collection:**
   - Ask admins about usability
   - Identify missing features
   - Prioritize enhancement requests
   - Plan future improvements

## Support

For issues or questions:
- Check WHATSAPP_NOTIFICATIONS_PREVIEW_GUIDE.md
- Review database trigger logs
- Contact system administrator
- Submit bug report with details
