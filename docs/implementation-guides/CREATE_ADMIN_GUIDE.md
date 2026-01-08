# How to Create Super Admin User

## Problem
You're seeing a blank page or login page when visiting `/admin` because no admin users exist yet.

## Solution: Create Super Admin via Supabase Dashboard

### Step 1: Create Auth User

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Navigate to your FlatFund Pro project

2. **Go to Authentication**
   - Click "Authentication" in the left sidebar
   - Click "Users" tab
   - Click "Add User" button (top right)

3. **Create the Super Admin User**
   - **Email:** `admin@flatfundpro.com` (or your preferred email)
   - **Password:** `Admin123!` (or your preferred password)
   - **Auto Confirm User:** ✅ Check this box (important!)
   - Click "Create User"

4. **Copy the User ID**
   - After creation, you'll see the user in the list
   - Click on the user to see details
   - **Copy the UUID** (it looks like: `a1b2c3d4-e5f6-7890-...`)

### Step 2: Make User a Super Admin

1. **Go to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

2. **Run This SQL** (replace `YOUR_USER_ID_HERE` with the UUID you copied):

```sql
INSERT INTO super_admins (user_id, name, status)
VALUES ('YOUR_USER_ID_HERE', 'Super Administrator', 'active');
```

3. **Click "Run"**

### Step 3: Test Login

1. **Open Your App**
   - Go to: `http://localhost:5173/admin`

2. **Login**
   - Email: `admin@flatfundpro.com`
   - Password: `Admin123!`

3. **You Should See:**
   - Super Admin Dashboard
   - Tabs: Overview, Apartments, Admins, All Payments

## Quick Alternative: Use This SQL Script

If you prefer, run this complete script in Supabase SQL Editor:

```sql
-- This assumes you already created the auth user in step 1 above
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user ID for admin@flatfundpro.com
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@flatfundpro.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Please create user admin@flatfundpro.com in Authentication first.';
  END IF;

  -- Create super admin record
  INSERT INTO super_admins (user_id, name, status)
  VALUES (v_user_id, 'Super Administrator', 'active')
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'active';

  RAISE NOTICE 'Super Admin created successfully! User ID: %', v_user_id;
END $$;
```

## Troubleshooting

### "Access Denied" Error
- Make sure the user is in `super_admins` table with `status = 'active'`
- Check SQL Editor: `SELECT * FROM super_admins;`

### Can't Login
- Verify email/password are correct
- Check if user is confirmed in Authentication > Users
- Make sure "Auto Confirm User" was checked

### Still Not Working?
Check browser console (F12) for any error messages and share them for further help.

## Security Note

**IMPORTANT:** After successfully logging in for the first time, change the password immediately in a production environment!
