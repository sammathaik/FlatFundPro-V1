# FlatFund Pro - Admin Guide

## Overview

FlatFund Pro is a comprehensive apartment maintenance payment portal with THREE separate portals and role-based access control.

## Three Separate Portals

### 1. Public Portal (`/`)
- **Theme:** Light amber/white design
- **Access:** Anyone (no authentication required)
- **Purpose:** For residents and owners to submit maintenance payments
- **Features:**
  - View apartment information
  - Submit payment screenshots with details
  - Select apartment, building, and flat number from dropdowns

### 2. Apartment Admin Portal (`/admin`)
- **Theme:** Amber/orange design
- **Access:** Apartment administrators only
- **Purpose:** Manage a specific apartment's data
- **Features:**
  - View apartment-specific dashboard
  - Manage buildings/blocks and flat numbers
  - Review and approve payment submissions
  - Export apartment data

### 3. Super Admin Portal (`/super-admin`)
- **Theme:** Dark slate with emerald green accents
- **Access:** Super administrators only
- **Purpose:** System-wide management
- **Features:**
  - Manage all apartments
  - Assign apartment administrators
  - View all payment submissions (read-only)
  - Export system-wide data

## User Roles

1. **Super Admin** - Full system access
   - Manage all apartments
   - Manage all apartment admins
   - View all payment submissions (read-only)
   - Export data across all apartments
   - Access via `/super-admin` portal

2. **Apartment Admin** - Per-apartment access
   - Manage buildings/blocks/phases and flat numbers for their apartment
   - Manage payment submissions for their apartment
   - Update payment status (Received → Reviewed → Approved)
   - Export payment data for their apartment
   - One admin per apartment (enforced by database)
   - Access via `/admin` portal

3. **Public Users** - No authentication required
   - Submit payment proofs
   - Dynamic form based on apartment configuration
   - Access via `/` (public portal)

## Accessing the Portals

### Public Portal Access
1. Navigate to `http://localhost:5173/`
2. View welcome page and features
3. Scroll down to submit payment
4. Click footer links to access admin portals

### Apartment Admin Access
1. Navigate to `http://localhost:5173/admin`
2. View Apartment Admin landing page
3. Click "Sign In as Apartment Admin"
4. Enter credentials provided by Super Admin
5. Access apartment-specific dashboard

### Super Admin Access
1. Navigate to `http://localhost:5173/super-admin`
2. View Super Admin landing page
3. Click "Sign In as Super Admin"
4. Enter Super Admin credentials
5. Access system-wide dashboard

## Portal Separation Rules

- **Super Admins** attempting to access `/admin` will be redirected to `/super-admin`
- **Apartment Admins** attempting to access `/super-admin` will see "Access Denied"
- Each portal has its own distinct landing page before login
- Navigation between portals is available from the public portal footer

## Super Admin Features

### Dashboard Overview
- View system-wide statistics
- Total apartments, admins, and payments
- Quick access to all management sections

### Apartment Management
**Create Apartment:**
1. Click "Add Apartment" button
2. Enter unique apartment name
3. Set status (Active/Inactive)
4. Click "Create"

**Edit Apartment:**
1. Click edit icon next to apartment
2. Modify name or status
3. Click "Update"

**Delete Apartment:**
- Deletes apartment and ALL associated data:
  - Admin assignments
  - Buildings/blocks/phases
  - Flat numbers
  - Payment submissions
- Confirmation required

**Export:**
- Click "Export CSV" to download apartment list

### Admin Management
**Create Admin:**
1. Click "Add Admin" button
2. Enter admin details:
   - Name, Email, Phone
   - Select apartment (one per admin)
   - Set password (min 6 characters)
   - Set status
3. Click "Create"
4. Admin can now login at `/admin`

**Edit Admin:**
1. Click edit icon next to admin
2. Update details (email cannot be changed)
3. Optionally reset password
4. Click "Update"

**Delete Admin:**
- Removes admin access
- Deletes associated user account
- Confirmation required

**Export:**
- Click "Export CSV" to download admin list

### All Payments View
**Features:**
- Read-only view of all payments across apartments
- Search by name, email, apartment, or flat
- Filter by status (Received/Reviewed/Approved)
- View payment details and screenshots
- Export filtered results to CSV

