# Featured Businesses of the Month – Investigation

## Overview

"Featured businesses of the month" are the same data as "featured businesses": one API, one hook, two surfaces (Home + Leaderboard). The label "businesses of the month" is used in the UI; the code uses "featured" (API, hook, types).

---

## 1. Data flow

```
GET /api/featured
    ↓
useFeaturedBusinesses()  →  featuredBusinesses: FeaturedBusiness[]
    ↓
Home:    featuredByCategory = featuredBusinesses → CommunityHighlights (businessesOfTheMonth)
Leaderboard: featuredBusinessesFromAPI = featuredBusinesses → BusinessOfMonthLeaderboard (businesses)
```

- **Single source:** `useFeaturedBusinesses` → `GET /api/featured`.
- **Home:** passes `featuredByCategory` (same array) as `businessesOfTheMonth` to `CommunityHighlights`.
- **Leaderboard:** passes `featuredBusinessesFromAPI` as `businesses` to `BusinessOfMonthLeaderboard`.

---

## 2. API: GET /api/featured

**File:** `src/app/api/featured/route.ts`

**Flow:**

1. **Primary:** `get_featured_businesses` RPC (with `category_label` after migration 20260206).
2. **Fallback 1:** If RPC fails or returns no rows → `getFeaturedFallback()` (direct `businesses` + `business_stats` query with `category_label` in select).
3. **Fallback 2:** If still short → `get_quality_fallback_businesses` RPC; rows shaped with `mvRowToFeaturedShape()` (includes `category_label` if present).
4. **Fallback 3:** If still short → `get_new_businesses` RPC; same `mvRowToFeaturedShape()`.

**Response shape (per business):**

- `id`, `name`, `image`, `image_url`, `uploaded_images`, `alt`
- `category`, `category_label`, `sub_interest_id`, `subInterestId`, `subInterestLabel`, `interestId`
- `description`, `location`, `rating`, `reviewCount`, `totalRating`, `reviews`
- `badge: "featured"`, `rank`, `href`, `monthAchievement`, `ui_hints`, `verified`
- `featured_score`, `recent_reviews_30d`, `recent_reviews_7d`, `bayesian_rating`

**Category label:** Uses DB `category_label` when present, else `getCategoryLabelFromBusiness(business)` so the UI gets a display label (e.g. "Fashion & Clothing") and avoids "Miscellaneous" when the slug is known.

**After building the list:** Diversification by subcategory (one per bucket when possible), then business images loaded from `business_images`, then mapping to the response shape above.

---

## 3. Hook: useFeaturedBusinesses

**File:** `src/app/hooks/useFeaturedBusinesses.ts`

- Fetches `GET /api/featured` on mount (unless `skip: true`).
- Query params: `limit`, `region`.
- **No retry:** on failure sets `error`, `statusCode`, and `featuredBusinesses = []`.
- **No cache/fallback:** no keep-last-good or alternate endpoint.
- Returns: `featuredBusinesses`, `loading`, `error`, `statusCode`, `refetch`, `meta`.

**Types:** `FeaturedBusiness` includes `category_label?: string` (and all fields the API returns).

---

## 4. Where it’s rendered

### Home (`src/app/home/page.tsx`)

- `useFeaturedBusinesses({ limit: 12, region: userLocation ? 'Cape Town' : null, skip: authLoading })`.
- `featuredByCategory = featuredBusinesses` (no extra filtering).
- Community Highlights block:
  - If `featuredError && !featuredLoading` → error message (Featured + status).
  - Else if `allBusinessesLoading` → `CommunityHighlightsSkeleton` (reviewerCount=4, businessCount=4).
  - Else → `CommunityHighlights` with `businessesOfTheMonth={featuredByCategory}` and `variant="reviews"`.

**Note:** Skeleton is tied to `allBusinessesLoading`, not `featuredLoading`. So while featured is still loading, the section can render with empty `featuredByCategory` until the request completes (or show skeleton only when `allBusinessesLoading`). No dedicated “featured loading” skeleton.

### Leaderboard (`src/app/leaderboard/page.tsx`)

