# Cache Audit Summary - Development Environment

## ✅ COMPLETED FIXES

### 1. API Client - Disabled Caching in Dev Mode
**File:** `src/app/lib/api/apiClient.ts`
- ✅ Added `isDev` check to disable caching in development
- ✅ All fetch calls through apiClient now use `cache: 'no-store'` in dev
- ✅ Cache is still enabled in production (safe for prod)

### 2. Response Headers Helper
**File:** `src/app/lib/utils/responseHeaders.ts` (NEW)
- ✅ Created utility function `addNoCacheHeaders()` 
- ✅ Adds comprehensive no-cache headers:
  - `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
  - `Pragma: no-cache`
  - `Expires: 0`
  - `Surrogate-Control: no-store`

### 3. Onboarding Route Handlers - FULLY FIXED
All onboarding route handlers now have no-cache headers:
- ✅ `src/app/api/onboarding/interests/route.ts`
- ✅ `src/app/api/onboarding/subcategories/route.ts`
- ✅ `src/app/api/onboarding/deal-breakers/route.ts`
- ✅ `src/app/api/onboarding/complete/route.ts`
- ✅ `src/app/api/user/onboarding/route.ts` (GET & POST)

### 4. Critical Fetch Calls - FIXED
- ✅ `src/app/lib/onboarding/dataManager.ts` - Already has `cache: 'no-store'`
- ✅ `src/app/contexts/OnboardingContext.tsx` - Fixed `/api/interests` and `/api/user/onboarding`
- ✅ `src/app/hooks/useInterestsPage.ts` - Added `cache: 'no-store'`
- ✅ `src/app/hooks/useSubcategoriesPage.ts` - Added `cache: 'no-store'`
- ✅ `src/app/hooks/useDealBreakersPage.ts` - Added `cache: 'no-store'`

### 5. Middleware - ALREADY FIXED
**File:** `src/middleware.ts`
- ✅ Already has Cache-Control headers set
- ✅ No changes needed

### 6. Root Layout - ALREADY FIXED
**File:** `src/app/layout.tsx`
- ✅ Already has `export const dynamic = 'force-dynamic'`
- ✅ Already has `export const revalidate = 0`

## 🔄 REMAINING WORK

### 1. Route Handlers (57 remaining)
**Pattern:** All route handlers need `addNoCacheHeaders()` wrapper

**Files needing updates:** All files in `src/app/api/**/route.ts` except:
- ✅ Already fixed: onboarding routes (5 files)
- ⚠️ Remaining: ~57 route handler files

**Quick Fix Pattern:**
```typescript
// Add import at top
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Wrap all returns
// BEFORE:
return NextResponse.json({ data: 'value' });

// AFTER:
const response = NextResponse.json({ data: 'value' });
return addNoCacheHeaders(response);
```

**Automated Script:** See `src/app/lib/utils/updateAllRouteHandlers.js` (needs Node.js to run)

### 2. Fetch Calls (30+ remaining)
**Files with fetch() calls that need `cache: 'no-store'`:**

- `src/app/profile/page.tsx` - 6 fetch calls
- `src/app/contexts/SavedItemsContext.tsx` - 1 fetch call
- `src/app/contexts/NotificationsContext.tsx` - 1 fetch call
- `src/app/lib/auth.ts` - 1 fetch call
- `src/app/contexts/AuthContext.tsx` - 2 fetch calls
- `src/app/add-business/page.tsx` - 2 fetch calls
- `src/app/hooks/useUserPreferences.ts` - 1 fetch call
- `src/app/leaderboard/page.tsx` - 2 fetch calls
- `src/app/dm/[id]/page.tsx` - 1 fetch call
- `src/app/special/[id]/page.tsx` - 1 fetch call
- `src/app/admin/seed/page.tsx` - 3 fetch calls
- `src/app/components/BusinessClaim/ClaimModal.tsx` - 1 fetch call
- `src/app/event/[id]/page.tsx` - 1 fetch call
- `src/app/saved/page.tsx` - 1 fetch call
- `src/app/hooks/useReviews.ts` - 1 fetch call
- `src/app/hooks/useUserInterests.ts` - 1 fetch call (already has cache: 'no-store')
- `src/app/test/onboarding-performance/page.tsx` - 1 fetch call

**Pattern:**
```typescript
// BEFORE:
const response = await fetch('/api/endpoint');

// AFTER:
const response = await fetch('/api/endpoint', { cache: 'no-store' });
```

### 3. Server Component Pages
**Pages that need `dynamic = 'force-dynamic'` and `revalidate = 0`:**

Check all Server Component pages (not "use client") in:
- `src/app/**/page.tsx`

**Pattern:**
```typescript
// Add at top of file (before component)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

**Note:** Client Components ("use client") are automatically dynamic, no export needed.

### 4. Link Prefetching
**Files with prefetch that might cause stale data:**
- `src/app/contexts/OnboardingContext.tsx` - router.prefetch() calls
- `src/app/hooks/useInterestsPage.ts` - router.prefetch() calls
- `src/app/hooks/useSubcategoriesPage.ts` - router.prefetch() calls
- `src/app/hooks/useDealBreakersPage.ts` - router.prefetch() calls
- `src/app/complete/page.tsx` - router.prefetch() call

**Note:** Prefetching routes is generally fine, but if stale data appears, consider:
- Disabling prefetch: `router.prefetch()` → remove or conditionally disable
- Or ensure prefetched routes also have no-cache headers (which we're doing)

## 📋 QUICK REFERENCE

### For Route Handlers:
1. Import: `import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';`
2. Wrap: `const response = NextResponse.json(...); return addNoCacheHeaders(response);`
3. Export: `export const dynamic = "force-dynamic"; export const revalidate = 0;`

### For Fetch Calls:
Add `cache: 'no-store'` to all fetch() calls for dynamic data:
```typescript
fetch('/api/endpoint', { cache: 'no-store' })
```

### For Server Component Pages:
Add at top of file:
```typescript
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

## 🎯 PRIORITY ORDER

1. **HIGH:** Fix all route handlers (prevents API response caching)
2. **HIGH:** Fix all fetch() calls (prevents client-side caching)
3. **MEDIUM:** Add dynamic/revalidate to Server Component pages
4. **LOW:** Review Link prefetching (usually fine if routes have no-cache headers)

## ✅ VERIFICATION

After fixes, verify:
1. Hard refresh (Ctrl+Shift+R) always shows fresh data
2. No stale data after rebuilds
3. Network tab shows `Cache-Control: no-store` headers
4. All API responses have no-cache headers

