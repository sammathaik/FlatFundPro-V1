# FlatFund Pro - Apartment Maintenance Payment Portal

A comprehensive three-portal system for managing apartment maintenance payments with role-based access control.

## Three Separate Portals

### 1. Public Portal (`/`)
**For Residents & Owners**
- Light amber/white themed interface
- Submit maintenance payment screenshots
- Select apartment, building, and flat from dropdowns
- No login required

### 2. Apartment Admin Portal (`/admin`)
**For Apartment Administrators**
- Amber/orange themed interface
- Manage buildings, blocks, and flats
- Review and approve payment submissions
- View apartment-specific analytics
- Export payment data

### 3. Super Admin Portal (`/super-admin`)
**For System Administrators**
- Dark slate with emerald green theme
- Manage all apartments system-wide
- Create and assign apartment administrators
- View all payments (read-only)
- System-wide analytics and exports

---

## Quick Start

### Option 1: Deploy to Netlify (2 Minutes)

```bash
# 1. Build the project
npm run build

# 2. Go to https://app.netlify.com/drop
# 3. Drag and drop the 'dist' folder
# 4. Your site is live!
```

See `QUICK_DEPLOY.md` for detailed instructions.

### Option 2: Run Localhost

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open browser
# http://localhost:5173/
```

See `LOCALHOST_SETUP.md` if you have issues.

---

## Documentation

| File | Purpose |
|------|---------|
| `QUICK_DEPLOY.md` | Deploy your site in 2 minutes |
| `DEPLOYMENT_GUIDE.md` | Detailed deployment options (Netlify, Vercel, GitHub Pages) |
| `LOCALHOST_SETUP.md` | Fix localhost and run locally |
| `CREATE_ADMIN_GUIDE.md` | Create your first admin users |
| `ADMIN_GUIDE.md` | Complete admin features documentation |
| `SETUP_GUIDE.md` | Initial setup and configuration |

---

## Features

### For Residents
- ✅ Simple payment submission form
- ✅ Upload payment screenshots (JPEG, PNG, PDF)
- ✅ Automatic apartment/block/flat selection
- ✅ No registration required

### For Apartment Admins
- ✅ Dashboard with analytics
- ✅ Manage buildings and flats
- ✅ Review payment submissions
- ✅ Update payment status (Received → Reviewed → Approved)
- ✅ Export to CSV
- ✅ Search and filter payments

### For Super Admins
- ✅ Manage multiple apartments
- ✅ Create apartment administrators
- ✅ View all payments system-wide
- ✅ System analytics
- ✅ Audit logs for all actions
- ✅ Export all data

---

## Technology Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Hosting:** Netlify / Vercel / GitHub Pages

---

## Sample Data Included

Your application comes with pre-populated test data:

- **3 Apartments:**
  - Sunrise Heights (3 blocks, 32 flats)
  - Green Valley Apartments (2 towers, 24 flats)
  - Downtown Residences (3 phases, 24 flats)

- **80+ Flats** across all apartments
- **Ready for immediate testing**

---

## Security Features

- ✅ Row Level Security (RLS) on all database tables
- ✅ Role-based access control
- ✅ Admins can only access their assigned apartment
- ✅ Super admins can't modify payments (read-only)
- ✅ Audit logs for all sensitive operations
- ✅ Secure file uploads with size limits (4MB)
- ✅ Password protected admin access

---

## Portal URLs

After deployment, your portals will be:

```
Public Portal:          https://your-site.com/
Apartment Admin:        https://your-site.com/admin
Super Admin:            https://your-site.com/super-admin
```

---

## First-Time Setup

### 1. Deploy Your Site
Follow `QUICK_DEPLOY.md` or `DEPLOYMENT_GUIDE.md`

### 2. Create Super Admin
Follow `CREATE_ADMIN_GUIDE.md` to:
- Create auth user in Supabase Dashboard
- Make them a Super Admin via SQL
- Login at `/super-admin`

### 3. Create Apartment Admins
Use Super Admin portal to:
- Create apartment administrator accounts
- Assign them to specific apartments
- Share credentials with apartment managers

### 4. Start Using
- Share public portal URL with residents
- Apartment admins manage their properties
- Super admin oversees entire system

---

## Environment Variables

Required in `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note:** When deploying, add these to your hosting platform's environment variables.

---

## Project Structure

```
flatfundpro/
├── src/
│   ├── components/          # React components
│   │   ├── admin/          # Admin portal components
│   │   ├── PublicLandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── ...
│   ├── contexts/           # React contexts (Auth)
│   ├── lib/               # Utilities and Supabase client
│   ├── App.tsx            # Main routing logic
│   └── main.tsx           # Entry point
├── supabase/
│   └── migrations/        # Database migrations
├── public/                # Static assets
├── dist/                  # Build output (after npm run build)
└── docs/                  # Documentation (*.md files)
```

---

## Commands

```bash
# Development
npm install          # Install dependencies
npm run dev         # Start dev server
npm run build       # Build for production
npm run preview     # Preview production build locally

# Linting
npm run lint        # Check code quality
npm run typecheck   # Check TypeScript types
```

---

## Support

### Common Issues

**Localhost not working?** → See `LOCALHOST_SETUP.md`

**Can't login?** → See `CREATE_ADMIN_GUIDE.md`

**Need to deploy?** → See `QUICK_DEPLOY.md`

**Want full features guide?** → See `ADMIN_GUIDE.md`

---

## Database Schema

Tables:
- `apartments` - Apartment/society records
- `buildings_blocks_phases` - Building structure
- `flat_numbers` - Flat/unit numbers
- `super_admins` - Super administrator accounts
- `admins` - Apartment administrator accounts
- `payment_submissions` - Payment records
- `audit_logs` - System activity logs

All tables have Row Level Security (RLS) enabled for data protection.

---

## License

Proprietary - All rights reserved

---

## Version

**Version:** 2.0.0
**Last Updated:** November 8, 2024
**Three-Portal Architecture**

---

## Next Steps

1. ✅ Deploy your site (see `QUICK_DEPLOY.md`)
2. ✅ Create admin users (see `CREATE_ADMIN_GUIDE.md`)
3. ✅ Test all three portals
4. ✅ Share URLs with users
5. ✅ Start managing payments!

**Your FlatFund Pro is ready to use! 🚀**
