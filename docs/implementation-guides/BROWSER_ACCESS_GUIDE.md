# Browser Access Guide - Troubleshooting

## Issue: Can't Access Website from External Browsers

If you can access the site in Bolt but not in Chrome, Edge, or mobile browsers, follow these steps:

---

## ✅ Solution 1: Start the Development Server

The app needs the dev server running to work in browsers.

### Step 1: Open Terminal
```bash
cd /path/to/project
```

### Step 2: Start Dev Server
```bash
npm run dev
```

### Step 3: Look for the URL
You'll see output like:
```
VITE v5.4.8  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/
```

### Step 4: Access the Site
- **On same computer:** Open `http://localhost:5173/` in any browser
- **On mobile (same WiFi):** Open `http://192.168.1.100:5173/` (use the Network URL shown)

---

## ✅ Solution 2: Check if Server is Running

### Quick Check
```bash
# Check if port 5173 is in use
lsof -i :5173

# Or try:
netstat -an | grep 5173
```

If nothing shows up, the server isn't running. Start it with `npm run dev`.

---

## ✅ Solution 3: Mobile Access (Same WiFi Network)

### For Mobile Phones/Tablets

1. **Ensure devices are on same WiFi**
   - Computer and mobile must be on the same network
   - Public WiFi may block device-to-device connections

2. **Find Network IP**
   ```bash
   # On Mac/Linux:
   ifconfig | grep "inet "

   # On Windows:
   ipconfig
   ```
   Look for something like `192.168.1.100`

3. **Update Vite Config** (if mobile still can't connect)

   Edit `vite.config.ts`:
   ```typescript
   export default defineConfig({
     plugins: [react()],
     server: {
       host: '0.0.0.0',  // ← Add this
       port: 5173,        // ← Add this
     },
     optimizeDeps: {
       exclude: ['lucide-react'],
     },
   });
   ```

4. **Restart Dev Server**
   ```bash
   # Stop with Ctrl+C, then:
   npm run dev
   ```

5. **Access from Mobile**
   - Use Network URL: `http://192.168.1.100:5173/`
   - Replace with your actual IP

---

## ✅ Solution 4: Firewall Issues

### Windows Firewall
1. Search "Windows Defender Firewall"
2. Click "Allow an app through firewall"
3. Find Node.js or Vite
4. Check both Private and Public
5. Click OK

### Mac Firewall
1. System Preferences → Security & Privacy
2. Firewall tab
3. Firewall Options
4. Add Node or Terminal
5. Allow incoming connections

### Linux Firewall
```bash
# Allow port 5173
sudo ufw allow 5173

# Or disable temporarily (testing only)
sudo ufw disable
```

---

## ✅ Solution 5: Production Build (No Dev Server)

If you want to run without `npm run dev`:

### Step 1: Build
```bash
npm run build
```

### Step 2: Preview
```bash
npm run preview
```
This starts a production preview server.

### Step 3: Or Use Any HTTP Server
```bash
# Install serve globally
npm install -g serve

# Serve the dist folder
serve -s dist -p 5173
```

---

## 🔍 Debugging Steps

### 1. Check Dev Server Status
```bash
npm run dev
```
Should show:
```
✓ Built in XXXms
➜ Local:   http://localhost:5173/
```

### 2. Open Browser Console
- Chrome: F12 → Console tab
- Edge: F12 → Console tab
- Mobile: Use desktop browser's remote debugging

Look for errors like:
- ❌ `Failed to fetch` → Server not running
- ❌ `ERR_CONNECTION_REFUSED` → Wrong URL or server down
- ❌ `Missing Supabase environment variables` → .env file issue

### 3. Test Basic Connection
Open in browser:
```
http://localhost:5173/
```

Should see the FlatFund Pro homepage, not an error page.

### 4. Check Environment Variables
```bash
# Check .env file exists
cat .env

# Should show:
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=...
```

If missing, copy from `.env.example` or check setup guides.

---

## 🌐 Accessing from Different Devices

| Device | URL to Use | Requirement |
|--------|-----------|-------------|
| Same Computer | `http://localhost:5173/` | Dev server running |
| Mobile (Same WiFi) | `http://192.168.x.x:5173/` | Server on `0.0.0.0` |
| Remote Device | Deploy to Netlify/Vercel | See DEPLOYMENT_GUIDE.md |

---

## 🚀 Deploy for Real Access (Production)

If you need permanent access from any device:

### Option 1: Netlify (Free, 2 Minutes)
```bash
npm run build
# Go to https://app.netlify.com/drop
# Drag 'dist' folder
```

### Option 2: Vercel (Free, 1 Command)
```bash
npm install -g vercel
vercel
```

See `DEPLOYMENT_GUIDE.md` for full instructions.

---

## ⚠️ Common Mistakes

### Mistake 1: Server Not Running
**Symptom:** Page won't load, "Cannot connect" error

**Solution:** Run `npm run dev` in terminal

### Mistake 2: Wrong URL
**Symptom:** Mobile can't access, computer works

**Solution:**
- Don't use `localhost` on mobile
- Use Network IP: `http://192.168.x.x:5173/`

### Mistake 3: Different WiFi
**Symptom:** Mobile gets "No internet" or timeout

**Solution:**
- Put computer and mobile on same WiFi
- Or deploy to Netlify/Vercel for internet access

### Mistake 4: Firewall Blocking
**Symptom:** Connection times out after few seconds

**Solution:** Allow port 5173 in firewall (see Solution 4 above)

### Mistake 5: Old Build
**Symptom:** Changes don't appear

**Solution:**
- Hard refresh: Ctrl+Shift+R (Chrome) or Cmd+Shift+R (Mac)
- Clear browser cache
- Rebuild: `npm run build`

---

## 📱 Mobile-Specific Issues

### iOS Safari
- May need HTTPS for some features
- Use deployment (Netlify) for full functionality
- Or use ngrok for local HTTPS tunneling

### Android Chrome
- Works well with local network access
- Ensure "Use secure connections" doesn't block HTTP

### Mobile Data (Not WiFi)
- Can't access localhost
- Must deploy to Netlify/Vercel
- Or use tunneling service (ngrok, localtunnel)

---

## 🔧 Advanced: Tunneling for Mobile Testing

If same WiFi doesn't work:

### Using ngrok (Easy)
```bash
# Install ngrok
npm install -g ngrok

# In one terminal:
npm run dev

# In another terminal:
ngrok http 5173
```

You'll get a URL like `https://abc123.ngrok.io` that works from anywhere.

---

## 📞 Still Having Issues?

### Check List:
- [ ] Dev server is running (`npm run dev`)
- [ ] No errors in terminal
- [ ] Browser console shows no errors
- [ ] Using correct URL (localhost or Network IP)
- [ ] Firewall allows port 5173
- [ ] .env file exists with Supabase credentials
- [ ] Same WiFi network (for mobile access)

### Get Help:
1. Check browser console (F12) for specific error
2. Check terminal for server errors
3. Try different browser
4. Try from same computer first (localhost)
5. Then try mobile/other devices

---

## ✅ Quick Checklist

**For Same Computer:**
```bash
1. npm run dev                    # Start server
2. Open http://localhost:5173/    # In browser
```

**For Mobile (Same WiFi):**
```bash
1. Edit vite.config.ts (add host: '0.0.0.0')
2. npm run dev
3. Note the Network URL
4. Open Network URL on mobile
```

**For Production/Internet:**
```bash
1. npm run build
2. Deploy dist folder to Netlify
3. Access from anywhere
```

---

Last Updated: 2025-11-08
