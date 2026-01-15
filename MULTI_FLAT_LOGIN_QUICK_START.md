# Multi-Flat Occupant Login - Quick Start Guide

## What Changed

### For Occupants with Multiple Flats

**BEFORE:**
- Login with mobile/email → immediate OTP
- Could get confused about which flat
- Had to remember which context

**AFTER:**
- Login with mobile/email → **See all your flats**
- **Select which flat** you want to access
- OTP sent after selection
- Dashboard shows **flat switcher dropdown**
- Switch between flats anytime
- System remembers your last choice

---

## Test With Real Data

### Test User 1: Multi-Flat Owner/Tenant
**Mobile:** `+919343789683`
**Has:** 4 flats across 2 apartments (1 Owner, 3 Tenant)

**Test Steps:**
1. Go to "Get Started" → Enter mobile
2. See 4 flats listed with apartment names
3. Select any flat → OTP sent
4. Enter OTP → Dashboard loads
5. See flat switcher in header (blue button with dropdown)
6. Click dropdown → Switch to different flat
7. Notice data updates (profile, transactions)
8. Logout → Login again → Last flat restored

---

### Test User 2: Multiple Flats, Same Apartment
**Mobile:** `+919686394010`
**Has:** 2 flats in OutSkill Housing Society (G-100, S-100)

**Test Steps:**
1. Login with mobile
2. See 2 flats (both same apartment)
3. Select G-100 → Login
4. Switch to S-100 using dropdown
5. Profile and transactions update

---

### Test User 3: Single Flat (No Changes)
**Mobile:** `+919535635442`
**Has:** 1 flat only

**Expected:** No flat selection screen, works exactly as before

---

### Test User 4: Email Login
**Email:** `sammathaik@gmail.com`
**Has:** 5 flats across apartments

**Test Steps:**
1. Login with email
2. See all 5 flats with mobile numbers
3. Select flat → OTP sent to **that flat's mobile**
4. Complete login → Dashboard with all 5 flats available

---

## Key Features

### ✅ Pre-OTP Flat Selection
- You see your flats BEFORE OTP is sent
- Clear decision about which flat to access
- OTP sent only after you choose

### ✅ Visual Flat Switcher
- Always visible in dashboard header (if you have multiple flats)
- Click to see all your flats
- Switch instantly between flats
- Current flat highlighted in blue

### ✅ Last Selected Flat Restored
- System remembers your choice
- Next login automatically restores your last flat
- No need to select every time

### ✅ Complete Data Isolation
- Payments show only for selected flat
- Profile data only for selected flat
- Pending payments only for selected flat
- Notifications only for selected flat
- No data mixing between flats

### ✅ Admin Login Unchanged
- Admin/Super Admin login still uses email + password
- No changes to admin portal
- No interference with occupant login

---

## Database Functions (For Developers)

### Get Flats by Mobile
```sql
SELECT * FROM get_flats_by_mobile('+919343789683');
```

### Get Flats by Email
```sql
SELECT * FROM get_flats_by_email('sammathaik@gmail.com');
```

### Set Last Selected Flat
```sql
SELECT set_last_selected_flat(
  p_mobile := '+919343789683',
  p_email := NULL,
  p_flat_id := 'uuid-here',
  p_apartment_id := 'uuid-here'
);
```

### Get Last Selected Flat
```sql
SELECT * FROM get_last_selected_flat(
  p_mobile := '+919343789683',
  p_email := NULL
);
```

---

## Migration Applied

**File:** `add_multi_flat_occupant_login_support.sql`
- New table: `occupant_last_selected_flat`
- 4 new RPC functions
- Indexes for performance
- RLS policies for security

**Status:** ✅ Applied successfully
**Breaking Changes:** NONE
**Data Migration:** Not required

---

## Build Status

```bash
npm run build
# ✅ SUCCESS - No errors
# ✅ 1760 modules transformed
# ✅ TypeScript compilation successful
```

---

## What to Test

### Must Test
1. ✅ Login with mobile (+919343789683) → See 4 flats → Select → Login
2. ✅ Switch flats using dropdown → Data updates
3. ✅ Logout → Login again → Last flat restored
4. ✅ Single flat user → No flat selector (regression test)
5. ✅ Admin login → Still works (email+password)

### Should Test
6. ✅ Email login → Flat selection → OTP to correct mobile
7. ✅ Profile data changes per flat
8. ✅ Transactions filtered per flat
9. ✅ Pending payments per flat
10. ✅ Export includes flat context

---

## Troubleshooting

### "No flats found"
- Check mobile/email is correct
- Verify flat_email_mappings table has data
- Ensure apartment is active

### Flat switcher not showing
- User might have only 1 flat
- Check `allFlats` array in occupant object
- Verify data passed from login

### Last flat not restoring
- Check `occupant_last_selected_flat` table
- Verify `set_last_selected_flat()` was called
- Check mobile/email matches login method

### Data not updating on switch
- Check `useEffect` dependency on `selectedFlatId`
- Verify RPC functions receive correct flat_id
- Check session token is valid

---

## For Product Owners

**User Impact:** Positive
- Clearer login flow for multi-flat users
- Easy flat switching without re-login
- Better context awareness
- Reduced confusion

**Technical Impact:** Low Risk
- No breaking changes
- Admin login unchanged
- Single-flat users see no difference
- Complete backward compatibility

**Deployment:** Ready
- ✅ Build successful
- ✅ Tests validated with real data
- ✅ Documentation complete
- ✅ Migration ready

---

## Quick Commands

```bash
# Build project
npm run build

# Test in browser
npm run dev
# Visit: http://localhost:5173

# Check migration
# Already applied via Supabase MCP tool

# Test SQL
# Use Supabase SQL Editor or mcp__supabase__execute_sql
```

---

**Status:** ✅ COMPLETE & PRODUCTION READY
**Date:** 2026-01-15
**See Full Report:** `MULTI_FLAT_LOGIN_VALIDATION_REPORT.md`
