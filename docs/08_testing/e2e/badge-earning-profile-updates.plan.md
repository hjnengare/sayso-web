# User Badge Earning + Profile Updates E2E Test Plan

## Application Overview

Comprehensive E2E test plan for validating User Badge Earning and Profile Updates in Sayso. This plan covers the complete lifecycle of review submission, automatic badge awarding, badge persistence, profile updates, and cross-surface badge consistency validation. The tests ensure both backend correctness and frontend UI consistency across all user interfaces.

## Test Scenarios

### 1. Pre-conditions Setup

**Seed:** `e2e/seed.spec.ts`

#### 1.1. TC001 - Verify User Pre-conditions

**File:** `e2e/badge-earning/pre-conditions.spec.ts`

**Steps:**
  1. Navigate to Sayso login page
  2. Login with test user credentials
  3. Verify user has 0 reviews in profile
  4. Verify user has 0 badges in profile
  5. Check database: SELECT COUNT(*) FROM reviews WHERE user_id = ? AND deleted_at IS NULL
  6. Check database: SELECT COUNT(*) FROM user_badges WHERE user_id = ?
  7. Confirm both counts are 0

**Expected Results:**
  - User successfully logged in
  - Profile shows 0 reviews count
  - Profile shows 0 badges
  - Database confirms 0 reviews for user
  - Database confirms 0 badges for user

#### 1.2. TC002 - Verify Business Pre-conditions

**File:** `e2e/badge-earning/pre-conditions.spec.ts`

**Steps:**
  1. Find an active approved business via API: GET /api/businesses?limit=1
  2. Verify business status is 'approved' and active
  3. Navigate to business page
  4. Verify business page loads correctly
  5. Verify 'Write a Review' button is present and enabled

**Expected Results:**
  - Business API returns active business
  - Business page loads without errors
  - Review button is accessible

### 2. Review Submission and Badge Awarding

**Seed:** `e2e/seed.spec.ts`

#### 2.1. TC003 - First Review Submission Triggers Badge Award

**File:** `e2e/badge-earning/first-review-badge.spec.ts`

**Steps:**
  1. Navigate to business page
  2. Click 'Write a Review' button
  3. Fill review form: Rating 4/5, text 'Great experience!'
  4. Submit review
  5. Wait for review submission success message
  6. Monitor network requests for badge awarding API call
  7. Verify POST /api/badges/check-and-award was called
  8. Check database: SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
  9. Verify review saved with real user_id (not null)
  10. Check database: SELECT * FROM user_badges WHERE user_id = ? AND badge_id = 'milestone_new_voice'
  11. Confirm badge row inserted with earned_at timestamp
  12. Navigate to profile page (/profile)
  13. Verify 'New Voice' badge appears in badge section

**Expected Results:**
  - Review form submits successfully
  - Badge check API call triggered automatically
  - Review persisted with correct user_id
  - user_badges row created for 'milestone_new_voice'
  - No duplicate badge entries in database
  - Profile page immediately shows new badge
  - Badge appears in correct badge section position

#### 2.2. TC004 - Badge Appears on ReviewerCard Immediately

**File:** `e2e/badge-earning/reviewer-card-badge.spec.ts`

**Steps:**
  1. After review submission from TC003
  2. Navigate to business page where review was posted
  3. Locate the user's review in the reviews list
  4. Find the ReviewerCard component for the user
  5. Verify 'New Voice' badge appears on ReviewerCard
  6. Check badge styling and positioning
  7. Verify badge tooltip shows 'Posted your first review'
  8. Navigate to homepage/community sections
  9. Look for Early Voices or similar sections
  10. Verify badge consistency across all surfaces

**Expected Results:**
  - Badge immediately visible on ReviewerCard
  - Badge displays correct icon and styling
  - Badge tooltip shows correct description
  - Badge appears consistently across all UI surfaces
  - No layout shifts or visual inconsistencies

#### 2.3. TC005 - Anonymous Review Does Not Award Badge

**File:** `e2e/badge-earning/anonymous-review-no-badge.spec.ts`

**Steps:**
  1. Logout from current session
  2. Navigate to business page as unauthenticated user
  3. Submit anonymous review: Rating 3/5, text 'Anonymous review'
  4. Verify review submission success
  5. Check database: SELECT user_id FROM reviews WHERE review_text = 'Anonymous review'
  6. Confirm user_id is NULL for anonymous review
  7. Check database: SELECT COUNT(*) FROM user_badges WHERE badge_id = 'milestone_new_voice'
  8. Verify badge count has not increased
  9. Monitor network: POST /api/badges/check-and-award should NOT be called
  10. Verify no false badge notifications appear

