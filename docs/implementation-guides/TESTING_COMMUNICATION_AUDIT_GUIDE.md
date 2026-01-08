# Testing the Communication Audit System

## 🎯 Why You Don't See Data

The Communication Audit dashboard shows **only NEW communications** logged after the system was deployed. Historical communications sent before today are not included (except WhatsApp messages from `notification_outbox` which were migrated).

---

## ✅ 3 Ways to Test

### **Method 1: Quick SQL Test (Instant Results)** ⚡

**Best for:** Immediate verification that the system works

**Steps:**

1. **Open Supabase Dashboard** → SQL Editor

2. **Run this script:**
   ```sql
   -- Copy and paste the entire contents of:
   QUICK_TEST_COMMUNICATIONS.sql
   ```

3. **Go to Admin Dashboard** → Communication Audit tab

4. **You should see:**
   - 5 test communications
   - Different channels (Email, WhatsApp)
   - Different statuses (Delivered, Failed, Skipped)
   - Masked mobile numbers (******3210)

5. **Try the filters:**
   - Search: "TEST-101"
   - Filter by Channel: Email
   - Filter by Status: Delivered
   - Click to expand any communication

6. **Export to CSV** to test reporting

7. **Clean up when done:**
   ```sql
   DELETE FROM communication_logs
   WHERE triggered_by_event = 'test_insertion';
   ```

---

### **Method 2: Submit Real Payment** 🏠

**Best for:** End-to-end testing of the full flow

**Steps:**

1. **Open your payment form** (as a resident/occupant)
   - Use your QR code or public form URL

2. **Submit a payment**:
   - Fill in all details
   - Upload payment proof
   - Submit

3. **Check Communication Audit** (as admin):
   - Navigate to "Communication Audit" tab
   - You should see:
     - ✅ 1 Email: "Payment Received - Under Review"
     - Channel: EMAIL
     - Status: DELIVERED (or FAILED if email service has issues)
     - Recipient: The email you submitted with

4. **Approve the payment** (as admin/committee):
   - Go to Payment Submissions
   - Click "Approve" on the payment

5. **Return to Communication Audit**:
   - You should now see:
     - ✅ Email: Payment acknowledgment
     - ✅ Email: Payment approval
     - ✅ WhatsApp: Payment approval (if mobile opted in)

6. **Click to expand** each communication:
   - View full message preview
   - See delivery timestamps
   - Check mobile masking (******1234)

---

### **Method 3: Send Payment Reminders** 📧

**Best for:** Testing bulk communications

**Steps:**

1. **Create an active collection**:
   - Go to Fund Collection Setup
   - Create a collection with due date in future
   - Activate it

2. **Send reminders manually**:
   - Click "Send Reminders" for the collection
   - Select flats to remind

3. **Check Communication Audit**:
   - Should show all reminder emails
   - Filter by Type: "payment_reminder"
   - See which succeeded/failed

---

## 🔍 What to Look For

### **In the Dashboard:**

✅ **Statistics Cards (Top of page):**
- Total Communications count
- Email Delivered count
- WhatsApp Delivered count
- Average Delivery Time

✅ **Communication List:**
- Flat number visible
- Recipient name/email shown
- Channel icon (Email/WhatsApp)
- Status badge (color-coded)
- Date and time

✅ **Filters Working:**
- Search by flat number
- Filter by channel
- Filter by status
- Filter by type
- Date range selector

✅ **Expand Details:**
- Click any communication
- See full message preview
- View delivery timestamps
- Check error messages (if failed)
- Mobile numbers masked (******1234)

✅ **CSV Export:**
- Click "Export CSV"
- Opens in spreadsheet
- All columns present

---

## 🎨 What Each Status Means

| Status | Color | Meaning |
|--------|-------|---------|
| **DELIVERED** | 🟢 Green | Successfully sent and delivered |
| **SENT** | 🔵 Blue | Sent to provider, delivery pending |
| **FAILED** | 🔴 Red | Failed to send (error occurred) |
| **PENDING** | 🟡 Yellow | Queued, not sent yet |
| **SKIPPED** | ⚪ Gray | Intentionally skipped (e.g., opt-out) |

---

## 🔐 Test PII Protection

1. **Look at any communication with mobile**
2. **Verify masking:**
   - Should show: `******1234`
   - Should NOT show: `+919876543210`

3. **Test in different views:**
   - Communication Audit dashboard
   - Flat Communication History
   - CSV export

