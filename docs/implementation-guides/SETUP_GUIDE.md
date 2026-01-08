# FlatFund Pro - Setup Guide

## Initial Setup Steps

### 1. Create Super Admin Account

Since authentication is required for admin access, you need to create the first Super Admin account:

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to Authentication → Users
3. Click "Add User"
4. Enter:
   - Email: `sammathaik@gmail.com` (or your preferred email)
   - Password: Create a secure password
5. Click "Create User"
6. Copy the User ID from the created user

**Option B: Using SQL**
```sql
-- This will be done via the Supabase Auth UI
```

### 2. Link Super Admin to Database

After creating the auth user, add the Super Admin record:

```sql
-- Replace 'YOUR_USER_ID' with the actual user ID from step 1
-- Replace 'YOUR_EMAIL' with the email you used

INSERT INTO super_admins (user_id, name, email, status)
VALUES (
  'YOUR_USER_ID',
  'Sammatha I.K.',
  'YOUR_EMAIL',
  'active'
);
```

### 3. Verify Sample Data

The system already includes sample data:
- 4 apartments (Green Meadows, Lakeview Residences, Sunshine Heights, Urban Oasis Apartments)
- 8 buildings/blocks/phases
- 18 flat numbers

### 4. Create Your First Apartment Admin

1. Login as Super Admin at `/admin`
2. Go to "Admins" tab
3. Click "Add Admin"
4. Fill in details:
   ```
   Name: Test Admin
   Email: admin@greeneadows.com
   Phone: +91 9876543210
   Apartment: Green Meadows
   Password: testpass123
   Status: Active
   ```
5. Click "Create"

### 5. Test the System

**Test Super Admin Access:**
1. Navigate to `/admin`
2. Login with Super Admin credentials
3. Verify you can access all tabs

**Test Apartment Admin Access:**
1. Sign out from Super Admin
2. Login with the admin credentials you created
3. Verify you only see your apartment's data

**Test Public Portal:**
1. Navigate to `/` (home page)
2. Try submitting a payment proof
3. Select apartment, building, and flat
4. Upload a test screenshot
5. Submit and verify success message

### 6. Configure Your Apartments

As Super Admin:
1. **Add Your Real Apartments:**
   - Go to "Apartments" tab
   - Add your actual apartment/society names
   - Set status to "active"

2. **Assign Admins:**
   - Go to "Admins" tab
   - Create admin accounts for each apartment
   - Provide login credentials to apartment admins

As Apartment Admin:
1. **Configure Buildings:**
   - Login to your admin portal
   - Go to "Buildings & Flats" tab
   - Add all buildings/blocks/phases for your apartment

2. **Add Flat Numbers:**
   - Select a building
   - Add all flat numbers for that building
   - Repeat for all buildings

3. **Share Public Portal:**
   - Share the main URL with residents
   - They can submit payment proofs without login

## Quick Test Checklist

- [ ] Super Admin can login
- [ ] Super Admin can create apartments
- [ ] Super Admin can create admins
- [ ] Super Admin can view all payments
- [ ] Apartment Admin can login
- [ ] Apartment Admin can add buildings
- [ ] Apartment Admin can add flats
- [ ] Public form loads apartments dynamically
- [ ] Public form loads buildings dynamically
- [ ] Public form loads flats dynamically
- [ ] Payment submission works
- [ ] Admin can view submissions
- [ ] Admin can update payment status
- [ ] CSV exports work

## Default Sample Data

### Apartments
1. Green Meadows
   - Block A (Flats: 101, 102, 103)
   - Block B (Flats: 201, 202, 203)

2. Lakeview Residences
   - North Tower (Flats: 11A, 11B)
   - South Tower (Flats: 21A, 21B)

3. Sunshine Heights
   - Phase 1 (Flats: F1, F2)
   - Phase 2 (Flats: G1, G2)

4. Urban Oasis Apartments
   - Orchid Wing (Flats: 301, 302)
   - Maple Wing (Flats: 401, 402)

## Environment Variables

Ensure these are set in your `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Security Checklist

- [ ] Super Admin password is strong (12+ characters)
- [ ] Each Apartment Admin has unique credentials
- [ ] RLS policies are enabled (automatically handled)
- [ ] File upload size limit is enforced (4MB)
- [ ] Audit logging is working

## Common Issues

### "Missing Supabase environment variables"
- Check your `.env` file exists
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart development server after changes

### "Cannot create admin - unique constraint violation"
- Each apartment can only have ONE admin
- Check if apartment already has an admin assigned
- Email must be unique across all admins

### "No apartments found"
- Verify apartments exist in database
- Check apartment status is "active"
- Review RLS policies in Supabase

### "Cannot login"
- Verify user exists in Supabase Auth
- Check corresponding record exists in super_admins or admins table
- Ensure status is "active"

## Next Steps

1. **Customize Branding:** Update logo and colors to match your organization
2. **Email Notifications:** Set up email templates for status updates
3. **Backup Strategy:** Set up regular CSV exports and database backups
4. **User Training:** Share ADMIN_GUIDE.md with your admin users

## Support

For questions or issues:
- Review the ADMIN_GUIDE.md for detailed feature documentation
- Check Supabase dashboard for database/auth issues
- Review audit_logs table for system activity

---

**Ready to Go Live?**
1. Remove/deactivate sample data
2. Add your real apartments and admins
3. Configure all buildings and flats
4. Share the public portal URL with residents
5. Monitor submissions in admin dashboards
