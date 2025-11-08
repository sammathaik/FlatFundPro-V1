# Test Users Setup Guide

## Quick Summary

You need to create 4 test users to access all portals:

| User | Email | Password | Access |
|------|-------|----------|--------|
| Super Admin | superadmin@flatfundpro.com | SuperAdmin123! | System-wide `/super-admin` |
| Sunrise Admin | admin.sunrise@flatfundpro.com | Admin123! | Sunrise Heights `/admin` |
| Green Valley Admin | admin.greenvalley@flatfundpro.com | Admin123! | Green Valley `/admin` |
| Downtown Admin | admin.downtown@flatfundpro.com | Admin123! | Downtown Residences `/admin` |

---

## Step-by-Step Instructions

### Part 1: Create Auth Users in Supabase (5 minutes)

#### 1. Open Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Select your FlatFund Pro project
- Click **"Authentication"** in left sidebar
- Click **"Users"** tab

#### 2. Create Super Admin User

Click **"Add User"** button and enter:

```
Email: superadmin@flatfundpro.com
Password: SuperAdmin123!
Auto Confirm User: ✅ CHECK THIS BOX
```

Click **"Create User"**

**IMPORTANT:** After creation, click on the user in the list and **COPY THE USER ID** (UUID). It looks like:
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Save this UUID somewhere - you'll need it in Step 3.

#### 3. Create Sunrise Heights Admin

Click **"Add User"** again:

```
Email: admin.sunrise@flatfundpro.com
Password: Admin123!
Auto Confirm User: ✅ CHECK THIS BOX
```

Click **"Create User"** and **COPY THE USER ID**

#### 4. Create Green Valley Admin

Click **"Add User"** again:

```
Email: admin.greenvalley@flatfundpro.com
Password: Admin123!
Auto Confirm User: ✅ CHECK THIS BOX
```

Click **"Create User"** and **COPY THE USER ID**

#### 5. Create Downtown Admin

Click **"Add User"** again:

```
Email: admin.downtown@flatfundpro.com
Password: Admin123!
Auto Confirm User: ✅ CHECK THIS BOX
```

Click **"Create User"** and **COPY THE USER ID**

---

### Part 2: Link Users to Admin Tables (2 minutes)

#### 1. Open SQL Editor
- In Supabase Dashboard, click **"SQL Editor"** in left sidebar
- Click **"New Query"**

#### 2. Copy the SQL Script
- Open the file `CREATE_TEST_USERS.sql` in your project
- Copy all the SQL code

#### 3. Replace UUIDs
In the SQL script, find these lines:
```sql
v_superadmin_user_id uuid := 'REPLACE_WITH_SUPERADMIN_UUID';
v_sunrise_user_id uuid := 'REPLACE_WITH_SUNRISE_ADMIN_UUID';
v_greenvalley_user_id uuid := 'REPLACE_WITH_GREENVALLEY_ADMIN_UUID';
v_downtown_user_id uuid := 'REPLACE_WITH_DOWNTOWN_ADMIN_UUID';
```

Replace with your actual user IDs from Part 1:
```sql
v_superadmin_user_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
v_sunrise_user_id uuid := 'b2c3d4e5-f678-90ab-cdef-123456789abc';
v_greenvalley_user_id uuid := 'c3d4e5f6-7890-abcd-ef12-34567890abcd';
v_downtown_user_id uuid := 'd4e5f678-90ab-cdef-1234-567890abcdef';
```

#### 4. Run the Script
- Paste the modified SQL into Supabase SQL Editor
- Click **"Run"** or press `Ctrl/Cmd + Enter`
- You should see success messages in the Results panel

---

### Part 3: Test Login (2 minutes)

Now you can login to all portals!

#### Test Super Admin Portal

1. **Open:** `http://localhost:5173/super-admin`
2. **Click:** "Sign In as Super Admin"
3. **Login with:**
   - Email: `superadmin@flatfundpro.com`
   - Password: `SuperAdmin123!`
4. **You should see:**
   - Super Admin Dashboard
   - Dark theme with emerald accents
   - Tabs: Overview, Apartments, Admins, All Payments
   - All 3 apartments listed

#### Test Apartment Admin Portal - Sunrise Heights

1. **Open:** `http://localhost:5173/admin`
2. **Click:** "Sign In as Apartment Admin"
3. **Login with:**
   - Email: `admin.sunrise@flatfundpro.com`
   - Password: `Admin123!`
4. **You should see:**
   - Apartment Admin Dashboard
   - Amber/orange theme
   - Only Sunrise Heights data
   - Tabs: Overview, Buildings, Payments

#### Test Apartment Admin Portal - Green Valley

1. **Logout first** (click profile icon > Logout)
2. **Go back to:** `http://localhost:5173/admin`
3. **Login with:**
   - Email: `admin.greenvalley@flatfundpro.com`
   - Password: `Admin123!`
4. **You should see:**
   - Only Green Valley Apartments data
   - Different blocks/towers than Sunrise

