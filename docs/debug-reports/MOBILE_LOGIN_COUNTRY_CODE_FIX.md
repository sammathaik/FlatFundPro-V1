# Mobile Login Country Code Issue - Complete Fix

## Issue Reported

When users try to login with mobile number from either:
1. **UniversalLoginModal** (Login button in header)
2. **Get Started → Mobile Number Login** (Public landing page)

They enter 10 digits (e.g., 9686394010) and get error "No account found with this mobile number" even though the account exists in the database.

**Note:** The MobileNumberInput component already has proper country code selector UI with +91 default and dropdown for other countries. The issue was in how the normalized mobile number was being used in the query logic.

## Root Cause Analysis

### Database Format
Mobile numbers in database are stored with country code:
```
+919686394010
```

### User Input Format
Users enter 10 digits without country code:
```
9686394010
```

### The Problem in Code

**File:** `src/components/UniversalLoginModal.tsx`

The discover flats function was querying with the WRONG format:

```javascript
// Line 111-131 (BEFORE)
const handleDiscoverFlats = async () => {
  const normalized = normalizeMobileNumber(mobileNumber);

  // normalized returns:
  // {
  //   countryCode: '+91',
  //   localNumber: '9686394010',
  //   fullNumber: '+919686394010'
  // }

  // WRONG: First try with raw input "9686394010"
  const result1 = await supabase.rpc('discover_flats_by_mobile', {
    mobile_number: mobileNumber  // ❌ "9686394010"
  });

  // WRONG: Fallback with local number "9686394010"
  if (result1.error || result1.data?.count === 0) {
    const result2 = await supabase.rpc('discover_flats_by_mobile', {
      mobile_number: normalized.localNumber  // ❌ "9686394010"
    });
  }
}
```

**Database Query:**
```sql
SELECT * FROM flat_email_mappings
WHERE mobile = '9686394010'  -- ❌ NO MATCH!
-- Database has: '+919686394010'
```

**Result:** No rows found → "No account found" error

### Additional Issues Found

The same problem existed in two other places:

1. **generateOtp function** (Line 163):
   ```javascript
   const mobileToUse = flat.mobile || normalized.localNumber;  // ❌ Wrong fallback
   ```

2. **handleVerifyOtp function** (Line 222):
   ```javascript
   const mobileToUse = selectedFlat?.mobile || normalized.localNumber;  // ❌ Wrong fallback
   ```

## The Complete Fix

### Fix 1: Discover Flats with Full Number

**File:** `src/components/UniversalLoginModal.tsx` (Line 121-125)

```javascript
// BEFORE (WRONG)
const result1 = await supabase.rpc('discover_flats_by_mobile', {
  mobile_number: mobileNumber  // ❌ "9686394010"
});

if (result1.error || result1.data?.count === 0) {
  const result2 = await supabase.rpc('discover_flats_by_mobile', {
    mobile_number: normalized.localNumber  // ❌ "9686394010"
  });
}

// AFTER (CORRECT)
const { data, error: rpcError } = await supabase.rpc('discover_flats_by_mobile', {
  mobile_number: normalized.fullNumber  // ✅ "+919686394010"
});
```

### Fix 2: Generate OTP with Full Number

**File:** `src/components/UniversalLoginModal.tsx` (Line 163)

```javascript
// BEFORE (WRONG)
const mobileToUse = flat.mobile || normalized.localNumber;  // ❌ Fallback to "9686394010"

// AFTER (CORRECT)
const mobileToUse = flat.mobile || normalized.fullNumber;  // ✅ Fallback to "+919686394010"
```

### Fix 3: Verify OTP with Full Number

**File:** `src/components/UniversalLoginModal.tsx` (Line 222)

```javascript
// BEFORE (WRONG)
const mobileToUse = selectedFlat?.mobile || normalized.localNumber;  // ❌ Fallback to "9686394010"

// AFTER (CORRECT)
const mobileToUse = selectedFlat?.mobile || normalized.fullNumber;  // ✅ Fallback to "+919686394010"
```

## How It Works Now

### User Experience

1. **User enters mobile number:**
   - Input: `9686394010` (10 digits)
   - MobileNumberInput component shows country selector (defaults to +91)

2. **MobileNumberInput normalizes:**
   ```javascript
   {
     countryCode: '+91',
     localNumber: '9686394010',
     fullNumber: '+919686394010'  // ✅ Full number with country code
   }
   ```

3. **Discover flats queries with full number:**
   ```sql
   SELECT * FROM flat_email_mappings
   WHERE mobile = '+919686394010'  -- ✅ MATCHES!
   ```

4. **Database returns 2 flats:**
   - S-100 (email: trisha.sam@flame.edu.in, mobile: +919686394010)
   - G-100 (email: sammathaik1@gmail.com, mobile: +919686394010)

5. **User selects flat and receives OTP**

6. **User enters OTP and logs in successfully**

### Technical Flow

```
User Input "9686394010"
   ↓
normalizeMobileNumber()
   ↓
{ countryCode: '+91', localNumber: '9686394010', fullNumber: '+919686394010' }
   ↓
discover_flats_by_mobile('+919686394010')  ✅
   ↓
Database: WHERE mobile = '+919686394010'  ✅
   ↓
Returns: 2 flats found
   ↓
generate_mobile_otp('+919686394010', flat_id)  ✅
   ↓
verify_mobile_otp_for_payment('+919686394010', otp)  ✅
   ↓
Login successful!
```

## Testing Verification

### SQL Test
```sql
SELECT public.discover_flats_by_mobile('+919686394010');
```