4. **All should be masked everywhere**

---

## 📊 Test Filters & Search

### **Search Test:**
```
1. Search: "101" → Should find Flat 101
2. Search: "john" → Should find John Doe
3. Search: "@example.com" → Should find emails
4. Search: "payment" → Should find matching previews
```

### **Filter Test:**
```
1. Channel: Email → Shows only emails
2. Channel: WhatsApp → Shows only WhatsApp
3. Status: Delivered → Shows only successful
4. Status: Failed → Shows only failed
5. Type: payment_acknowledgment → Shows only acks
6. Date: Last 7 days → Shows recent only
```

### **Combined Test:**
```
1. Channel: Email + Status: Delivered
   → Shows only successful emails

2. Search: "TEST-101" + Channel: Email
   → Shows only emails to TEST-101
```

---

## 🐛 Troubleshooting

### **Problem: No data shows up**

**Solution:**
1. Check you're logged in as admin
2. Verify apartment access (apartment admins see only their apartment)
3. Try the SQL quick test to insert sample data
4. Check date range filter (set to "All time")

### **Problem: Statistics show 0**

**Solution:**
1. No communications have been logged yet
2. Run the quick test SQL script
3. Or submit a test payment

### **Problem: Mobile numbers not masked**

**Solution:**
1. This is a bug - they should always be masked
2. Check the `mask_mobile_number()` function is working
3. Verify the view uses the masking function

### **Problem: CSV export is empty**

**Solution:**
1. Check filters - you might have filtered everything out
2. Reset all filters to "All"
3. Verify there's data in the table

---

## 🎯 Expected Results After Quick Test

After running `QUICK_TEST_COMMUNICATIONS.sql`, you should see:

### **Statistics:**
- Total Communications: **5**
- Email Delivered: **3**
- Email Failed: **1**
- WhatsApp Delivered: **1**
- WhatsApp Skipped: **1**

### **Communications List:**
1. **TEST-101** - Email - Payment Acknowledgment - ✅ DELIVERED
2. **TEST-102** - WhatsApp - Payment Approval - ✅ DELIVERED
3. **TEST-103** - Email - Payment Reminder - ❌ FAILED
4. **TEST-104** - WhatsApp - Payment Reminder - ⏭️ SKIPPED
5. **TEST-105** - Email - Payment Acknowledgment - ✅ DELIVERED

### **When You Expand Each:**
- Full message preview visible
- Mobile numbers masked (******3210, ******3211, etc.)
- Timestamps present
- Error message on TEST-103 (failed one)
- Template name shown

---

## 📝 Production Testing Checklist

Before going live, verify:

- ✅ Can submit payment → Email logged
- ✅ Can approve payment → Both email and WhatsApp logged
- ✅ Can send reminders → All logged
- ✅ Mobile numbers masked everywhere
- ✅ Filters work correctly
- ✅ Search works correctly
- ✅ CSV export works
- ✅ Statistics calculate correctly
- ✅ Errors shown for failed communications
- ✅ Payment communication timeline works
- ✅ Flat communication history works
- ✅ Access control works (apartment admins see only their data)

---

## 🚀 Next: Go Live!

Once testing is complete:

1. **Clean up test data:**
   ```sql
   DELETE FROM communication_logs
   WHERE triggered_by_event = 'test_insertion';
   ```

2. **Inform committee members:**
   - New Communication Audit feature available
   - Can track all resident communications
   - Can export for AGM reports

3. **Train admins:**
   - Show them the dashboard
   - Explain filters and search
   - Demonstrate dispute resolution
   - Show CSV export

4. **Monitor usage:**
   - Check statistics weekly
   - Identify delivery issues
   - Improve communication templates

---

## 💡 Tips

1. **Bookmark the Communication Audit page** for quick access
2. **Export monthly** for committee records
3. **Check failed communications** weekly to fix email addresses
4. **Use search** to quickly find specific flat communications
5. **Share statistics** at AGM to show governance excellence

---

## 🆘 Need Help?

If you encounter issues:

1. Check the implementation guide: `COMMUNICATION_AUDIT_SYSTEM_IMPLEMENTATION.md`
2. Verify database functions are deployed
3. Check edge functions are updated
4. Review RLS policies
5. Test with sample data first

---

**Happy Testing! 🎉**

The Communication Audit System is production-ready and waiting for your first real communication!
