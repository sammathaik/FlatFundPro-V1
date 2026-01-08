# 🔑 Test Credentials - Quick Reference

## All Login Credentials

Copy-paste ready for testing!

---

## 🛡️ Super Admin

**Portal:** http://localhost:5173/super-admin

```
Email:    superadmin@flatfundpro.com
Password: SuperAdmin123!
```

**Access:**
- All apartments system-wide
- Manage apartments and admins
- View all payments (read-only)
- System analytics and exports

**Features:**
- Create/edit/delete apartments
- Assign apartment administrators
- View payment submissions across all apartments
- Export all data to CSV

---

## 🏢 Apartment Admins

All apartment admins use the same portal: http://localhost:5173/admin

### Sunrise Heights Manager

```
Email:    admin.sunrise@flatfundpro.com
Password: Admin123!
```

**Manages:**
- Sunrise Heights apartment only
- 3 Blocks (A, B, C)
- 32 Flats total

**Can Access:**
- Building/block management
- Payment submissions for Sunrise Heights
- Flat number management
- Export apartment data

---

### Green Valley Manager

```
Email:    admin.greenvalley@flatfundpro.com
Password: Admin123!
```

**Manages:**
- Green Valley Apartments only
- 2 Towers (North, South)
- 24 Flats total

**Can Access:**
- Building/tower management
- Payment submissions for Green Valley
- Flat number management
- Export apartment data

---

### Downtown Residences Manager

```
Email:    admin.downtown@flatfundpro.com
Password: Admin123!
```

**Manages:**
- Downtown Residences only
- 3 Phases (1, 2, 3)
- 24 Flats total

**Can Access:**
- Phase management
- Payment submissions for Downtown
- Flat number management
- Export apartment data

---

## 📋 Quick Copy-Paste

### Super Admin
```
superadmin@flatfundpro.com
SuperAdmin123!
```

### Sunrise Heights Admin
```
admin.sunrise@flatfundpro.com
Admin123!
```

### Green Valley Admin
```
admin.greenvalley@flatfundpro.com
Admin123!
```

### Downtown Admin
```
admin.downtown@flatfundpro.com
Admin123!
```

---

## 🧪 Testing Scenarios

### Test 1: Super Admin Can See Everything
1. Login as Super Admin
2. Go to "Apartments" tab → should see all 3 apartments
3. Go to "Admins" tab → should see all 3 apartment admins
4. Go to "All Payments" tab → can view payments from all apartments

### Test 2: Apartment Admin Sees Only Their Data
1. Login as Sunrise Heights admin
2. Dashboard should show ONLY Sunrise Heights data
3. Cannot see Green Valley or Downtown data
4. Can manage buildings and payments for Sunrise only

### Test 3: Data Isolation
1. Login as Sunrise admin
2. Add a new flat (e.g., "Block A - 401")
3. Logout
4. Login as Green Valley admin
5. The new flat should NOT appear (data is isolated)

### Test 4: Portal Separation
1. Login as Super Admin at `/super-admin`
2. Try to access `/admin` → should redirect to `/super-admin`
3. Logout
4. Login as Apartment Admin at `/admin`
5. Try to access `/super-admin` → should see "Access Denied"

---

## 🚨 Security Notes

### These are TEST CREDENTIALS only!

**For Development:**
- ✅ Use these credentials
- ✅ Test all features
- ✅ Share with your team for testing

**For Production:**
- ❌ DON'T use these credentials
- ✅ Create new users with strong passwords
- ✅ Change all default passwords
- ✅ Use unique passwords per user
- ✅ Enable 2FA if available

### Password Requirements for Production:
- Minimum 12 characters
- Mix of uppercase and lowercase
- Include numbers and special characters
- Use password manager
- Never reuse passwords

---

## 📊 Sample Data Summary

### Apartments
1. **Sunrise Heights** - 3 Blocks, 32 Flats
2. **Green Valley Apartments** - 2 Towers, 24 Flats
3. **Downtown Residences** - 3 Phases, 24 Flats

**Total:** 3 Apartments, 8 Buildings/Blocks, 80 Flats

All ready for testing!

---

## 🔄 Reset Instructions

If you need to start over:

### Reset Admins
```sql
-- Remove all admins (keeps apartments and flats)
DELETE FROM super_admins;
DELETE FROM admins;
```

### Reset Auth Users
1. Go to Supabase Dashboard > Authentication > Users
2. Delete each test user manually
3. Re-run setup from `TEST_USERS_GUIDE.md`

### Reset Everything
```sql
-- WARNING: This deletes ALL data including apartments!
DELETE FROM payment_submissions;
DELETE FROM admins;
DELETE FROM super_admins;
DELETE FROM flat_numbers;
DELETE FROM buildings_blocks_phases;
DELETE FROM apartments;
```

Then re-run migrations to restore sample data.

---

## 📞 Need Help?

If credentials aren't working:

1. **Check auth users exist:**
   ```sql
   SELECT id, email FROM auth.users;
   ```

2. **Check admin records exist:**
   ```sql
   SELECT * FROM super_admins;
   SELECT * FROM admins;
   ```

3. **Verify status is active:**
   ```sql
   SELECT user_id, email, status FROM super_admins;
   SELECT user_id, admin_email, status FROM admins;
   ```

4. **See full guide:** `TEST_USERS_GUIDE.md`

---

## ✅ Checklist

After setup, you should be able to:

- [ ] Login to Super Admin portal
- [ ] See all 3 apartments in Super Admin view
- [ ] Login to Apartment Admin portal (Sunrise)
- [ ] See only Sunrise Heights data
- [ ] Login to Apartment Admin portal (Green Valley)
- [ ] See only Green Valley data
- [ ] Login to Apartment Admin portal (Downtown)
- [ ] See only Downtown data
- [ ] Logout and switch between accounts
- [ ] Access public portal without login

If all checked, your test environment is ready! 🎉
