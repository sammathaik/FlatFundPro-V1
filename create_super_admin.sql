-- ============================================================================
-- CREATE SUPER ADMIN USER
-- ============================================================================
-- This script creates a test Super Admin user for the FlatFund Pro application.
--
-- CREDENTIALS:
-- Email: admin@flatfundpro.com
-- Password: Admin123!
--
-- IMPORTANT: Change the password after first login in production!
-- ============================================================================

-- Step 1: Create the auth user
-- Note: You need to run this in your Supabase SQL Editor or use the Supabase Dashboard

-- First, let's check if user already exists
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Try to find existing user
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@flatfundpro.com';

  IF v_user_id IS NULL THEN
    -- User doesn't exist, we need to create it
    -- Note: Password creation requires Supabase Auth API or Dashboard
    RAISE NOTICE 'User does not exist. Please create user via Supabase Dashboard or Auth API.';
    RAISE NOTICE 'Email: admin@flatfundpro.com';
    RAISE NOTICE 'After creating the user, get the user_id and run the second part of this script.';
  ELSE
    -- User exists, create super_admin record
    INSERT INTO super_admins (user_id, name, status)
    VALUES (v_user_id, 'Super Administrator', 'active')
    ON CONFLICT (user_id) DO UPDATE
    SET status = 'active', name = 'Super Administrator';

    RAISE NOTICE 'Super Admin created successfully!';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Email: admin@flatfundpro.com';
  END IF;
END $$;
