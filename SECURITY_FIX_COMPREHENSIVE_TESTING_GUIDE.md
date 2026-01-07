# Comprehensive Testing Guide: Security Fix Impact

## Executive Summary

The security fix removed anonymous access to `flat_email_mappings` table, which broke several critical user flows. This guide covers all affected functionality and how to test each one.

---

## What Was Broken & Fixed

### Root Cause
The security vulnerability fix removed all `anon` (anonymous user) access to the `flat_email_mappings` table via Row Level Security (RLS) policies. This was **correct and necessary** to prevent data leakage.

However, several components relied on anonymous access:
1. **Occupant Portal** - Uses custom session system (not Supabase Auth), appears as "anonymous"
2. **Public Payment Forms** - Accessible without login
3. **Mobile Payment Flow** - Accessible without login

### Solution Approach
Created secure RPC functions using `SECURITY DEFINER` that:
- Validate requests before granting access
- Expose only necessary data
- Prevent bulk data queries
- Maintain security while restoring functionality

---

## 🔴 CRITICAL: Must Test These Flows

### 1. Occupant Portal (Mobile: +919686394010)

#### Test Case 1.1: Profile Name Display
**What was broken**: Names not displaying in profile page
**Fixed by**: `get_occupant_profile_for_flat` RPC function

**Steps to test**:
1. Login with mobile: `+919686394010` using OTP
2. Navigate to Profile tab
3. **Expected**: Name field shows "Jitesh" for G-100, "Akhil" for S-100
4. **Expected**: Email and mobile number also display correctly
5. **Expected**: No empty fields

#### Test Case 1.2: Profile Editing
**What was broken**: Unable to update profile information
**Fixed by**: `update_occupant_profile` RPC function

**Steps to test**:
1. Login as occupant
2. Go to Profile tab
3. Click "Edit Profile"
4. Change name to "Test Name Updated"
5. Click "Save Changes"
6. **Expected**: Success message appears
7. Refresh page
8. **Expected**: Name persists as "Test Name Updated"
9. Change name back to original value

#### Test Case 1.3: WhatsApp Preference Toggle
**What was broken**: Unable to toggle WhatsApp notifications
**Fixed by**: `update_occupant_whatsapp_preference` RPC function

**Steps to test**:
1. Login as occupant
2. Find "WhatsApp Payment Reminders" section on dashboard
3. Note current toggle state (on/off)
4. Click toggle to change state
5. **Expected**: Toggle animates to new position
6. **Expected**: No error messages
7. Refresh page
8. **Expected**: Toggle state persists

#### Test Case 1.4: Multi-Flat Switching
**What was broken**: Profile data not loading when switching flats
**Fixed by**: Same `get_occupant_profile_for_flat` function

**Steps to test** (for +919686394010 who has 2 flats):
1. Login as occupant
2. Note current flat displayed (e.g., G-100 with name "Jitesh")
3. Click on S-100 flat in the flat selector
4. **Expected**: Dashboard loads data for S-100
5. Go to Profile tab
6. **Expected**: Name shows "Akhil" (not "Jitesh")
7. Switch back to G-100
8. **Expected**: Name reverts to "Jitesh"

---

### 2. Mobile Payment Flow (Public Access)

#### Test Case 2.1: Mobile Number Discovery
**What was broken**: Nothing - this uses `discover_flats_by_mobile` RPC which was already secure
**Status**: Should still work

**Steps to test**:
1. Go to public payment page
2. Click "Mobile Payment" or "Pay Without Login"
3. Enter mobile: `+919686394010`
4. Click "Continue"
5. **Expected**: Shows 2 flats (G-100 and S-100)
6. **Expected**: Can select either flat

#### Test Case 2.2: WhatsApp Opt-in Update
**What was broken**: Unable to update WhatsApp preference after payment
**Fixed by**: `update_mobile_payment_whatsapp_preference` RPC function

**Steps to test**:
1. Complete mobile payment flow until payment submission
2. Check/uncheck "Receive WhatsApp notifications" checkbox
3. Submit payment
4. **Expected**: Payment submits successfully
5. **Expected**: No errors about WhatsApp preference update
6. Login as admin
7. Go to Occupant Management
8. Check the flat's WhatsApp opt-in status
9. **Expected**: Matches what was selected during payment

