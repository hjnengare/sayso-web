# User Profile Page Analysis

**File:** `src/app/profile/page.tsx` (1,393 lines)  
**Type:** Client Component ("use client")  
**Purpose:** Display authenticated user's profile with reviews, achievements, stats, and settings

---

## Architecture Overview

### Component Structure
- **Main Wrapper:** `ProfileContent()` function component
- **Skeleton Loaders:** 4 separate skeleton components for loading states
- **Exported Page:** Wrapped with `withUserCheck` HOC
- **Layout:** `ProfileLayout` in separate `layout.tsx`

---

## State Management (31 State Variables)

### Profile & Auth
- `isEditOpen` - Edit profile modal visibility
- `username`, `displayName` - Profile name fields
- `avatarFile`, `avatarKey` - Avatar upload/cache busting
- `imgError` - Avatar image load error

### Loading States
- `profileLoading` - Enhanced profile fetch
- `statsLoading` - User stats fetch
- `reviewsLoading` - User reviews fetch
- `achievementsLoading` - Badges/achievements fetch

### Saving & Errors
- `saving` - Profile update in progress
- `error` - General profile update error

### Review Management
- `userReviews[]` - Array of user's reviews
- `reviewToDelete` - Review ID pending deletion
- `reviewToEdit` - Review being edited
- `isDeleteDialogOpen` - Delete review confirmation
- `isDeleting` - Review deletion in progress
- `deleteError` - Review deletion error

### Account Actions
- `isDeleteAccountDialogOpen` - Delete account confirmation
- `isDeletingAccount` - Account deletion in progress
- `deleteAccountError` - Account deletion error
- `isDeactivateDialogOpen` - Deactivate account confirmation
- `isDeactivating` - Account deactivation in progress
- `deactivateError` - Account deactivation error

### Data Storage
- `enhancedProfile` - Extended profile data from API
- `userStats` - Computed user statistics
- `achievements[]` - Earned badges/achievements

### Refs
- `refreshTriggerRef` - Track visibility changes for data refresh

---

## Data Fetching (Multiple useEffect Hooks)

### 1. Visibility Change Handler
**Purpose:** Refetch all data when user returns to page
- Listens to `visibilitychange` event
- Triggers simultaneous reload of: profile, stats, reviews, achievements, saved items
- Sets all loading states to true

### 2. Enhanced Profile Fetch
- **Endpoint:** `/api/user/profile`
- **Triggers:** On mount, when `user?.id` changes
- **Error Handling:** 
  - 401: Early return (not authenticated)
  - 404: Profile doesn't exist yet (graceful)
  - Other: Logs warning, continues with null data
- **Stores:** Bio, location, website, social links, privacy settings

### 3. User Stats Fetch
- **Endpoint:** `/api/user/stats`
- **Triggers:** On mount, when `user?.id` changes
- **Stores:** Reviews count, saved count, helpful votes, creation date

### 4. Reviews Fetch
- **Logic:** Via `useReviewSubmission` hook
- **Stores:** User's written reviews with edit/delete capability

### 5. Achievements/Badges Fetch
- **Endpoint:** `/api/badges/user?user_id={userId}`
- **Transforms:** Badge data to `UserAchievement` interface
- **Stores:** Earned badges with timestamps

### 6. Saved Items Fetch
- **Via Context:** `useSavedItems()` context provider
- **Maintains:** List of saved businesses

---

## Key Capabilities

### Profile Editing
- **Modal:** `EditProfileModal` component
- **Fields:** Username, display name, bio, location, website, social links, avatar
- **Avatar Upload:** 
  - Validates max 5MB file size
  - Uploads to Supabase Storage (`avatars` bucket)
  - Gets public URL
  - Updates database via `updateUser()` from AuthContext
  - Deletes old avatar after upload

### Review Management
- **Display:** `ReviewsList` organism component
- **Actions:** 
  - Edit: Navigate to review edit page with review ID
  - Delete: Confirmation dialog → API call → local state update
  - Refetch achievements after deletion (badge eligibility may change)

### Stats Display
- **Grid:** 4-column layout showing:
  - Total reviews written (via `userReviews.length` or `userStats`)
  - Badges earned (via `achievements.length`)
  - Interests selected (via `profile.interests_count`)
  - Helpful votes received (via `userStats.helpfulVotesReceived`)

### Account Actions
- **Log Out:** Via `logout()` from AuthContext
- **Delete Account:** 
  - Confirmation dialog with warning
  - API call: `DELETE /api/user/delete-account`
  - Cascades deletion of all businesses and related data
  - Redirects to `/onboarding` on success
- **Deactivate Account:** 
  - Separate action from deletion
  - Endpoint: `POST /api/user/deactivate-account` (exists but behavior not fully shown)

### Achievement Display
- **Component:** `AchievementsList` organism
- **Data:** Earned badges with names, descriptions, icons, categories

### Saved Businesses Display
- **Component:** `SavedBusinessRow` for each saved item
- **Source:** `SavedItemsContext`
- **Count:** Primary from context, fallback to `userStats`

