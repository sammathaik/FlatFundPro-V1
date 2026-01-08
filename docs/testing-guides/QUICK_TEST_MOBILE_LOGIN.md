# Quick Test: Mobile Login Fix

## Test Credentials
- Mobile: +919686394010
- Email: sammathaik@gmail.com

## Test Steps

### 1. Login Test ✓

**Steps:**
```
1. Open the application
2. Click "Login" button
3. Verify "Mobile Login" tab is SELECTED BY DEFAULT (not email)
4. Enter mobile number: 919686394010
5. Click "Continue" or "Find My Flats"
6. Wait for flat discovery
7. Select your flat (if multiple)
8. Click to generate OTP
9. Enter the 6-digit OTP (shown in dev mode)
10. Click "Verify"
```

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to Occupant Dashboard
- ✅ No console errors
- ✅ Session token is a valid UUID (check in sessionStorage)

---

### 2. Transaction History Test ✓

**Steps:**
```
1. After logging in, you land on "Dashboard" tab
2. Check the transaction history table
```

**Expected Result:**
- ✅ Transaction history table displays
- ✅ Shows payment records for the selected flat
- ✅ No "invalid UUID" errors in console
- ✅ Payments have correct dates, amounts, and status

**If You See:**
- "No transactions found" → Normal if no payments made yet
- Data displayed → Success!
- Error messages → Issue needs attention

---

### 3. Profile Page Test ✓

**Steps:**
```
1. Click "Profile" tab in the header
2. Wait for page to load
```

**Expected Result:**
- ✅ Profile information displays:
  - Name
  - Occupant Type (Owner/Tenant)
  - Apartment & Block
  - Flat Number
  - Email
  - Mobile Number
- ✅ "Edit Profile" button visible
- ✅ No console errors

---

### 4. Pending Payments Test ✓

**Steps:**
```
1. Still on "Profile" tab
2. Scroll down below profile section
```

**Expected Result:**
- ✅ "Pending Payments" section displays
- ✅ Shows either:
  - List of pending payments with "Pay Now" buttons, OR
  - "All Caught Up!" message if no pending payments
- ✅ Each pending payment shows:
  - Collection name
  - Due date
  - Amount due
  - Balance
  - Status badge
- ✅ No loading errors

---

### 5. Profile Edit Test ✓

**Steps:**
```
1. On Profile tab
2. Click "Edit Profile" button
3. Update your name or mobile number
4. Click "Save Changes"
```

**Expected Result:**
- ✅ Changes save successfully
- ✅ Success message displays
- ✅ Updated information persists after page refresh

---

### 6. Multi-Flat Test (If Applicable) ✓

**Steps:**
```
1. If you have multiple flats, look for flat selector cards
2. Click on a different flat card
3. Wait for data to refresh
```

**Expected Result:**
- ✅ Transaction history updates to show selected flat
- ✅ Profile information updates
- ✅ Pending payments update
- ✅ No errors during switching

---

### 7. Payment Submission Test ✓

**Steps:**
```
1. On Profile tab, find a pending payment
2. Click "Pay Now" button
3. Modal opens with pre-filled information
4. Upload a screenshot
5. Fill in payment details
6. Click "Submit Payment"
```

**Expected Result:**
- ✅ Modal opens smoothly
- ✅ Collection details pre-filled
- ✅ Can upload image
- ✅ Payment submits successfully
- ✅ Success animation displays
- ✅ Dashboard refreshes
- ✅ New payment appears in transaction history

---

## Console Checks (Developer)

Open browser console (F12) and verify:

### Session Token Check:
```javascript
// In Console tab:
JSON.parse(sessionStorage.getItem('occupant_session'))
```

**Expected:**
```javascript
{
  flat_id: "uuid-here",
  apartment_id: "uuid-here",
  mobile: "919686394010",
  email: "sammathaik@gmail.com",
  sessionToken: "valid-uuid-here",  // Should be a proper UUID
  ...
}
```

**sessionToken should look like:** `"550e8400-e29b-41d4-a716-446655440000"`
**NOT like:** `"mobile_1767431208289"` ❌

### Network Tab Check:
```
1. Open Network tab (F12)
2. Filter by "rpc"
3. Look for: get_payments_for_flat_with_session
4. Check Request payload
5. Verify session_token is a UUID
```

**Expected Request:**
```json
{
  "session_token": "550e8400-e29b-41d4-a716-446655440000",
  "flat_id": "another-uuid-here"
}
```

### Error Check:
```
Look for any errors containing:
- "invalid input syntax for type uuid"
- "mobile_" prefix in errors
- 400 Bad Request errors

If found → Issue still exists
If none → Fix successful! ✅
```

---

## Common Issues & Solutions

### Issue: "No flats found for this mobile number"
**Solution:**
- Check mobile number format (remove spaces, +91 prefix)
- Try with just 10 digits
- Verify mobile is registered in database

### Issue: OTP not working
**Solution:**
- In development mode, OTP is displayed on screen
- Copy exactly as shown
- Check if OTP expired (10 minute limit)

### Issue: Transaction history still not loading
**Solution:**
- Clear browser cache and sessionStorage
- Logout and login again
- Check console for specific error messages
- Verify database migration was applied

### Issue: Profile page shows "Loading..."
**Solution:**
- Check internet connection
- Verify Supabase connection
- Check console for API errors
- Ensure session token is valid

---

## Success Criteria ✅

All tests pass when:
- ✅ Login completes without errors
- ✅ Transaction history displays
- ✅ Profile page loads correctly
- ✅ Pending payments section appears
- ✅ No UUID-related console errors
- ✅ Session token is a valid UUID
- ✅ Profile edits save successfully
- ✅ Payment submission works

---

## If All Tests Pass

🎉 **Mobile login fix is working!**

You can now:
- Login with mobile number as default
- View transaction history
- Access profile and pending payments
- Submit payments via one-click
- Switch between multiple flats

---

## If Tests Fail

1. **Check Console:** Look for specific error messages
2. **Verify Migration:** Ensure database migration was applied
3. **Clear Cache:** Clear browser cache and sessionStorage
4. **Check Logs:** Review Supabase logs for backend errors
5. **Report Issue:** Provide console error messages for debugging

---

**Last Updated:** After mobile login session token fix
**Status:** Ready for testing ✅