---

### 3. Public Payment Forms (DynamicPaymentForm)

#### Test Case 3.1: Load Existing Contact Info
**What was broken**: Unable to load existing email/mobile for flat
**Fixed by**: `get_flat_contact_info` RPC function

**Steps to test**:
1. Go to public payment page (URL with `apartmentId` and `flatId`)
2. Page loads payment form
3. **Expected**: If flat has registered email, it may pre-fill some fields
4. **Expected**: No console errors about failed queries
5. **Expected**: Form loads successfully

#### Test Case 3.2: Mobile Number Mismatch Detection
**What was broken**: Unable to check if entered mobile differs from stored mobile
**Fixed by**: `get_flat_contact_info` RPC function

**Steps to test**:
1. Use payment form for a flat with stored mobile (e.g., G-100)
2. Enter a DIFFERENT mobile number than the stored one
3. **Expected**: Modal appears asking about mobile number mismatch
4. **Expected**: Options: "Use one-time", "Update permanently", "Cancel"
5. Select "Use one-time"
6. **Expected**: Payment proceeds

#### Test Case 3.3: Contact Info Update - Permanent
**What was broken**: Unable to update mobile/name/WhatsApp preferences
**Fixed by**: `update_flat_contact_info` RPC function

**Steps to test**:
1. Use payment form for a flat
2. Enter name: "Test Contact Name"
3. Enter mobile: "+919999888877"
4. Check "Receive WhatsApp notifications"
5. If mismatch modal appears, choose "Update permanently"
6. Submit payment
7. **Expected**: Payment submits successfully
8. Login as admin
9. Check Occupant Management for that flat
10. **Expected**: Name, mobile, and WhatsApp opt-in all updated

#### Test Case 3.4: Contact Info Update - One-Time
**What was broken**: Same as above
**Fixed by**: Same function

**Steps to test**:
1. Use payment form for flat with stored mobile
2. Enter DIFFERENT mobile number
3. Mismatch modal appears
4. Choose "Use one-time"
5. Submit payment
6. **Expected**: Payment succeeds
7. Check Occupant Management as admin
8. **Expected**: Stored mobile UNCHANGED (not updated to new mobile)
9. **Expected**: WhatsApp opt-in preference IS updated

#### Test Case 3.5: WhatsApp Opt-in Without Mobile
**What was broken**: Unable to update WhatsApp preference alone
**Fixed by**: `update_flat_contact_info` function

**Steps to test**:
1. Use payment form
2. Do NOT enter mobile number
3. Check "Receive WhatsApp notifications"
4. Submit payment
5. **Expected**: Payment submits successfully
6. **Expected**: No errors about missing mobile

---

### 4. Public Payment Forms (EnhancedPaymentForm)

**Note**: Same test cases as DynamicPaymentForm above (3.1 through 3.5)
EnhancedPaymentForm uses the same RPC functions and has identical logic.

**Quick test**:
1. Access payment form via QR code or direct link
2. Verify mobile mismatch detection works
3. Verify WhatsApp opt-in updates work
4. Verify form submission succeeds

---

## ✅ Should Still Work (Admin Flows)

These use authenticated access and should NOT have been affected:

### 5. Admin Components

#### Test Case 5.1: Occupant Management (CRUD)
**Should work**: Admins are authenticated users

**Quick test**:
1. Login as admin
2. Go to Occupant Management
3. **Expected**: List of occupants loads
4. Click "Add Occupant"
5. **Expected**: Can create new occupant
6. Click "Edit" on an occupant
7. **Expected**: Can update occupant details
8. **Expected**: Can delete occupants

#### Test Case 5.2: Payment Review Panel
**Should work**: Admins are authenticated

**Quick test**:
1. Login as admin
2. Go to Payment Management
3. Click on a payment to review
4. **Expected**: Can see occupant contact info
5. **Expected**: Can approve/reject payment
6. **Expected**: WhatsApp notification options work if mobile present

