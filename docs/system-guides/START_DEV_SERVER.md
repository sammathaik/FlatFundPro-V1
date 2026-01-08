# Starting the Dev Server - Troubleshooting Guide

## Quick Start

1. Open PowerShell or Command Prompt
2. Navigate to the project:
   ```powershell
   cd "D:\Work Data\AI Generalist Program\Project\FlatFundPro\FlatFundPro-V1"
   ```
3. Run the dev server:
   ```powershell
   npm run dev
   ```

## Expected Output

You should see something like:
```
  VITE v5.4.2  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h + enter to show help
```

## Common Issues

### 0. PowerShell Execution Policy Error

If you see this error:
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
```

**Solution 1: Use Command Prompt instead**
- Open Command Prompt (cmd.exe) instead of PowerShell
- Navigate to the project folder
- Run `npm run dev`

**Solution 2: Fix PowerShell Execution Policy (requires admin)**
1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Close and reopen PowerShell
4. Try `npm run dev` again

**Solution 3: Bypass for current session**
```powershell
powershell -ExecutionPolicy Bypass -Command "cd 'D:\Work Data\AI Generalist Program\Project\FlatFundPro\FlatFundPro-V1'; npm run dev"
```

### 1. Port 5173 Already in Use

If you see an error about port 5173 being in use:

**Solution 1: Kill the process using the port**
```powershell
# Find the process
netstat -ano | findstr :5173

# Kill it (replace PID with the actual process ID)
taskkill /PID <PID> /F
```

**Solution 2: Use a different port**
Edit `vite.config.ts` and change the port:
```typescript
server: {
  host: '0.0.0.0',
  port: 5174, // Change to a different port
},
```

### 2. Missing Environment Variables

If you see errors about missing Supabase variables:
- Make sure `.env` file exists in the project root
- Check that it contains:
  ```
  VITE_SUPABASE_URL=your_url_here
  VITE_SUPABASE_ANON_KEY=your_key_here
  ```

### 3. Node Modules Not Installed

If you see module not found errors:
```powershell
npm install
```

### 4. TypeScript Errors

If there are TypeScript compilation errors:
```powershell
npm run typecheck
```

### 5. Browser Not Loading

- Check if the server is actually running (look for the Vite output)
- Try accessing `http://127.0.0.1:5173` instead of `localhost:5173`
- Check browser console for errors (F12)
- Clear browser cache

## Manual Check

1. **Check if server is running:**
   ```powershell
   netstat -ano | findstr :5173
   ```

2. **Check Node processes:**
   ```powershell
   tasklist | findstr node
   ```

3. **Check for errors in terminal:**
   - Look for red error messages
   - Check for compilation errors
   - Check for missing dependencies

## Still Not Working?

1. **Kill all Node processes:**
   ```powershell
   taskkill /F /IM node.exe
   ```

2. **Clear npm cache:**
   ```powershell
   npm cache clean --force
   ```

3. **Reinstall dependencies:**
   ```powershell
   rm -rf node_modules
   npm install
   ```

4. **Try running with verbose output:**
   ```powershell
   npm run dev -- --debug
   ```

## Alternative: Use Different Terminal

If the background process isn't showing output, try:
1. Open a NEW terminal window (don't use the one running in background)
2. Navigate to the project folder
3. Run `npm run dev` directly
4. You should see the output immediately