- `useFeaturedBusinesses({ limit: 50, skip: !shouldFetchBusinesses })`.
- `shouldFetchBusinesses` becomes true when the user opens the “businesses” tab.
- Passes `featuredBusinessesFromAPI` to `BusinessOfMonthLeaderboard` as `businesses`.

### CommunityHighlights (`src/app/components/CommunityHighlights/CommunityHighlights.tsx`)

- Receives optional `businessesOfTheMonth?: BusinessOfTheMonth[]`.
- If both `topReviewers` and `businessesOfTheMonth` are empty/missing → returns `null`.
- “Featured Businesses of the Month by Category” block: horizontal scroll of `BusinessOfTheMonthCard` for each `businessesOfTheMonth` item.

### BusinessOfTheMonthCard (`src/app/components/BusinessCard/BusinessOfTheMonthCard.tsx`)

- Props: `business: BusinessOfTheMonth`, `index`.
- Uses `getCategoryLabelFromBusiness(business)` for the category line (prefers `business.category_label` when present).
- Image: `uploaded_images` → `image` / `image_url` → else subcategory placeholder via `getSubcategoryPlaceholderFromCandidates([sub_interest_id, subInterestId, category, …])`.
- Links: `href` or `/business/${slug || id}`; review CTA to `/business/${id}/review`.

### Leaderboard business tab

- **BusinessOfMonthLeaderboard:** filter by interest, sort by rating, show top 5 + “Show more”.
- **BusinessOfMonthPodium:** top 3 cards.
- **BusinessLeaderboardItem:** list rows.
- All use the same `BusinessOfTheMonth` type; they read `interestId`, `category_label` / category from the same API payload.

---

## 5. Types

- **FeaturedBusiness** (`useFeaturedBusinesses.ts`): matches API response; includes `category_label?: string`.
- **BusinessOfTheMonth** (`src/app/types/community.ts`): used by card and leaderboard; includes `category`, `category_label?`, `subInterestId`, `subInterestLabel`, etc. Same data, different name at the type level.

---

## 6. Findings and recommendations

| Area | Finding |
|------|--------|
| **Single source** | One API and one hook feed both Home and Leaderboard; no duplicate fetch for “businesses of the month”. |
| **Category label** | API and RPC/fallbacks now provide `category_label`; card uses it via `getCategoryLabelFromBusiness(business)`. |
| **Error handling** | On featured API failure, hook clears the list and sets error; Home shows an error block. No retry or “last good” data. |
| **Loading state** | Home uses `allBusinessesLoading` for the Community Highlights skeleton, not `featuredLoading`. While featured is loading, the section can render with an empty list. |
| **Leaderboard** | Featured businesses are loaded only when the businesses tab is active (`shouldFetchBusinesses`). |

**Optional improvements:**

1. **Hook fallback:** In `useFeaturedBusinesses`, optionally keep previous `featuredBusinesses` on error and/or add one automatic retry before setting error.
2. **Home loading:** Use `featuredLoading` (or `featuredLoading || allBusinessesLoading`) to show `CommunityHighlightsSkeleton` so the “featured businesses of the month” block doesn’t appear empty while the featured API is still loading.
3. **Naming:** If you want consistency, you could alias or document that “featured businesses” and “businesses of the month” refer to the same data (e.g. in a comment or a shared constant).

---

## 7. Quick reference

| What | Where |
|------|--------|
| API | `GET /api/featured` → `src/app/api/featured/route.ts` |
| RPC | `get_featured_businesses(p_region, p_limit, p_seed)` → migration `20260206_featured_rpc_category_label.sql` |
| Hook | `useFeaturedBusinesses` → `src/app/hooks/useFeaturedBusinesses.ts` |
| Home | `featuredByCategory` → `CommunityHighlights` → `BusinessOfTheMonthCard` |
| Leaderboard | `featuredBusinessesFromAPI` → `BusinessOfMonthLeaderboard` → podium + list |
| Types | `FeaturedBusiness` (hook), `BusinessOfTheMonth` (community types) |