---

## Data Flows & Computations

### Derived Values (useMemo-like)
```
displayLabel = display_name || username || email_prefix || "Your Profile"
profileLocation = enhanced_location || profile_location || locale
reviewsCount = userReviews.length || userStats.totalReviewsWritten || 0
badgesCount = achievements.length (actual count)
interestsCount = profile.interests_count || 0
helpfulVotesCount = userStats.helpfulVotesReceived || 0
savedBusinessesCount = savedItems.length || userStats.totalBusinessesSaved
memberSinceLabel = userStats.accountCreationDate || profile.created_at
```

### Data Source Precedence
- **Reviews:** Live array preferred, then stats fallback
- **Achievements:** Live array only
- **Saved:** Context preferred, then stats fallback
- **Creation Date:** Stats preferred, then profile fallback

---

## UI Sections (Rendered)

1. **Page Layout Wrapper** - Header + Main Content + Footer
2. **Profile Header** - Avatar + Name + Bio + Location + Social Links
3. **Stats Grid** - 4-column metric display
4. **Top Reviewer Badge** - If eligible (visual emphasis)
5. **Edit Profile Button** - Opens modal (only for own profile)
6. **Achievements Section** - Earned badges carousel/grid
7. **Reviews Section** - User's written reviews (editable, deletable)
8. **Saved Businesses Section** - Businesses saved by user
9. **Danger Zone** - Account deletion + deactivation

---

## Loading & Error Handling

### Skeleton States
- Profile header skeleton
- Stats grid skeleton (4 placeholders)
- Achievements skeleton
- Reviews skeleton

### Error Display
- Edit profile errors: In modal toast
- Review deletion errors: In-page alert
- Account deletion errors: In confirmation dialog
- API fetch failures: Logged, graceful degradation

### Retry Logic
- Visibility change triggers full refetch
- Manual refresh not explicitly shown (relies on visibility)
- Component re-mounts on auth state change

---

## Performance Considerations

### Potential Issues
1. **31 State Variables:** High re-render frequency
2. **Multiple Independent Fetches:** 5+ parallel API calls on mount
3. **No Memoization:** No `useMemo`/`useCallback` visible
4. **Inline Functions:** Event handlers may cause re-renders
5. **No Pagination:** Reviews/achievements could be very long lists
6. **Visibility Handler:** Triggers 4-5 simultaneous refetches when user returns

### Data Fetching Gaps
- No caching between fetches
- No request deduplication
- All fetches use `cache: 'no-store'`
- Could be optimized with React Query or SWR

---

## Dependencies

### Contexts
- `useAuth()` - User, updateUser, logout
- `useSavedItems()` - savedItems list
- `useRouter()` - Navigation
- `usePageTitle()` - Page title setting

### Hooks
- `useReviewSubmission()` - Delete review logic

### Components
- `EditProfileModal` - Edit profile UI
- `ReviewsList` - Reviews display
- `AchievementsList` - Badges display
- `SavedBusinessRow` - Saved item row
- `DangerAction` - Danger zone action buttons
- `ConfirmationDialog` - Confirmation modals
- `Footer` - Page footer

### Libraries
- Framer Motion - Animations
- Lucide React - Icons
- Next Image - Optimized images

---

## Missing/Incomplete Features

1. **No Profile Viewing of Other Users** - Only own profile
2. **No Privacy Settings UI** - Privacy data fetched but not displayed/editable
3. **No Interests Display** - Count shown but not list of interests
4. **No Account Deactivation Implementation** - UI exists, endpoint unclear
5. **No Pagination** - All data loaded at once
6. **No Search/Filter** - Reviews, achievements not searchable
7. **No Edit for Individual Fields** - All-or-nothing profile update
8. **No Undo/History** - No revision tracking

---

## Type Definitions

```typescript
interface UserProfile { ... }       // 18 fields
interface Review { ... }             // 8 fields
interface Achievement { ... }        // 4 fields
interface UserAchievement { ... }   // achievement_id, earned_at, achievements
```

---

## Integration Points

### With Settings Page
- Account deletion moved to `/settings` for clarity
- Profile page now primarily for viewing/editing public profile
- Logout action could stay in both locations

### With Business Routes
- Business owners see this as personal profile
- May conflict with business dashboard

### With Header
- Profile icon in navbar links to this page
- Active state highlighting when on `/profile`

---

## Recommendations

1. **Extract Fetches:** Use React Query/SWR for efficient data loading
2. **Split State:** Use reducer or context to manage 31 variables
3. **Memoize:** Add `useMemo`/`useCallback` for derived values
4. **Pagination:** Implement for reviews/achievements/saved items
5. **Lazy Loading:** Load sections on demand (tabs/accordion)
6. **Caching:** Cache API responses to reduce requests
7. **Error Boundaries:** Wrap sections to isolate failures
8. **Refactor:** Consider breaking into sub-components
9. **Move Account Actions:** Keep only profile editing here
10. **Type Safety:** Use stricter types to prevent prop issues
