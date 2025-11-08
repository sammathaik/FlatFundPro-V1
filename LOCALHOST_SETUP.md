# Fix Localhost & Run Locally

## Quick Fix for Localhost

If your localhost is not working, follow these steps:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open in Browser
The terminal will show:
```
  VITE v5.4.8  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Open:** `http://localhost:5173/`

---

## Test All Three Portals Locally

Once the dev server is running:

### 1. Public Portal
```
http://localhost:5173/
```
- Should show welcome page with hero section
- Scroll down to see payment form
- Footer has links to admin portals

### 2. Apartment Admin Portal
```
http://localhost:5173/admin
```
- Should show amber/orange themed landing page
- Click "Sign In as Apartment Admin" button
- Need admin credentials to proceed

### 3. Super Admin Portal
```
http://localhost:5173/super-admin
```
- Should show dark theme with emerald accents
- Click "Sign In as Super Admin" button
- Need super admin credentials to proceed

---

## Common Localhost Issues

### Issue: Port 5173 Already in Use

**Error Message:**
```
Port 5173 is in use, trying another one...
```

**Solution 1:** Kill the process using port 5173
```bash
# On Linux/Mac:
lsof -ti:5173 | xargs kill -9

# On Windows:
netstat -ano | findstr :5173
taskkill /PID <PID_NUMBER> /F
```

**Solution 2:** Use a different port
```bash
npm run dev -- --port 3000
```
Then open: `http://localhost:3000/`

---

### Issue: Module Not Found Errors

**Error Message:**
```
Cannot find module 'XXX'
```

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

### Issue: Blank White Screen

**Possible Causes:**
1. JavaScript error in browser console
2. Supabase not configured
3. Environment variables missing

**Solution:**
1. Open browser console (F12)
2. Check for red error messages
3. Verify `.env` file exists with:
   ```
   VITE_SUPABASE_URL=https://rjiesmcmdfoavggkhasn.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Restart dev server after adding .env

---

### Issue: Cannot Login to Admin Portal

**This is normal!** You need to create admin users first.

**Solution:**
Follow `CREATE_ADMIN_GUIDE.md`:
1. Go to Supabase Dashboard
2. Create auth user under Authentication > Users
3. Run SQL to create super_admin or admin record
4. Then try logging in

---

## Development Workflow

### For Frontend Changes
1. Edit files in `src/` folder
2. Save - Vite will hot-reload automatically
3. Check browser - changes appear instantly

### For Database Changes
1. Create new migration in `supabase/migrations/`
2. Apply via Supabase Dashboard SQL Editor
3. Restart dev server if needed

### For Environment Variables
1. Edit `.env` file
2. **Must restart dev server** for changes to take effect
3. Run `npm run dev` again

---

## Build for Production

When ready to deploy:

```bash
# Build the project
npm run build

# Preview the production build locally
npm run preview
```

The preview will run on `http://localhost:4173/`

---

## Still Having Issues?

### Check These:

1. **Node.js Version:**
   ```bash
   node --version
   ```
   Should be v18 or higher

2. **NPM Version:**
   ```bash
   npm --version
   ```
   Should be v9 or higher

3. **Dependencies Installed:**
   ```bash
   ls node_modules
   ```
   Should show many folders

4. **Environment Variables:**
   ```bash
   cat .env
   ```
   Should show Supabase credentials

5. **Supabase Connection:**
   - Open browser console
   - Check Network tab for failed requests
   - Verify Supabase project is active

---

## Quick Test Checklist

- [ ] Run `npm install` successfully
- [ ] Run `npm run dev` successfully
- [ ] Open `http://localhost:5173/` - see public portal
- [ ] Open `http://localhost:5173/admin` - see admin landing
- [ ] Open `http://localhost:5173/super-admin` - see super admin landing
- [ ] No red errors in browser console (F12)
- [ ] Network requests to Supabase succeed (check Network tab)

If all checked, your localhost is working correctly!

---

## Alternative: Use Production Build Locally

If dev server has issues, try production build:

```bash
npm run build
npm run preview
```

This runs the same code that would be deployed.

---

## Need to Deploy Instead?

If localhost continues to have issues, you can skip it and deploy directly:

See `QUICK_DEPLOY.md` for 2-minute deployment to Netlify
