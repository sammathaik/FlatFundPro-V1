# Bundle Optimization Guide

**Current Bundle Size**: 1,179 KB (253 KB gzipped)
**Target Bundle Size**: ~700 KB (180 KB gzipped)
**Expected Improvement**: 40-50% reduction

---

## Priority 1: Remove Unused Imports (5 minutes)

### Issue: MobilePaymentFlow Still Imported

The `ResidentPaymentGateway` component still imports `MobilePaymentFlow` even though it's no longer used after the mobile login unification.

**File**: `src/components/ResidentPaymentGateway.tsx`

**Current Code**:
```typescript
import { useState } from 'react';
import { Smartphone, FileText, ArrowRight, Zap, Shield, Clock, Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';
import MobilePaymentFlow from './MobilePaymentFlow';  // ← REMOVE THIS
import DynamicPaymentForm from './DynamicPaymentForm';

type EntryMode = 'selection' | 'mobile' | 'manual';  // ← Change to 'selection' | 'manual'

export default function ResidentPaymentGateway() {
```

**Fixed Code**:
```typescript
import { useState } from 'react';
import { Smartphone, FileText, ArrowRight, Zap, Shield, Clock, Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';
import DynamicPaymentForm from './DynamicPaymentForm';

type EntryMode = 'selection' | 'manual';

interface ResidentPaymentGatewayProps {
  onNavigate?: (path: string) => void;
}

export default function ResidentPaymentGateway({ onNavigate }: ResidentPaymentGatewayProps) {
```

**Also Update the Button**:
```typescript
// OLD:
<button
  onClick={() => setMode('mobile')}

// NEW:
<button
  onClick={() => {
    if (onNavigate) {
      sessionStorage.setItem('occupant_entry_context', 'payment_submission');
      onNavigate('/occupant');
    }
  }}
```

**Impact**: Removes ~15-20 KB from bundle

---

## Priority 2: Implement Lazy Loading (15 minutes)

### Step 1: Lazy Load Admin Routes

**File**: `src/App.tsx`

**Current** (all loaded upfront):
```typescript
import AdminLandingPage from './components/admin/AdminLandingPage';
import SuperAdminLandingPage from './components/admin/SuperAdminLandingPage';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import ApartmentAdminDashboard from './components/admin/ApartmentAdminDashboard';
```

**Optimized** (lazy loaded):
```typescript
import { lazy, Suspense } from 'react';

const AdminLandingPage = lazy(() => import('./components/admin/AdminLandingPage'));
const SuperAdminLandingPage = lazy(() => import('./components/admin/SuperAdminLandingPage'));
const SuperAdminDashboard = lazy(() => import('./components/admin/SuperAdminDashboard'));
const ApartmentAdminDashboard = lazy(() => import('./components/admin/ApartmentAdminDashboard'));
const OccupantDashboard = lazy(() => import('./components/occupant/OccupantDashboard'));
const MarketingLandingPage = lazy(() => import('./components/MarketingLandingPage'));
const LearnMorePage = lazy(() => import('./components/LearnMorePage'));
const RequestDemoPage = lazy(() => import('./components/RequestDemoPage'));
```

**Add Loading Component**:
```typescript
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
```

**Wrap Routes**:
```typescript
// Example for admin route
if (currentPath === '/admin') {
  if (!user) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AdminLandingPage
          onLogin={() => navigate('/admin/login')}
          onBackToPublic={() => navigate('/')}
        />
      </Suspense>
    );
  }

  if (userRole === 'admin') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ApartmentAdminDashboard />
      </Suspense>
    );
  }
}
```

**Impact**: Reduces initial bundle by ~400-500 KB

---

### Step 2: Lazy Load Analytics Components

**File**: `src/components/admin/ApartmentAdminDashboard.tsx`

**Current**:
```typescript
import AnalyticsReports from './AnalyticsReports';
import FraudDetectionDashboard from './FraudDetectionDashboard';
import CommunicationAuditDashboard from './CommunicationAuditDashboard';
import ClassificationAnalytics from './ClassificationAnalytics';
```

**Optimized**:
```typescript
import { lazy, Suspense } from 'react';

const AnalyticsReports = lazy(() => import('./AnalyticsReports'));
const FraudDetectionDashboard = lazy(() => import('./FraudDetectionDashboard'));
const CommunicationAuditDashboard = lazy(() => import('./CommunicationAuditDashboard'));
const ClassificationAnalytics = lazy(() => import('./ClassificationAnalytics'));
```

**Wrap in Suspense**:
```typescript
{activeTab === 'analytics' && (
  <Suspense fallback={<div className="p-8 text-center">Loading analytics...</div>}>
    <AnalyticsReports />
  </Suspense>
)}

{activeTab === 'fraud-detection' && (
  <Suspense fallback={<div className="p-8 text-center">Loading fraud detection...</div>}>
    <FraudDetectionDashboard />
  </Suspense>
)}
```

