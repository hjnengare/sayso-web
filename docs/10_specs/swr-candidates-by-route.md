# Routes & Components That Can Benefit from SWR

## Already Using SWR

| Hook/Context | API/Data | Used By |
|--------------|----------|---------|
| useBusinesses | /api/businesses | Home, Explore, Leaderboard, Trending |
| useForYouBusinesses | /api/businesses (For You) | Home (For You tab) |
| useTrendingBusinesses | /api/trending | Home |
| useFeaturedBusinesses | /api/featured | Home |
| useEvents | /api/events | Events listing |
| useLiveSearch | /api/search | Search input |
| useUserPreferences | /api/user/preferences | For You, deal-breakers |
| useReviews | /api/reviews?business_id=X | Business detail reviews |
| useUserProfile, useUserStats, useUserReviews, useUserBadges | /api/user/*, /api/badges/user | Profile page |
| useSavedBusinessesDetails | /api/saved/businesses | Profile saved section |
| SavedItemsContext | /api/saved/businesses (IDs) | Global saved state |
| useSWR (achievements) | /api/badges/user | Achievements page |

---

## High Impact – Page-Level Routes

### 1. Business Detail – `/business/[id]`

**Current:** Raw `fetch` in `useEffect`, `cache: 'no-store'`, no caching.

**Benefit:** Instant load when navigating back (e.g. from review form), deduplication if opened in multiple tabs, stale-while-revalidate.

**Proposed:** `useBusinessDetail(businessId)` – SWR key `['/api/businesses', businessId]`, dedup 30–60s. Integrate with `businessUpdateEvents` for cache invalidation on edit/delete.

---

### 2. Reviewer Profile – `/reviewer/[id]`

**Current:** Raw `fetch` in `useEffect`, visibility refetch works but no cache.

**Benefit:** Instant load when revisiting a reviewer (e.g. from leaderboard), shared cache with CommunityHighlights if it uses the same hook.

**Proposed:** `useReviewerProfile(reviewerId)` – SWR key `['/api/reviewers', reviewerId]`, dedup 60s. Visibility-based `mutate()`.

---

### 3. Event Detail – `/event/[id]`

**Current:** Multiple fetches (event, reviews, saved-events) in `useEffect`.

**Benefit:** Stale-while-revalidate, faster tab switching, shared event cache.

**Proposed:**
- `useEventDetail(eventId)` – `/api/events-and-specials/{id}` or `/api/events/{id}`
- `useEventReviews(eventId)` – `/api/events/{id}/reviews`
- `useSavedEvent(eventId)` – `/api/user/saved-events?event_id=X` (nullable key when not logged in)

---

### 4. Special Detail – `/special/[id]`

**Current:** Same pattern as event – raw fetch for event/special and saved-events.

**Proposed:** Same hooks as event (events-and-specials API covers both), or `useSpecialDetail(id)`.

---

### 5. Events-Specials Listing – `/events-specials`

**Current:** Custom `fetchPage` with pagination, manual prefetch cache, timeout/retry. Does *not* use `useEvents`.

**Benefit:** SWR for first page + `useSWRInfinite` or key-based pagination for “Load More”. Centralized cache instead of manual prefetch.

**Proposed:** `useEventsSpecials({ filter, search, offset })` – adapt to existing `/api/events` params, or create dedicated hook for this page’s API shape.

---

## Medium Impact – Section-Level / Components

### 6. CommunityHighlights

**Current:** Fetches `/api/reviewers/top` and `/api/reviews/recent` in `useEffect` when not provided via props.

**Benefit:** Deduplication if used in multiple places, cache when navigating home → away → home.

**Proposed:**
- `useReviewersTop(limit)` – key `['/api/reviewers/top', limit]`
- `useRecentReviews(limit)` – key `['/api/reviews/recent', limit]`

---

### 7. Saved Page – `/saved`

**Current:** Fetches `/api/user/saved` in `useEffect`. SavedItemsContext only provides IDs; saved page needs full business objects.

**Benefit:** Stale-while-revalidate, instant load when revisiting.

**Proposed:** `useSavedBusinessesFull()` – key `['/api/user/saved', userId]` when authenticated. Can align with or extend `useSavedBusinessesDetails` pattern.

---

### 8. Notifications – `/notifications`

**Current:**
- Personal: NotificationsContext uses `apiClient` + Supabase realtime (no SWR).
- Business: Raw `fetch` in `useEffect` for `/api/notifications/business`.

**Benefit:** SWR for both; background revalidation, dedup.

**Proposed:**
- `usePersonalNotifications()` – SWR with key `['/api/notifications/user', userId]`, plus existing realtime for live updates.
- `useBusinessNotifications()` – key `['/api/notifications/business', userId]`. Current `useBusinessNotifications` hook exists but does different work (toast); rename or add SWR-based fetch hook.

---

### 9. Owner Dashboard – `/my-businesses/businesses/[id]`

**Current:** Mix of Supabase direct queries and `fetch('/api/businesses/{id}/views')`. Business data from Supabase.

**Benefit:** SWR for `/api/businesses/{id}/views` and any other REST calls. Business data could come from `useBusinessDetail` if owner dashboard migrates to it.

**Proposed:** Use `useBusinessDetail` for business data; add `useBusinessViews(businessId)` for analytics, or keep Supabase for dashboard-specific queries.

---

## Lower Impact – Per-Card / N+1 Patterns

### 10. ReviewerCard – badges fetch

**Current:** When `propBadges` is missing, each card fetches `/api/badges/user?user_id=X` in `useEffect`.

**Benefit:** Strong deduplication – many cards for the same user trigger a single request. `useUserBadges` exists and could be reused.

**Proposed:** Use `useUserBadges(userId)` (or equivalent) inside ReviewerCard when `propBadges` is empty. Ensure parent (e.g. CommunityHighlights) can pass badges from `useReviewersTop` when available to avoid N+1 entirely.

---

### 11. ReviewCard – badges, helpful count, replies

**Current:** Multiple fetches per card: badges, helpful count, helpful status, replies. All in `useEffect`.

**Benefit:** Deduplication for same review across views; cache when navigating away and back.

**Proposed:**
- `useUserBadges(authorId)` for badges (already exists).
- `useReviewHelpful(reviewId)` – `/api/reviews/{id}/helpful` and `/api/reviews/{id}/helpful/count`.
- `useReviewReplies(reviewId)` – `/api/reviews/{id}/replies`.

Mutate on reply post/delete/update.

---

## Lower Priority / Edge Cases

### 12. Geocode (MapPicker, add-business)

**Current:** Debounced `fetch` to `/api/geocode` on address input.

**Benefit:** Cache repeated geocode for the same address. Lower impact due to debounce and infrequent reuse.

**Proposed:** `useGeocode(address)` with nullable key when address is empty. High dedup (e.g. 5 min) for same query.

---

### 13. Business Review Edit – `/business/[id]/review`

**Current:** Fetches business and existing review in `useEffect`.

**Benefit:** Can reuse `useBusinessDetail` and add `useReview(reviewId)` for the edit case.

---

### 14. useBusinessReviewPreview

**Current:** Custom batch fetcher with in-memory cache and subscriber pattern. POST to `/api/reviews/previews`.

**Benefit:** Could be backed by SWR with a composite key, but the batch POST + subscriber design is specialized. Lower priority unless consolidating all fetch patterns.

---

## Summary by Priority

| Priority | Route/Component | Main Benefit |
|----------|-----------------|---------------|
| High | /business/[id] | Instant back navigation, heavy traffic |
| High | /reviewer/[id] | Same as profile – public, frequently revisited |
| High | /event/[id], /special/[id] | Multiple fetches, event browsing |
| Medium | /events-specials | Pagination + prefetch simplification |
| Medium | CommunityHighlights | Dedup reviewers top + recent reviews |
| Medium | /saved | Full saved businesses cache |
| Medium | /notifications | Both personal and business |
| Low | ReviewerCard badges | N+1 dedup |
| Low | ReviewCard | badges, helpful, replies dedup |
| Low | Geocode, review edit | Smaller, situational wins |
