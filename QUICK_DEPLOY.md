# Quick Deploy - Get Your Site Live in 2 Minutes

## Fastest Way: Netlify Drop

### Step 1: Build Your Site
Open terminal in your project folder and run:
```bash
npm run build
```

This creates a `dist` folder with your compiled site.

### Step 2: Deploy to Netlify Drop

1. **Open this URL in your browser:**
   ```
   https://app.netlify.com/drop
   ```

2. **Drag and drop the `dist` folder** from your project onto the Netlify Drop page

3. **Wait 10 seconds** - Your site is now live!

4. **You'll get a URL like:**
   ```
   https://random-name-123456.netlify.app
   ```

### Step 3: Access Your Three Portals

Your site is now live with three separate portals:

1. **Public Portal (Residents):**
   ```
   https://your-site.netlify.app/
   ```

2. **Apartment Admin Portal:**
   ```
   https://your-site.netlify.app/admin
   ```

3. **Super Admin Portal:**
   ```
   https://your-site.netlify.app/super-admin
   ```

### Step 4: Create Your First Admin User

Follow the instructions in `CREATE_ADMIN_GUIDE.md` to:
1. Create a Super Admin user in Supabase Dashboard
2. Login at `/super-admin`
3. Create Apartment Admin users

---

## That's It!

Your FlatFund Pro is now live and accessible from anywhere!

**Sample Data Included:**
- 3 Apartments ready to use
- 80+ flats configured
- All three portals working

**Next Steps:**
- Share the public portal URL with residents
- Share admin portal URLs with administrators
- Start managing payments!

---

## Optional: Keep This Site Permanently

If you used Netlify Drop and want to keep the site:

1. Create a free Netlify account at https://netlify.com
2. Go to your deployed site in the Netlify dashboard
3. Click "Claim this site"
4. Add your environment variables:
   - Go to Site settings > Environment variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
5. Redeploy from the dashboard

---

## Troubleshooting

**Site shows blank page?**
- Open browser console (F12) and check for errors
- Make sure Supabase is configured correctly

**Can't login?**
- Create admin users first via `CREATE_ADMIN_GUIDE.md`
- Check Supabase Dashboard > Authentication > Users

**Localhost not working?**
- Run `npm install` first
- Then run `npm run dev`
- Open `http://localhost:5173`

For detailed deployment options, see `DEPLOYMENT_GUIDE.md`