**Do the same in**: `src/components/admin/SuperAdminDashboard.tsx`

**Impact**: Reduces admin dashboard bundle by ~150-200 KB

---

## Priority 3: Optimize Supabase Client (5 minutes)

### Tree-shake Unused Supabase Features

**File**: `src/lib/supabase.ts`

If you're not using auth features:
```typescript
import { createClient } from '@supabase/supabase-js';

// Instead of importing everything, only import what you use
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false  // Disable if not using OAuth
    }
  }
);
```

**Impact**: Minimal, but helps with tree-shaking

---

## Priority 4: Vite Configuration (10 minutes)

### Manual Chunks Configuration

**File**: `vite.config.ts`

**Current**:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

**Optimized**:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],

          // Admin chunks (lazy loaded)
          'admin': [
            './src/components/admin/ApartmentAdminDashboard',
            './src/components/admin/SuperAdminDashboard',
          ],

          // Analytics chunks (lazy loaded)
          'analytics': [
            './src/components/admin/AnalyticsReports',
            './src/components/admin/FraudDetectionDashboard',
            './src/components/admin/ClassificationAnalytics',
          ],

          // Occupant portal (lazy loaded)
          'occupant': [
            './src/components/occupant/OccupantDashboard',
            './src/components/occupant/OccupantProfile',
          ],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
});
```

**Impact**: Better code splitting, smaller individual chunks

---

## Expected Results

### Before Optimization
```
dist/assets/index-BtZcBNEL.js   1,179.47 kB │ gzip: 253.82 kB
```

### After Optimization (Estimated)
```
dist/assets/index-[hash].js          ~350 kB │ gzip: ~80 kB   (main bundle)
dist/assets/react-vendor-[hash].js   ~145 kB │ gzip: ~45 kB   (React)
dist/assets/supabase-vendor-[hash].js ~50 kB │ gzip: ~15 kB   (Supabase)
dist/assets/admin-[hash].js          ~250 kB │ gzip: ~60 kB   (Admin - lazy)
dist/assets/analytics-[hash].js      ~150 kB │ gzip: ~35 kB   (Analytics - lazy)
dist/assets/occupant-[hash].js       ~100 kB │ gzip: ~25 kB   (Occupant - lazy)
```

### Performance Improvements
- **Initial Load**: Only loads ~350 KB + vendors (~545 KB total)
- **Admin Route**: Lazy loads additional ~250 KB when needed
- **Analytics**: Lazy loads additional ~150 KB when viewed
- **Total Reduction**: ~635 KB → ~545 KB initial (saves ~90 KB initial load)
- **Lazy Loaded**: ~400 KB of code only loaded when needed

---

## Testing & Verification

### 1. Build and Check Sizes
```bash
npm run build
```

Look for output like:
```
dist/assets/index-[hash].js          350 kB
dist/assets/react-vendor-[hash].js   145 kB
dist/assets/admin-[hash].js          250 kB
```

### 2. Test Lazy Loading
1. Open dev tools → Network tab
2. Navigate to `/` (public landing)
3. Should NOT see admin/analytics JS files loaded
4. Navigate to `/admin`
5. Should see admin-[hash].js loaded now

### 3. Check Lighthouse Score
```bash
npm run build
npm run preview
# Open Chrome DevTools → Lighthouse → Run
```

**Expected Improvements**:
- Performance: +10-15 points
- FCP (First Contentful Paint): -0.5-1s
- TTI (Time to Interactive): -1-2s

---

## Maintenance

### When Adding New Features

1. **Large Components**: Use lazy loading
```typescript
const NewFeature = lazy(() => import('./NewFeature'));
```

2. **Keep Bundle Small**: Check after each feature
```bash
npm run build | grep "dist/assets"
```

3. **Avoid Large Dependencies**: Check size before installing
```bash
npx bundle-phobia <package-name>
```

### When Bundle Grows
1. Use webpack-bundle-analyzer to identify culprits
2. Lazy load the largest components
3. Consider splitting features into separate chunks

---

## Summary

| Optimization | Time | Impact | Priority |
|--------------|------|--------|----------|
| Remove unused imports | 5 min | ~15-20 KB | High |
| Lazy load routes | 15 min | ~400-500 KB | High |
| Lazy load analytics | 10 min | ~150-200 KB | Medium |
| Vite config chunks | 10 min | Better splitting | Medium |
| Supabase tree-shake | 5 min | ~10-20 KB | Low |

**Total Time**: ~45 minutes
**Total Impact**: ~575-740 KB reduction in initial bundle
**User Experience**: 40-50% faster initial page load

---

## Additional Resources

- [Vite Code Splitting](https://vitejs.dev/guide/features.html#async-chunk-loading-optimization)
- [React Lazy Loading](https://react.dev/reference/react/lazy)
- [Bundle Size Optimization](https://web.dev/reduce-javascript-payloads-with-code-splitting/)

After optimization, your bundle should be well below the 500 KB warning threshold, and users will experience significantly faster load times!
