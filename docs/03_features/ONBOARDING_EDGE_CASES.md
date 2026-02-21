# Onboarding Workflow - Missing Edge Cases

## 🔴 Critical Edge Cases (High Priority)

### 1. **Double Submission / Rapid Clicks**
**Issue**: User clicks "Continue" multiple times rapidly
**Current State**: `isNavigating` flag exists but no debouncing
**Risk**: Multiple API calls, duplicate saves, race conditions
**Fix Needed**: 
- Add debounce/throttle to `handleNext` functions
- Disable button immediately on first click
- Use `useRef` to track if submission is in progress

### 2. **Network Timeout / Slow Connection**
**Issue**: No timeout on fetch requests
**Current State**: Fetch calls can hang indefinitely
**Risk**: User stuck on loading screen, poor UX
**Fix Needed**:
- Add `AbortController` with timeout (e.g., 30 seconds)
- Show timeout error message
- Allow retry with exponential backoff

### 3. **Component Unmount During Async Operations**
**Issue**: User navigates away while API call is in progress
**Current State**: State updates may occur after unmount
**Risk**: Memory leaks, React warnings, state corruption
**Fix Needed**:
- Use `useRef` to track mounted state
- Check `isMounted` before `setState` calls
- Cleanup in `useEffect` return

### 4. **Browser Back Button During Save**
**Issue**: User clicks back while `isNavigating=true`
**Current State**: Navigation can interrupt save operation
**Risk**: Data loss, inconsistent state
**Fix Needed**:
- Use `beforeunload` event to warn if save in progress
- Block back navigation during save (or save in background)
- Use `router.replace` instead of `router.push` to prevent back navigation

### 5. **Page Refresh During Save**
**Issue**: User refreshes page while saving
**Current State**: No persistence of "saving" state
**Risk**: Lost progress, duplicate saves
**Fix Needed**:
- Use `beforeunload` to warn if unsaved changes
- Save draft to localStorage before API call
- Restore draft on page load if save incomplete

### 6. **Session Expiration During Multi-Step Flow**
**Issue**: Session expires between steps (e.g., interests → subcategories)
**Current State**: 401 handled on save, but not on page load
**Risk**: User sees error only after clicking continue
**Fix Needed**:
- Check session validity on page mount
- Refresh session proactively before expiration
- Show warning if session expires soon

### 7. **Concurrent Tab Conflicts**
**Issue**: User has multiple tabs open, saves in one tab
**Current State**: No tab synchronization
**Risk**: Stale data, conflicting saves, state desync
**Fix Needed**:
- Use `storage` event to sync between tabs
- Show warning if another tab is active
- Prevent saves if another tab is saving

### 8. **Database State Mismatch**
**Issue**: UI state doesn't match database (e.g., after refresh)
**Current State**: `useOnboardingData` loads from DB, but context may be stale
**Risk**: User sees wrong selections, validation fails
**Fix Needed**:
- Always load from DB on page mount
- Compare DB state with UI state
- Show warning if mismatch detected
- Auto-sync or prompt user to choose

### 9. **Profile Update Race Condition**
**Issue**: Profile updates from another device while onboarding
**Current State**: No real-time sync
**Risk**: Step changes mid-flow, redirects to wrong step
**Fix Needed**:
- Poll profile updates during onboarding
- Detect step changes and refresh
- Handle redirects gracefully

### 10. **Invalid Data in Database**
**Issue**: Database has corrupted/invalid data (e.g., invalid interest IDs)
**Current State**: No validation of loaded data
**Risk**: App crashes, validation errors
**Fix Needed**:
- Validate all loaded data against schemas
- Filter out invalid entries
- Log errors and show user-friendly message

## 🟡 Important Edge Cases (Medium Priority)

### 11. **localStorage Cleared Mid-Flow**
**Issue**: User clears browser data during onboarding
**Current State**: Relies on localStorage for draft data
**Risk**: Lost selections, user has to start over
**Fix Needed**:
- Don't rely solely on localStorage
- Always save to DB immediately
- Use localStorage only as cache

### 12. **Email Verification During Onboarding**
**Issue**: User verifies email while on a step
**Current State**: May redirect away from current step
**Risk**: Interrupted flow, confusion
**Fix Needed**:
- Detect email verification completion
- Stay on current step if in onboarding
- Refresh user state without redirect