**View Payment Details:**
1. Click eye icon next to payment
2. View complete submission information
3. Click screenshot link to view proof

**Export:**
- Click "Export CSV" to download payment data

## Apartment Admin Features

### Dashboard Overview
- View apartment-specific statistics
- Buildings/blocks, flats, and payment counts
- Quick access to management sections

### Buildings & Flats Management

**Add Building/Block/Phase:**
1. Click "Add" in Buildings panel
2. Enter name (e.g., "Block A", "North Tower")
3. Select type (Block/Building/Phase/Tower/Wing)
4. Click "Create"

**Add Flat Numbers:**
1. Select a building from the list
2. Click "Add" in Flats panel
3. Select building (if not pre-selected)
4. Enter flat number
5. Click "Create"

**Edit/Delete:**
- Click edit/delete icons in each panel
- Deleting a building removes all associated flats
- Confirmation required for deletions

### Payment Submissions Management

**View Submissions:**
- All payment proofs submitted by residents
- Search by name, email, or flat number
- Filter by status

**Update Status:**
1. Click refresh icon next to payment
2. Select new status:
   - **Received** - Initial state when submitted
   - **Reviewed** - Payment verified by admin
   - **Approved** - Final approval
3. Click "Update Status"
4. Status change is logged for audit
5. Email notification sent to resident

**View Payment Details:**
1. Click eye icon
2. Review all submission information
3. View payment screenshot
4. Update status if needed

**Delete Payment:**
- Click delete icon
- Permanent deletion from database
- Confirmation required

**Export:**
- Click "Export CSV" to download payment data
- Exports filtered results based on current search/filter

**Refresh:**
- Click "Refresh" to reload latest data

## Database Structure

### Tables
- `apartments` - Apartment/society records
- `buildings_blocks_phases` - Building/block/phase definitions
- `flat_numbers` - Flat numbers per building
- `admins` - Apartment administrator accounts
- `super_admins` - Super administrator accounts
- `payment_submissions` - Payment proof submissions
- `audit_logs` - System activity logs

### Security
- Row Level Security (RLS) enabled on all tables
- Super Admins: Full read/write access to apartments and admins, read-only for payments
- Apartment Admins: Full access to their apartment's data only
- Public: Insert-only access to payment_submissions for active apartments

## File Upload Specifications

### Constraints
- Maximum file size: **4MB**
- Allowed formats: **JPEG, PNG, PDF**
- Validation enforced on frontend and database

### Storage
- Supabase Storage bucket: `payment-screenshots`
- Public read access for authenticated users
- Secure upload via authenticated endpoints

## CSV Export Features

All CSV exports include:
- Timestamp in filename
- Complete record data
- Action logged in audit_logs

**Available Exports:**
- Super Admin: Apartments, Admins, All Payments
- Apartment Admin: Buildings/Flats, Payment Submissions

## Audit Logging

All critical actions are logged:
- Create/Update/Delete operations
- Status changes
- Data exports
- User email and timestamp recorded

## Best Practices

### Super Admin
1. Create apartments before assigning admins
2. One admin per apartment (enforced by system)
3. Regularly export data for backup
4. Review audit logs for compliance

### Apartment Admin
1. Set up all buildings and flats before going live
2. Update payment status promptly
3. Export payment data regularly for reconciliation
4. Delete only when necessary (permanent)

## Troubleshooting

### Cannot Create Admin
- Check if apartment already has an admin assigned
- Verify email is unique
- Ensure apartment is active

### Cannot See Payments
- Verify apartment has active status
- Check buildings and flats are configured
- Ensure RLS policies are active

### Export Not Working
- Check browser allows downloads
- Verify data exists for export
- Review audit logs for errors

## Security Notes

1. **Password Requirements:** Minimum 6 characters
2. **Session Management:** Automatic timeout after inactivity
3. **RLS Protection:** Database-level access control
4. **Audit Trail:** All sensitive actions logged
5. **Data Deletion:** Permanent - no recovery possible

## Support

For technical issues or feature requests, contact system administrator at `sammathaik@gmail.com`.

---

**Version:** 1.0
**Last Updated:** 2025-11-07