#### Test Apartment Admin Portal - Downtown

1. **Logout first**
2. **Go back to:** `http://localhost:5173/admin`
3. **Login with:**
   - Email: `admin.downtown@flatfundpro.com`
   - Password: `Admin123!`
4. **You should see:**
   - Only Downtown Residences data

---

## Quick Reference Card

### Super Admin Access
```
URL:      http://localhost:5173/super-admin
Email:    superadmin@flatfundpro.com
Password: SuperAdmin123!
Access:   All apartments, all features
```

### Sunrise Heights Admin
```
URL:      http://localhost:5173/admin
Email:    admin.sunrise@flatfundpro.com
Password: Admin123!
Access:   Sunrise Heights only (3 blocks, 32 flats)
```

### Green Valley Admin
```
URL:      http://localhost:5173/admin
Email:    admin.greenvalley@flatfundpro.com
Password: Admin123!
Access:   Green Valley Apartments only (2 towers, 24 flats)
```

### Downtown Residences Admin
```
URL:      http://localhost:5173/admin
Email:    admin.downtown@flatfundpro.com
Password: Admin123!
Access:   Downtown Residences only (3 phases, 24 flats)
```

---

## Faster Method: Use This One-Click Script

If you want to speed this up, after creating the auth users, you can use this simplified SQL:

```sql
-- Get user IDs by email (after creating auth users)
WITH user_ids AS (
  SELECT
    id,
    email,
    CASE
      WHEN email = 'superadmin@flatfundpro.com' THEN 'super'
      WHEN email = 'admin.sunrise@flatfundpro.com' THEN 'sunrise'
      WHEN email = 'admin.greenvalley@flatfundpro.com' THEN 'greenvalley'
      WHEN email = 'admin.downtown@flatfundpro.com' THEN 'downtown'
    END as user_type
  FROM auth.users
  WHERE email IN (
    'superadmin@flatfundpro.com',
    'admin.sunrise@flatfundpro.com',
    'admin.greenvalley@flatfundpro.com',
    'admin.downtown@flatfundpro.com'
  )
)
-- Create super admin
INSERT INTO super_admins (user_id, name, email, status)
SELECT id, 'System Super Administrator', email, 'active'
FROM user_ids
WHERE user_type = 'super'
ON CONFLICT (user_id) DO UPDATE SET status = 'active';

-- Create apartment admins
INSERT INTO admins (user_id, apartment_id, admin_name, admin_email, phone, status)
SELECT
  u.id,
  a.id,
  CASE
    WHEN u.user_type = 'sunrise' THEN 'Sunrise Heights Manager'
    WHEN u.user_type = 'greenvalley' THEN 'Green Valley Manager'
    WHEN u.user_type = 'downtown' THEN 'Downtown Manager'
  END,
  u.email,
  CASE
    WHEN u.user_type = 'sunrise' THEN '+1-555-0101'
    WHEN u.user_type = 'greenvalley' THEN '+1-555-0102'
    WHEN u.user_type = 'downtown' THEN '+1-555-0103'
  END,
  'active'
FROM user_ids u
JOIN apartments a ON (
  (u.user_type = 'sunrise' AND a.apartment_name = 'Sunrise Heights') OR
  (u.user_type = 'greenvalley' AND a.apartment_name = 'Green Valley Apartments') OR
  (u.user_type = 'downtown' AND a.apartment_name = 'Downtown Residences')
)
WHERE u.user_type != 'super'
ON CONFLICT (user_id) DO UPDATE SET status = 'active';
```

This script automatically finds users by email and links them - no need to copy/paste UUIDs!

---

## Troubleshooting

### Error: "User not found"
- Make sure you created the auth users first in Authentication > Users
- Verify emails match exactly (case-sensitive)
- Check "Auto Confirm User" was checked

### Error: "Apartment not found"
- Run the sample data migration first
- Check: `SELECT * FROM apartments;` in SQL Editor

### Can't Login
- Verify user exists: `SELECT * FROM auth.users WHERE email = 'your.email@here.com';`
- Check admin record exists: `SELECT * FROM super_admins;` or `SELECT * FROM admins;`
- Make sure status = 'active'

### Wrong Data Showing
- Apartment admins should ONLY see their apartment's data
- If seeing all data, RLS policies might not be working
- Check: `SELECT * FROM admins WHERE user_id = auth.uid();` while logged in

---

## After Deployment

Once you deploy to production, you'll want to:

1. **Change these passwords** immediately
2. **Delete test users** if not needed
3. **Create real admin accounts** with secure passwords
4. **Use strong passwords** (12+ characters, mixed case, numbers, symbols)

These test credentials are for development/testing only!

---

## Security Note

**IMPORTANT:** These are test credentials for development only.

In production:
- Use strong, unique passwords for each user
- Don't share passwords
- Change passwords regularly
- Use password managers
- Enable 2FA if available

Never commit passwords to Git or share them publicly!