### 13. **Middleware Redirect Loops**
**Issue**: Middleware and OnboardingGuard both redirect
**Current State**: Both check conditions independently
**Risk**: Infinite redirect loops, poor performance
**Fix Needed**:
- Coordinate between middleware and guard
- Use flags to prevent double redirects
- Add redirect attempt counter

### 14. **API Rate Limiting**
**Issue**: User hits rate limits (429 errors)
**Current State**: No rate limit handling
**Risk**: User blocked, no retry mechanism
**Fix Needed**:
- Detect 429 responses
- Show rate limit message
- Implement exponential backoff
- Queue requests if needed

### 15. **Partial Save Failures**
**Issue**: Save succeeds but profile update fails (or vice versa)
**Current State**: No transaction/rollback
**Risk**: Inconsistent state (data saved but step not updated)
**Fix Needed**:
- Use database transactions where possible
- Verify both operations succeed
- Rollback on failure
- Retry failed operations

### 16. **URL Manipulation / Direct Navigation**
**Issue**: User manually navigates to `/complete` before finishing steps
**Current State**: Middleware blocks, but what if they bypass?
**Risk**: Incomplete onboarding, errors
**Fix Needed**:
- Server-side validation on all endpoints
- Never trust client-side state alone
- Verify prerequisites on API calls

### 17. **Network Interruption Recovery**
**Issue**: Network drops during save, user reconnects
**Current State**: Error shown, but no auto-retry
**Risk**: User has to manually retry
**Fix Needed**:
- Detect network reconnection
- Auto-retry failed saves
- Show retry progress

### 18. **Browser Close During Save**
**Issue**: User closes tab/window while saving
**Current State**: Save may not complete
**Risk**: Data loss, incomplete state
**Fix Needed**:
- Use `navigator.sendBeacon` for critical saves
- Save to localStorage as backup
- Resume on next visit

### 19. **Validation Edge Cases**
**Issue**: Edge cases in min/max validation
**Current State**: Basic validation exists
**Risk**: Invalid selections accepted
**Fix Needed**:
- Validate against actual available options
- Check for duplicate selections
- Validate interest/subcategory relationships
- Server-side validation as backup

### 20. **Error Recovery UX**
**Issue**: After error, user doesn't know how to proceed
**Current State**: Error shown, but unclear next steps
**Risk**: User stuck, abandons flow
**Fix Needed**:
- Clear error messages with actions
- "Retry" button for retryable errors
- "Start Over" option for critical failures
- Progress indicator showing where they are

## 🟢 Nice-to-Have Edge Cases (Low Priority)

### 21. **Offline Mode Support**
**Issue**: User goes offline during onboarding
**Current State**: No offline handling
**Risk**: Errors, lost progress
**Fix Needed**:
- Queue saves when offline
- Sync when back online
- Show offline indicator

### 22. **Slow Device Performance**
**Issue**: Animations/transitions lag on slow devices
**Current State**: Fixed durations, no performance detection
**Risk**: Poor UX, feels broken
**Fix Needed**:
- Detect device performance
- Reduce animations on slow devices
- Use `prefers-reduced-motion`

### 23. **Accessibility Edge Cases**
**Issue**: Screen reader users, keyboard navigation
**Current State**: Basic accessibility
**Risk**: Inaccessible to some users
**Fix Needed**:
- Full keyboard navigation
- ARIA labels for all actions
- Focus management during navigation
- Screen reader announcements

### 24. **Internationalization**
**Issue**: Error messages, validation in English only
**Current State**: Hardcoded English strings
**Risk**: Poor UX for non-English users
**Fix Needed**:
- i18n for all user-facing strings
- Locale-aware validation messages

### 25. **Analytics / Tracking**
**Issue**: No tracking of where users drop off
**Current State**: Limited error logging
**Risk**: Can't identify problem areas
**Fix Needed**:
- Track step completion rates
- Log errors with context
- Track time spent per step
- Identify common failure points

## 🔧 Implementation Priority

### Phase 1 (Critical - Do First):
1. Double submission prevention
2. Network timeout handling
3. Component unmount safety
4. Browser back/refresh handling
5. Session expiration checks

### Phase 2 (Important - Do Soon):
6. Concurrent tab handling
7. Database state validation
8. Profile update race conditions
9. API rate limiting
10. Partial save recovery

### Phase 3 (Nice-to-Have - Do Later):
11. Offline mode
12. Performance optimization
13. Enhanced analytics

