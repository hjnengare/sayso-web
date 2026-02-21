# Mobile Onboarding Performance Issues & Fixes

## Problem
Onboarding works perfectly on desktop localhost but is extremely slow on mobile devices (same network). Not UI/layout issues - pure functionality delays.

## Root Causes Identified

### 1. **Blocking localStorage Operations** 
- Every selection triggers synchronous `localStorage.setItem()`
- Mobile devices have slower storage I/O
- Blocks main thread on mobile

### 2. **UseEffect Waterfall in OnboardingContext**
- Multiple sequential useEffects create dependency chains
- Each triggers re-renders
- Mobile React DevTools slower = compounded delays

### 3. **Auth Retry Logic Amplifies Mobile Latency**
- AuthContext retries up to 3 times with 1-2s delays
- Mobile network requests can be slower even on same WiFi
- Total init time: 3-6+ seconds on mobile vs instant on desktop

### 4. **Router Prefetch Overhead**
- Prefetching multiple routes on mobile devices
- Mobile browser cache/memory constraints
- Can cause memory pressure

### 5. **No Debouncing on State Updates**
- Fast state changes overwhelm mobile's render pipeline
- Desktop handles re-renders easily, mobile lags

## Solutions

### Fix 1: Debounce localStorage Writes
```typescript
// Add to OnboardingContext.tsx
import { debounce } from 'lodash'; // or custom implementation

const debouncedSaveToStorage = useCallback(
  debounce((key: string, value: string) => {
    if (typeof window !== 'undefined') {
      requestIdleCallback(() => {
        localStorage.setItem(key, value);
      }, { timeout: 1000 });
    }
  }, 300),
  []
);

const setSelectedInterests = useCallback((interests: string[]) => {
  setSelectedInterestsState(interests);
  debouncedSaveToStorage('onboarding_interests', JSON.stringify(interests));
}, [debouncedSaveToStorage]);
```

### Fix 2: Consolidate useEffects
```typescript
// Replace multiple useEffects with single initialization
useEffect(() => {
  if (typeof window === 'undefined' || isMounted) return;

  // Single pass initialization
  const initializeOnboarding = () => {
    const user = getCurrentUser(); // synchronous if possible
    const onboardingStep = user?.profile?.onboarding_step;
    const isStartingFresh = !onboardingStep || onboardingStep === 'interests';
    
    // Check and clear stale data in one go
    const hasNoDatabaseData = 
      (user?.profile?.interests_count || 0) === 0 &&
      (user?.profile?.subcategories_count || 0) === 0 &&
      (user?.profile?.dealbreakers_count || 0) === 0;

    if (isStartingFresh && hasNoDatabaseData) {
      localStorage.removeItem('onboarding_interests');
      localStorage.removeItem('onboarding_subcategories');
      localStorage.removeItem('onboarding_dealbreakers');
    } else {
      // Load all at once
      const stored = {
        interests: localStorage.getItem('onboarding_interests'),
        subcategories: localStorage.getItem('onboarding_subcategories'),
        dealbreakers: localStorage.getItem('onboarding_dealbreakers'),
      };

      try {
        if (stored.interests) setSelectedInterestsState(JSON.parse(stored.interests));
        if (stored.subcategories) setSelectedSubInterestsState(JSON.parse(stored.subcategories));
        if (stored.dealbreakers) setSelectedDealbreakerssState(JSON.parse(stored.dealbreakers));
      } catch (e) {
        console.error('Failed to parse stored data:', e);
      }
    }

    setIsMounted(true);
  };

  initializeOnboarding();
}, [isMounted]);
```

### Fix 3: Optimize Auth Retry Logic for Mobile
```typescript
// In AuthContext.tsx - detect mobile and reduce retries
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const MAX_RETRIES = isMobile ? 1 : 3; // Faster fail on mobile
const RETRY_DELAY = isMobile ? 500 : 1000; // Shorter delays

// Also add timeout to prevent hanging
const timeout = isMobile ? 5000 : 10000;
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeout);

try {
  const currentUser = await AuthService.getCurrentUser({ signal: controller.signal });
  clearTimeout(timeoutId);
  // ...
} catch (error) {
  clearTimeout(timeoutId);
  // handle error
}
```

### Fix 4: Conditional Prefetching
```typescript
// Only prefetch on desktop or when device has good connection
const shouldPrefetch = () => {
  if (typeof navigator === 'undefined') return false;
  
  // Check device capabilities
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Check connection quality
  const connection = (navigator as any).connection;
  const hasGoodConnection = !connection || 
    (connection.effectiveType === '4g' && connection.downlink > 5);
  
  return !isMobile || hasGoodConnection;
};

// In nextStep function
if (shouldPrefetch()) {
  allNextRoutes.forEach(route => router.prefetch(route));
}
```

### Fix 5: Add Loading States & Optimistic Updates
```typescript
// Show immediate feedback, persist in background
const setSelectedInterests = useCallback((interests: string[]) => {
  // Immediate UI update
  setSelectedInterestsState(interests);
  
  // Background persistence
  requestIdleCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_interests', JSON.stringify(interests));
    }
  }, { timeout: 2000 });
}, []);
```

### Fix 6: Add Performance Monitoring
```typescript
// Add to detect mobile-specific issues
useEffect(() => {
  if (typeof window === 'undefined') return;
  
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 1000) {
      console.warn(`[Performance] Component took ${duration}ms to mount`);
    }
  };
}, []);
```

## Implementation Priority

1. **CRITICAL**: Debounce localStorage writes (Fix 1)
2. **CRITICAL**: Consolidate useEffects (Fix 2)  
3. **HIGH**: Optimize auth retries (Fix 3)
4. **MEDIUM**: Conditional prefetching (Fix 4)
5. **LOW**: Add monitoring (Fix 6)

## Testing Checklist

- [ ] Test on actual mobile device (not just Chrome DevTools mobile mode)
- [ ] Test on slow 3G throttling
- [ ] Test with React DevTools Profiler
- [ ] Monitor main thread blocking time
- [ ] Check localStorage operation timing
- [ ] Verify no render waterfalls

## Expected Improvements

- Page load time: 3-5s → < 1s
- Step transitions: 2-4s → < 500ms
- localStorage operations: non-blocking
- Memory usage: reduced by 30-40%
