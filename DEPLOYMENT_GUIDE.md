# FlatFund Pro - Deployment Guide

## Deployment Options

Your FlatFund Pro application is ready to deploy! You have several options:

### Option 1: Netlify (Recommended - Easiest)

#### Via Netlify Drop (No Account Required)
1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Visit Netlify Drop:**
   - Go to: https://app.netlify.com/drop
   - Drag and drop the entire `dist` folder
   - Your site will be live in seconds!

#### Via Netlify CLI (With Account)
1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod
   ```
   - Select: Create & configure a new site
   - Choose your team
   - Enter site name (e.g., flatfundpro-yourname)
   - Publish directory: `dist`

4. **Your site will be live at:** `https://your-site-name.netlify.app`

#### Via GitHub + Netlify (Automated Deployments)
1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Connect to Netlify:**
   - Go to: https://app.netlify.com
   - Click "Add new site" > "Import an existing project"
   - Choose "GitHub" and authorize
   - Select your repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Add environment variables:
     - `VITE_SUPABASE_URL`: Your Supabase URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
   - Click "Deploy site"

---

### Option 2: Vercel

#### Via Vercel CLI
1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Add Environment Variables:**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

4. **Deploy to production:**
   ```bash
   vercel --prod
   ```

#### Via GitHub + Vercel
1. **Push to GitHub** (same as above)
2. **Connect to Vercel:**
   - Go to: https://vercel.com
   - Click "Add New" > "Project"
   - Import your GitHub repository
   - Framework Preset: Vite
   - Add environment variables
   - Click "Deploy"

---

### Option 3: GitHub Pages

1. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json:**
   Add these scripts:
   ```json
   {
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Add homepage field:**
   ```json
   {
     "homepage": "https://yourusername.github.io/flatfundpro"
   }
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages:**
   - Go to your repo settings
   - Pages > Source: gh-pages branch
   - Save

---

## Environment Variables

All deployment platforms need these environment variables:

```
VITE_SUPABASE_URL=https://rjiesmcmdfoavggkhasn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaWVzbWNtZGZvYXZnZ2toYXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDk3OTMsImV4cCI6MjA3ODA4NTc5M30.9WGrZQTdYKe5QGQ6XL7uJthEdyuBtggEer0nPwlT1no
```

**Important:** These are already in your `.env` file, but must be added to your deployment platform's environment variables.

---

## Three Portal URLs (After Deployment)

Once deployed, your three portals will be accessible at:

1. **Public Portal:**
   - `https://your-site.netlify.app/`
   - For residents to submit payments

2. **Apartment Admin Portal:**
   - `https://your-site.netlify.app/admin`
   - For apartment administrators

3. **Super Admin Portal:**
   - `https://your-site.netlify.app/super-admin`
   - For system administrators

---

## Post-Deployment Checklist

### 1. Test All Three Portals
- [ ] Visit public portal and verify it loads
- [ ] Visit `/admin` and see apartment admin landing page
- [ ] Visit `/super-admin` and see super admin landing page
- [ ] Test navigation between portals

### 2. Create Admin Users
- [ ] Follow `CREATE_ADMIN_GUIDE.md` to create Super Admin
- [ ] Create Apartment Admin users for each apartment
- [ ] Test login on both admin portals

### 3. Test Payment Submission
- [ ] Go to public portal
- [ ] Select an apartment (e.g., Sunrise Heights)
- [ ] Select a block (e.g., Block A)
- [ ] Select a flat (e.g., 101)
- [ ] Fill in payment details
- [ ] Upload a screenshot
- [ ] Submit and verify it appears in admin portal

### 4. Verify Supabase Connection
- [ ] Check that apartments load in dropdowns
- [ ] Verify payment submissions are saved to database
- [ ] Test admin login works
- [ ] Verify RLS policies are working (admins see only their data)

---

## Troubleshooting

### Site Loads But Shows Blank Page
- Check browser console for errors (F12)
- Verify environment variables are set correctly
- Make sure Supabase URL and keys are correct

### Can't Login
- Verify you created admin users in Supabase Dashboard
- Check `CREATE_ADMIN_GUIDE.md` for setup instructions
- Ensure users have `status = 'active'`

### Apartments Not Loading
- Check Supabase connection
- Verify RLS policies allow public read access to apartments
- Check browser network tab for API errors

### 404 Errors on Routes
- Verify `_redirects` file is in `dist` folder
- For Netlify: Check `netlify.toml` exists
- For Vercel: Should work automatically with Vite

---

## Custom Domain (Optional)

### Netlify
1. Go to Site settings > Domain management
2. Click "Add custom domain"
3. Follow DNS setup instructions

### Vercel
1. Go to Project settings > Domains
2. Add your domain
3. Configure DNS records

---

## Recommended: Netlify Drop (Quickest Way)

**For immediate deployment:**

1. Open terminal and run:
   ```bash
   npm run build
   ```

2. Go to: **https://app.netlify.com/drop**

3. Drag the `dist` folder onto the page

4. Your site is live in seconds!

5. Note: You'll need to add environment variables later in Netlify dashboard if you want to keep the site

---

## Sample Data Already Included

Your deployed site will have:
- ✅ 3 Sample Apartments (Sunrise Heights, Green Valley, Downtown Residences)
- ✅ Multiple blocks/towers per apartment
- ✅ 80+ flats across all apartments
- ✅ Ready for testing and demonstration

Just create your admin users and start using it!

---

## Need Help?

If you encounter any issues during deployment, check:
1. Build logs for errors
2. Browser console for runtime errors
3. Supabase logs for database errors
4. Network tab for API call failures

For localhost issues, make sure:
- Port 5173 is not in use by another app
- Run `npm run dev` to start development server
- Check that all dependencies are installed (`npm install`)