#### Test Case 5.3: Analytics & Reports
**Should work**: Admins are authenticated

**Quick test**:
1. Login as admin
2. Navigate to Analytics/Reports
3. **Expected**: All data loads correctly
4. **Expected**: No errors about flat_email_mappings access

#### Test Case 5.4: Subscriber List
**Should work**: Admins are authenticated

**Quick test**:
1. Login as admin
2. Go to Communication > Subscriber List
3. **Expected**: List of occupants with WhatsApp opt-in loads
4. **Expected**: Can view contact details

---

## 🔧 Edge Functions

### 6. Edge Functions (Should Work)

All edge functions use service role client (full access), so they should NOT be affected.

#### Test Case 6.1: WhatsApp Notifications
**Should work**: Uses service role

**Quick test**:
1. Submit a payment that should trigger WhatsApp notification
2. **Expected**: Notification is queued/sent
3. Check Communication Audit Dashboard
4. **Expected**: Entry appears with delivery status

#### Test Case 6.2: Payment Acknowledgment
**Should work**: Uses service role

**Quick test**:
1. Admin approves a payment
2. **Expected**: Acknowledgment email sent
3. Check Communication Audit
4. **Expected**: Email entry appears

#### Test Case 6.3: Payment Reminders
**Should work**: Uses service role

**Quick test**:
1. Have upcoming payment due dates
2. **Expected**: Reminder function runs successfully
3. **Expected**: Reminders sent to occupants

---

## 📊 Database Verification

### Test Case 7.1: Verify RLS Policies

Run this SQL to confirm policies are correct:

```sql
SELECT
    policyname,
    roles,
    cmd,
    qual IS NOT NULL as has_using,
    with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'flat_email_mappings'
ORDER BY cmd, policyname;
```

**Expected results**:
- "Admins can manage mappings" - ALL operations for authenticated
- "Occupants can view their mappings" - SELECT for authenticated
- "Super admins can view all occupants" - SELECT for authenticated
- **NO policies for anon role**

### Test Case 7.2: Verify RPC Functions Exist

Run this SQL to confirm all new functions are deployed:

```sql
SELECT
    proname,
    pg_get_function_arguments(oid) as args,
    proacl
FROM pg_proc
WHERE proname IN (
    'get_occupant_profile_for_flat',
    'update_occupant_profile',
    'update_occupant_whatsapp_preference',
    'update_mobile_payment_whatsapp_preference',
    'get_flat_contact_info',
    'update_flat_contact_info'
)
ORDER BY proname;
```

**Expected**: All 6 functions present with correct signatures

### Test Case 7.3: Test Anonymous Access Block

Run this test to confirm anonymous users CANNOT access flat_email_mappings directly:

```sql
-- This should return 0 rows (blocked by RLS)
SET ROLE anon;
SELECT * FROM flat_email_mappings LIMIT 1;
RESET ROLE;
```

**Expected**: Permission denied or 0 rows (RLS blocking access)

---

## 🎯 Priority Test Matrix

| Test Case | Priority | User Type | Expected Duration |
|-----------|----------|-----------|-------------------|
| Occupant Profile Display | 🔴 CRITICAL | Occupant | 2 min |
| Occupant Profile Editing | 🔴 CRITICAL | Occupant | 3 min |
| Mobile Payment WhatsApp Update | 🔴 CRITICAL | Anonymous | 5 min |
| Public Form Mobile Mismatch | 🔴 CRITICAL | Anonymous | 5 min |
| Public Form Contact Update | 🔴 CRITICAL | Anonymous | 5 min |
| Admin Occupant Management | 🟡 HIGH | Admin | 3 min |
| Admin Payment Review | 🟡 HIGH | Admin | 3 min |
| WhatsApp Notifications | 🟡 HIGH | System | 5 min |
| Multi-Flat Switching | 🟢 MEDIUM | Occupant | 3 min |
| Analytics Loading | 🟢 MEDIUM | Admin | 2 min |

---

## 🔍 Regression Testing Checklist

Use this checklist to verify nothing else broke:

### Authentication Flows
- [ ] Occupant mobile OTP login works
- [ ] Admin email/password login works
- [ ] Super admin login works
- [ ] Session expiration works correctly