**Expected Results:**
  - Anonymous review submitted successfully
  - Review has NULL user_id in database
  - No badge awarding API call triggered
  - No new badges created in user_badges table
  - No false badge UI updates

### 3. Threshold Badge Testing

**Seed:** `e2e/seed.spec.ts`

#### 3.1. TC006 - Multiple Reviews Leading to Milestone Badge

**File:** `e2e/badge-earning/milestone-badges.spec.ts`

**Steps:**
  1. Login as user who earned 'New Voice' badge
  2. Submit 4 additional reviews on different businesses
  3. For each review: navigate to business → write review → submit
  4. After each submission, check database: SELECT COUNT(*) FROM reviews WHERE user_id = ? AND deleted_at IS NULL
  5. Verify counts: 2, 3, 4, 5 reviews
  6. After 5th review, verify POST /api/badges/check-and-award called
  7. Check database: SELECT * FROM user_badges WHERE user_id = ? AND badge_id = 'milestone_rookie_reviewer'
  8. Confirm 'Rookie Reviewer' badge awarded (5 reviews threshold)
  9. Navigate to profile page
  10. Verify profile shows both 'New Voice' and 'Rookie Reviewer' badges
  11. Verify badge ordering (milestone badges first)

**Expected Results:**
  - 5 reviews successfully submitted
  - Database shows accurate review count progression
  - Badge awarding triggered after 5th review
  - Rookie Reviewer badge (5 reviews) awarded correctly
  - Profile displays both badges in correct order
  - No premature badge awarding before threshold
  - No duplicate badges in database

#### 3.2. TC007 - Badge Recalculation on Review Deletion

**File:** `e2e/badge-earning/badge-recalculation.spec.ts`

**Steps:**
  1. Login as user with 5 reviews and 2 badges
  2. Navigate to profile page
  3. Delete one review using delete functionality
  4. Wait for deletion success confirmation
  5. Verify POST /api/badges/check-and-award triggered for recalculation
  6. Check database: SELECT COUNT(*) FROM reviews WHERE user_id = ? AND deleted_at IS NULL
  7. Verify count is now 4 (below 5-review threshold)
  8. Check database: SELECT * FROM user_badges WHERE user_id = ? AND badge_id = 'milestone_rookie_reviewer'
  9. Verify 'Rookie Reviewer' badge still exists (if your system retains earned badges)
  10. OR verify badge removed if system recalculates strictly
  11. Navigate to profile page
  12. Verify badge section updates immediately
  13. Check cache revalidation via Network tab

**Expected Results:**
  - Review deletion successful
  - Badge recalculation API triggered
  - Database shows correct review count (4)
  - Badge status correct per business logic
  - Profile UI updates immediately after deletion
  - Cache properly revalidated
  - No stale badge data displayed

### 4. Profile Page Updates

**Seed:** `e2e/seed.spec.ts`

#### 4.1. TC008 - Profile Contributions Section Updates

**File:** `e2e/badge-earning/profile-updates.spec.ts`

**Steps:**
  1. Login as user with reviews and badges
  2. Navigate to profile page (/profile)
  3. Verify contributions list shows all user reviews
  4. Verify review count displays correctly
  5. Verify latest review preview appears
  6. Verify badges section shows all earned badges
  7. Submit a new review on any business
  8. Return to profile page (or wait for real-time update)
  9. Verify contributions list includes new review
  10. Verify review count incremented
  11. Verify latest review preview updated to new review
  12. Monitor for N+1 queries in Network/Console

**Expected Results:**
  - Contributions list shows all reviews accurately
  - Review count auto-updates after new submission
  - Latest review preview reflects newest review
  - Badge section displays all earned badges
  - No N+1 queries detected in badge fetching
  - Profile updates without manual refresh

#### 4.2. TC009 - Mobile Profile Responsiveness

**File:** `e2e/badge-earning/mobile-responsiveness.spec.ts`

**Steps:**
  1. Set viewport to mobile (375px width)
  2. Navigate to profile page
  3. Verify contribution rows stack correctly at mobile width
  4. Verify badges wrap cleanly without overlap
  5. Verify no horizontal scrolling issues
  6. Verify badge text remains readable
  7. Test badge overflow behavior with many badges
  8. Submit a review to trigger badge update
  9. Verify mobile profile updates correctly
  10. Test touch interactions work properly

**Expected Results:**
  - Contribution rows stack properly at 375px
  - Badges wrap cleanly without visual overlap
  - No horizontal scroll on mobile profile
  - Badge text legible on small screens
  - Badge updates work seamlessly on mobile
  - Touch interactions responsive

