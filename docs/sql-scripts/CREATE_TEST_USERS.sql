-- ============================================================================
-- CREATE TEST USERS FOR FLATFUND PRO
-- ============================================================================
-- This script creates test admin records for users you'll create in Supabase
--
-- IMPORTANT: You must create the auth users FIRST via Supabase Dashboard,
-- then update this script with their user IDs.
--
-- TEST CREDENTIALS:
-- =================
-- Super Admin:
--   Email: superadmin@flatfundpro.com
--   Password: SuperAdmin123!
--
-- Apartment Admins:
--   1. admin.sunrise@flatfundpro.com / Admin123!
--   2. admin.greenvalley@flatfundpro.com / Admin123!
--   3. admin.downtown@flatfundpro.com / Admin123!
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE AUTH USERS VIA SUPABASE DASHBOARD
-- ============================================================================
--
-- Go to: Authentication > Users > Add User
--
-- Create these 4 users:
--
-- 1. Super Admin:
--    Email: superadmin@flatfundpro.com
--    Password: SuperAdmin123!
--    Auto Confirm: ✅ YES
--
-- 2. Sunrise Heights Admin:
--    Email: admin.sunrise@flatfundpro.com
--    Password: Admin123!
--    Auto Confirm: ✅ YES
--
-- 3. Green Valley Admin:
--    Email: admin.greenvalley@flatfundpro.com
--    Password: Admin123!
--    Auto Confirm: ✅ YES
--
-- 4. Downtown Admin:
--    Email: admin.downtown@flatfundpro.com
--    Password: Admin123!
--    Auto Confirm: ✅ YES
--
-- After creating each user, copy their UUID (user ID).
-- ============================================================================

-- ============================================================================
-- STEP 2: UPDATE USER IDS BELOW AND RUN THIS SCRIPT
-- ============================================================================
-- Replace the placeholder UUIDs below with the actual user IDs from step 1

DO $$
DECLARE
  v_superadmin_user_id uuid := 'REPLACE_WITH_SUPERADMIN_UUID';
  v_sunrise_user_id uuid := 'REPLACE_WITH_SUNRISE_ADMIN_UUID';
  v_greenvalley_user_id uuid := 'REPLACE_WITH_GREENVALLEY_ADMIN_UUID';
  v_downtown_user_id uuid := 'REPLACE_WITH_DOWNTOWN_ADMIN_UUID';

  v_sunrise_apt_id uuid;
  v_greenvalley_apt_id uuid;
  v_downtown_apt_id uuid;
BEGIN
  -- Get apartment IDs
  SELECT id INTO v_sunrise_apt_id FROM apartments WHERE apartment_name = 'Sunrise Heights';
  SELECT id INTO v_greenvalley_apt_id FROM apartments WHERE apartment_name = 'Green Valley Apartments';
  SELECT id INTO v_downtown_apt_id FROM apartments WHERE apartment_name = 'Downtown Residences';

  -- Create Super Admin
  INSERT INTO super_admins (user_id, name, email, status)
  VALUES (
    v_superadmin_user_id,
    'System Super Administrator',
    'superadmin@flatfundpro.com',
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'active', email = EXCLUDED.email;

  RAISE NOTICE 'Super Admin created: superadmin@flatfundpro.com';

  -- Create Apartment Admin for Sunrise Heights
  INSERT INTO admins (user_id, apartment_id, admin_name, admin_email, phone, status)
  VALUES (
    v_sunrise_user_id,
    v_sunrise_apt_id,
    'Sunrise Heights Manager',
    'admin.sunrise@flatfundpro.com',
    '+1-555-0101',
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'active', admin_email = EXCLUDED.admin_email;

  RAISE NOTICE 'Apartment Admin created: admin.sunrise@flatfundpro.com -> Sunrise Heights';

  -- Create Apartment Admin for Green Valley
  INSERT INTO admins (user_id, apartment_id, admin_name, admin_email, phone, status)
  VALUES (
    v_greenvalley_user_id,
    v_greenvalley_apt_id,
    'Green Valley Manager',
    'admin.greenvalley@flatfundpro.com',
    '+1-555-0102',
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'active', admin_email = EXCLUDED.admin_email;

  RAISE NOTICE 'Apartment Admin created: admin.greenvalley@flatfundpro.com -> Green Valley Apartments';

  -- Create Apartment Admin for Downtown
  INSERT INTO admins (user_id, apartment_id, admin_name, admin_email, phone, status)
  VALUES (
    v_downtown_user_id,
    v_downtown_apt_id,
    'Downtown Manager',
    'admin.downtown@flatfundpro.com',
    '+1-555-0103',
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'active', admin_email = EXCLUDED.admin_email;

  RAISE NOTICE 'Apartment Admin created: admin.downtown@flatfundpro.com -> Downtown Residences';

  RAISE NOTICE '';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'SUCCESS! All test users have been created.';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now login with these credentials:';
  RAISE NOTICE '';
  RAISE NOTICE 'SUPER ADMIN PORTAL (http://localhost:5173/super-admin):';
  RAISE NOTICE '  Email: superadmin@flatfundpro.com';
  RAISE NOTICE '  Password: SuperAdmin123!';
  RAISE NOTICE '';
  RAISE NOTICE 'APARTMENT ADMIN PORTAL (http://localhost:5173/admin):';
  RAISE NOTICE '  Sunrise Heights:';
  RAISE NOTICE '    Email: admin.sunrise@flatfundpro.com';
  RAISE NOTICE '    Password: Admin123!';
  RAISE NOTICE '';
  RAISE NOTICE '  Green Valley Apartments:';
  RAISE NOTICE '    Email: admin.greenvalley@flatfundpro.com';
  RAISE NOTICE '    Password: Admin123!';
  RAISE NOTICE '';
  RAISE NOTICE '  Downtown Residences:';
  RAISE NOTICE '    Email: admin.downtown@flatfundpro.com';
  RAISE NOTICE '    Password: Admin123!';
  RAISE NOTICE '';
  RAISE NOTICE '==================================================================';
END $$;