**Result:**
```json
{
  "success": true,
  "count": 2,
  "flats": [
    {
      "flat_id": "0eeadcb1-c3c0-4ca3-a520-5f43b693d942",
      "flat_number": "S-100",
      "email": "trisha.sam@flame.edu.in",
      "mobile": "+919686394010",
      "occupant_name": "Akhil",
      "occupant_type": "Owner",
      "apartment_name": "OutSkill Housing Society"
    },
    {
      "flat_id": "2084bd27-39ff-44d2-876c-4ce3970b0764",
      "flat_number": "G-100",
      "email": "sammathaik1@gmail.com",
      "mobile": "+919686394010",
      "occupant_name": "Jitesh",
      "occupant_type": "Owner",
      "apartment_name": "OutSkill Housing Society"
    }
  ]
}
```

✅ **Query works with full number format**

## Testing Instructions

### Test Case 1: Login via Header (UniversalLoginModal)

1. Go to landing page
2. Click **"Login"** button in header
3. Click "Login with Mobile"
4. Select country code: **+91** (India) - default
5. Enter mobile number: **9686394010** (10 digits)
6. Click "Continue"
7. **VERIFY:** Shows flat selection screen with 2 flats:
   - S-100 (OutSkill Housing Society - Topaz)
   - G-100 (OutSkill Housing Society - Topaz)
8. Select S-100
9. **VERIFY:** OTP sent message appears
10. Enter OTP
11. **VERIFY:** Login successful, redirects to dashboard

### Test Case 2: Login via Get Started Button (MobilePaymentFlow)

1. Go to landing page
2. Click **"Get Started"** button
3. Page scrolls to payment submission section
4. Click **"Mobile Number Login"** card (Recommended option)
5. **VERIFY:** Shows mobile input screen with:
   - Country code selector dropdown (defaults to +91 🇮🇳)
   - 10-digit mobile number input field
6. Enter mobile number: **9686394010**
7. Click "Continue"
8. **VERIFY:** Shows flat selection screen with 2 flats:
   - S-100 (OutSkill Housing Society - Topaz)
   - G-100 (OutSkill Housing Society - Topaz)
9. Select S-100
10. **VERIFY:** OTP sent message appears (development mode shows OTP on screen)
11. Enter OTP
12. **VERIFY:** Shows payment history and active collections
13. **VERIFY:** Can submit new payment

### Test Case 3: Login with Full Number Including Country Code

1. Go to login page
2. Click "Login with Mobile"
3. Enter mobile number: **+919686394010** (with country code)
4. **VERIFY:** Component auto-detects country code and separates:
   - Country: +91
   - Number: 9686394010
5. Click "Continue"
6. **VERIFY:** Shows flat selection (same as Test Case 1)

### Test Case 4: Different Country Code

1. Go to login page
2. Click "Login with Mobile"
3. Change country code to: **+1** (USA/Canada)
4. Enter mobile number: **5551234567**
5. Click "Continue"
6. **VERIFY:** Shows "No account found" (expected if no USA number exists)

### Test Case 5: Invalid Number

1. Go to login page
2. Click "Login with Mobile"
3. Enter mobile number: **12345** (less than 10 digits)
4. Click "Continue"
5. **VERIFY:** Shows validation error "Please enter a valid 10-digit mobile number"

## Files Modified

### 1. `src/components/UniversalLoginModal.tsx`

**Changes:**
- Line 123-125: Use `normalized.fullNumber` instead of raw `mobileNumber` or `normalized.localNumber`
- Line 163: Fix generateOtp fallback to use `normalized.fullNumber`
- Line 222: Fix handleVerifyOtp fallback to use `normalized.fullNumber`

### 2. `src/components/MobilePaymentFlow.tsx`

**Changes:**
- Line 140-142: Use `normalized.fullNumber` instead of raw `mobileNumber` or `normalized.localNumber`
- Line 192: Fix generateOtp fallback to use `normalized.fullNumber`
- Line 245: Fix handleVerifyOtp fallback to use `normalized.fullNumber`

## Components Already Working Correctly

### `src/components/MobileNumberInput.tsx`

This component was already correct:
- ✅ Shows country code selector
- ✅ Accepts 10-digit local number
- ✅ Outputs full number with country code via `formatMobileForStorage()`
- ✅ Returns: `${countryCode}${localNumber}` = "+919686394010"

### `src/lib/mobileNumberUtils.ts`

This utility was already correct:
- ✅ `normalizeMobileNumber()` - Properly parses and normalizes
- ✅ `formatMobileForStorage()` - Returns full number with country code
- ✅ `validateMobileNumber()` - Validates based on country

## Build Status

✅ Build successful
✅ No TypeScript errors
✅ No breaking changes
✅ Ready for testing

## Summary

**Root Cause:** Both login components (UniversalLoginModal and MobilePaymentFlow) were using local number "9686394010" instead of full number "+919686394010" when querying the database.

**Solution:** Always use `normalized.fullNumber` when making RPC calls to match the database format.

**Components Fixed:**
1. **UniversalLoginModal.tsx** - Login button in header
2. **MobilePaymentFlow.tsx** - Get Started → Mobile Number Login flow

**Result:** Mobile login now works correctly with 10-digit input from BOTH entry points, properly matches database records, and successfully logs users in.

## Related Fixes

This fix also ensures the multi-flat profile switching works correctly (see `MULTI_FLAT_REAL_ROOT_CAUSE_FIX.md`) because:
1. Sessions are created with correct mobile format
2. Profile queries use mobile to find flat-specific data
3. Both systems now use consistent mobile number format