### Payment Submission
- [ ] Mobile payment flow works end-to-end
- [ ] Public form payment submission works
- [ ] QR code payment works
- [ ] Duplicate payment detection works

### Data Display
- [ ] Payment history loads for occupants
- [ ] Payment lists load for admins
- [ ] Dashboard statistics calculate correctly
- [ ] Reports generate without errors

### Notifications
- [ ] WhatsApp notifications send
- [ ] Email notifications send
- [ ] In-app notifications appear
- [ ] Notification preferences save

---

## 🐛 Known Issues & Limitations

### None Currently Identified

All identified issues have been fixed with secure RPC functions.

---

## 📝 Testing Notes

### For QA Team

1. **Test with real mobile numbers**: Some flows require actual OTP verification
2. **Test both mobile and desktop**: Mobile payment flow especially important
3. **Test with different user roles**: Occupant, Admin, Super Admin
4. **Test multi-flat scenarios**: Use mobile +919686394010 (has 2 flats)
5. **Check browser console**: No JavaScript errors should appear
6. **Check database audit logs**: Verify all operations are logged

### For Developers

1. **All fixes use RPC functions**: No direct table access from frontend for anonymous users
2. **Session validation**: Occupant portal uses UUID session tokens
3. **Security maintained**: All RPC functions validate inputs and scope access
4. **Build successful**: TypeScript compilation passes with no errors
5. **No breaking changes**: Admin flows unchanged, only anonymous flows fixed

---

## 📋 Summary of Changes

### Database (Migrations)
1. `fix_occupant_profile_data_access.sql` - Initial attempt (had errors)
2. `add_occupant_profile_update_functions.sql` - Initial attempt (had errors)
3. `fix_occupant_rpc_functions_correct_schema.sql` - ✅ Fixed occupant profile functions
4. `add_mobile_payment_whatsapp_update_function.sql` - ✅ Mobile payment WhatsApp update
5. `add_public_payment_form_helper_functions.sql` - ✅ Public form access functions

### Frontend Components
1. `OccupantDashboard.tsx` - Uses `get_occupant_profile_for_flat` and `update_occupant_whatsapp_preference`
2. `OccupantProfile.tsx` - Uses `update_occupant_profile`
3. `MobilePaymentFlow.tsx` - Uses `update_mobile_payment_whatsapp_preference`
4. `DynamicPaymentForm.tsx` - Uses `get_flat_contact_info` and `update_flat_contact_info`
5. `EnhancedPaymentForm.tsx` - Uses `get_flat_contact_info` and `update_flat_contact_info`

### RPC Functions Created
| Function Name | Purpose | Access Level |
|--------------|---------|--------------|
| `get_occupant_profile_for_flat` | Fetch occupant profile data with session validation | Session-based |
| `update_occupant_profile` | Update occupant profile (email, name, mobile) | Session-based |
| `update_occupant_whatsapp_preference` | Toggle WhatsApp notifications for occupant | Session-based |
| `update_mobile_payment_whatsapp_preference` | Update WhatsApp opt-in from mobile payment flow | Apartment+Flat scoped |
| `get_flat_contact_info` | Fetch contact info for public payment forms | Apartment+Flat scoped |
| `update_flat_contact_info` | Update contact info from public payment forms | Apartment+Flat scoped |

---

## ✅ Sign-Off

### Tested By: _________________  Date: _________

### Approved By: ________________  Date: _________

### Deployed By: ________________  Date: _________

---

## 🆘 Troubleshooting

If tests fail, check:

1. **RPC functions deployed?** Run Test Case 7.2
2. **Session token valid?** Occupant sessions expire after 24 hours
3. **Correct IDs used?** apartment_id and flat_id must match
4. **Console errors?** Check browser developer console
5. **Database logs?** Check Supabase dashboard for errors

---

## 📞 Support

If you encounter issues not covered in this guide:
1. Check browser console for error messages
2. Check Supabase logs for RPC function errors
3. Verify the flat_email_mappings record exists for the test flat
4. Ensure occupant session hasn't expired