### 5. Cross-Surface Badge Consistency

**Seed:** `e2e/seed.spec.ts`

#### 5.1. TC010 - Badge Consistency Across All Surfaces

**File:** `e2e/badge-earning/cross-surface-consistency.spec.ts`

**Steps:**
  1. Login as user with multiple earned badges
  2. Navigate to profile page - capture badge list
  3. Navigate to business page with user's review
  4. Find ReviewerCard for the user - capture badges shown
  5. Navigate to homepage/community sections
  6. Find any Early Voices cards - capture badges shown
  7. Navigate to any review cards - capture badges shown
  8. Compare badges across all surfaces
  9. Verify consistent badge ordering (milestone > specialist > explorer > community)
  10. Verify consistent badge icons and styling
  11. Submit new review to earn another badge
  12. Revisit all surfaces and verify new badge appears everywhere

**Expected Results:**
  - Same badges displayed across all UI surfaces
  - Consistent badge ordering: milestone > specialist > explorer > community
  - Consistent badge icons and styling
  - New badges appear on ALL surfaces after earning
  - No surface shows stale or missing badge data
  - Badge priority order maintained everywhere

#### 5.2. TC011 - Cache Revalidation Verification

**File:** `e2e/badge-earning/cache-validation.spec.ts`

**Steps:**
  1. Open browser DevTools Network tab
  2. Login and navigate to profile page
  3. Monitor API calls: GET /api/badges/user?user_id=X
  4. Submit a review to trigger badge earning
  5. Monitor POST /api/badges/check-and-award call
  6. Verify revalidatePath('/profile') triggers cache refresh
  7. Check for cache-control headers in responses
  8. Navigate to different pages and back to profile
  9. Verify fresh badge data loaded (no stale cache)
  10. Test cache behavior with multiple tabs open

**Expected Results:**
  - Badge API calls use correct cache headers
  - Profile cache revalidated after review submission
  - No stale badge data served to user
  - Cache tags/paths correctly invalidated
  - Multi-tab consistency maintained

### 6. Edge Cases and Failure Scenarios

**Seed:** `e2e/seed.spec.ts`

#### 6.1. TC012 - Network Failure During Review Submission

**File:** `e2e/badge-earning/network-failure.spec.ts`

**Steps:**
  1. Setup network interception to simulate failure
  2. Login and navigate to business page
  3. Submit review form
  4. Intercept POST /api/badges/check-and-award to fail with 500
  5. Verify review submission still succeeds
  6. Verify user sees review success message
  7. Verify badge does NOT appear falsely in UI
  8. Verify no phantom badge in database
  9. Remove network interception
  10. Manually trigger badge check via API
  11. Verify badge awarded correctly after network recovery

**Expected Results:**
  - Review submission resilient to badge API failure
  - No false badge UI state on network failure
  - Badge correctly awarded after network recovery
  - No phantom/invalid badge data created
  - Clear error handling and user feedback

#### 6.2. TC013 - Rapid Double Review Submission

**File:** `e2e/badge-earning/race-conditions.spec.ts`

**Steps:**
  1. Login as user with 0 badges
  2. Open two browser tabs to same business
  3. In both tabs, simultaneously submit reviews
  4. Monitor database for duplicate badge entries
  5. Check: SELECT COUNT(*) FROM user_badges WHERE user_id = ? AND badge_id = 'milestone_new_voice'
  6. Verify count is exactly 1 (no duplicates)
  7. Verify both reviews saved successfully
  8. Verify profile shows only one 'New Voice' badge
  9. Test rapid clicking on same review form
  10. Verify form submission protection works

**Expected Results:**
  - No duplicate badge entries in database
  - Proper race condition handling
  - Both reviews saved correctly
  - Single badge awarded despite double submission
  - Form prevents rapid duplicate submissions

#### 6.3. TC014 - RLS Policy Enforcement

**File:** `e2e/badge-earning/security-validation.spec.ts`

**Steps:**
  1. Login as regular user
  2. Attempt direct database insert via browser console:
  3. supabase.from('user_badges').insert({user_id: 'X', badge_id: 'milestone_new_voice'})
  4. Verify insert blocked by RLS policy
  5. Verify error message mentions policy violation
  6. Check database: confirm no unauthorized badge entry
  7. Attempt to update existing badge entry directly
  8. Verify update operation also blocked
  9. Verify only server-side functions can insert badges
  10. Test badge deletion protection

**Expected Results:**
  - Direct client inserts blocked by RLS
  - Clear policy violation error messages
  - No unauthorized badge modifications possible
  - Only legitimate server-side badge awarding works
  - Badge data integrity maintained
