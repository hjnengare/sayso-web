# Review System Files

This document lists all files responsible for the review functionality in the application.

## 📁 API Routes (Backend)

### Main Review API
- **`src/app/api/reviews/route.ts`** - Main review API endpoint
  - `POST /api/reviews` - Create new review
  - `GET /api/reviews` - Get reviews (with filters)

### Individual Review Operations
- **`src/app/api/reviews/[id]/route.ts`** - Single review operations
  - `GET /api/reviews/[id]` - Get single review
  - `PUT /api/reviews/[id]` - Update review
  - `DELETE /api/reviews/[id]` - Delete review

### Review Images
- **`src/app/api/reviews/[id]/images/route.ts`** - Review image management
  - `PUT /api/reviews/[id]/images` - Update/add review images
  - `DELETE /api/reviews/[id]/images` - Delete review images
  - `GET /api/reviews/[id]/images` - Get review images

### Review Helpful/Votes
- **`src/app/api/reviews/[id]/helpful/route.ts`** - Mark review as helpful
- **`src/app/api/reviews/[id]/helpful/count/route.ts`** - Get helpful count

### Review Replies
- **`src/app/api/reviews/[id]/reply/route.ts`** - Business owner reply to review
- **`src/app/api/reviews/[id]/replies/route.ts`** - Manage review replies

### Review Flags/Reports
- **`src/app/api/reviews/[id]/flag/route.ts`** - Flag/report reviews

### User Reviews
- **`src/app/api/user/reviews/route.ts`** - Get current user's reviews

---

## 🎨 UI Components

### Review Display
- **`src/app/components/Reviews/ReviewCard.tsx`** - Individual review card component
- **`src/app/components/Reviews/ReviewsList.tsx`** - List of reviews component
- **`src/app/components/Business/PremiumReviewCard.tsx`** - Premium styled review card
- **`src/components/molecules/ReviewItem/ReviewItem.tsx`** - Review item molecule
- **`src/components/organisms/ReviewsList/ReviewsList.tsx`** - Reviews list organism

### Review Form
- **`src/app/components/ReviewForm/ReviewForm.tsx`** - Main review form component
- **`src/app/components/ReviewForm/ReviewTextForm.tsx`** - Review text input form
- **`src/app/components/ReviewForm/ReviewHeader.tsx`** - Review form header
- **`src/app/components/ReviewForm/ReviewSidebar.tsx`** - Review form sidebar
- **`src/app/components/ReviewForm/ReviewSubmitButton.tsx`** - Review submit button
- **`src/app/components/ReviewForm/ReviewStyles.tsx`** - Review form styles

### Reviewer Components
- **`src/app/components/ReviewerCard/ReviewerCard.tsx`** - Reviewer profile card
- **`src/app/components/ReviewerCard/ReviewContent.tsx`** - Reviewer content display
- **`src/app/components/ReviewerCard/ReviewerStats.tsx`** - Reviewer statistics
- **`src/app/components/TopReviewers/TopReviewers.tsx`** - Top reviewers list

---

## 🪝 React Hooks

- **`src/app/hooks/useReviews.ts`** - Hook for fetching and managing reviews
  - `useReviews(businessId)` - Fetch reviews for a business
  - `useReviewSubmission()` - Submit, delete, and manage reviews

- **`src/app/hooks/useReviewForm.ts`** - Hook for review form state management

---

## 🔧 Services & Utilities

- **`src/app/lib/services/reviewService.ts`** - Review service class
  - `getReviewsForBusiness()` - Get reviews for a business
  - `createReview()` - Create a review
  - `uploadReviewImages()` - Upload review images
  - `deleteReview()` - Delete a review
  - `updateBusinessStats()` - Update business statistics

---

## 📄 Pages

- **`src/app/business/[id]/review/page.tsx`** - Write/edit review page

---

## 🗄️ Database Migrations

### Schema
- **`src/app/lib/migrations/003_reviews/001_reviews-schema.sql`** - Reviews table schema
- **`src/app/lib/migrations/003_reviews/002_review-images-storage.sql`** - Review images storage setup
- **`src/app/lib/migrations/003_reviews/002_fix-reviews-foreign-key.sql`** - Fix foreign keys
- **`src/app/lib/migrations/003_reviews/006_review-helpful-votes.sql`** - Helpful votes schema

### Supabase Migrations
- **`supabase/migrations/create_review_helpful_votes.sql`** - Helpful votes table
- **`supabase/migrations/create_review_replies.sql`** - Review replies table
- **`supabase/migrations/create_review_flags.sql`** - Review flags/reports table
- **`supabase/migrations/add_review_helpful_votes_profiles_fkey.sql`** - Foreign key for helpful votes
- **`supabase/migrations/add_review_replies_profiles_fkey.sql`** - Foreign key for replies

---

## 🧪 Tests

### Unit Tests
- **`__tests__/api/reviews.test.ts`** - Review API tests
- **`__tests__/api/review-replies-route.test.ts`** - Review replies API tests
- **`__tests__/components/ReviewCard.test.tsx`** - Review card component tests

### Integration Tests
- **`__tests__/integration/review-flow.test.tsx`** - Review flow integration tests

### E2E Tests
- **`e2e/review-flow.spec.ts`** - End-to-end review flow tests
- **`e2e/business-owner-review-response.spec.ts`** - Business owner reply tests

### Test Utilities
- **`__test-utils__/factories/reviewFactory.ts`** - Review factory for tests

---

## 📚 Documentation

- **`docs/02_architecture/BACKEND_REVIEWER_FEATURES.md`** - Backend reviewer features documentation
- **`docs/03_features/REVIEW_FORM_IMPLEMENTATION.md`** - Review form implementation docs
- **`docs/03_features/REVIEW_SUBMISSION_FIX.md`** - Review submission fixes
- **`e2e/README-business-owner-reviews.md`** - Business owner reviews documentation

---

## 🔑 Key Files Summary

### Most Important Files:
1. **`src/app/api/reviews/route.ts`** - Main API for creating/getting reviews
2. **`src/app/api/reviews/[id]/route.ts`** - Update/delete review API
3. **`src/app/components/Reviews/ReviewCard.tsx`** - Review display component
4. **`src/app/components/ReviewForm/ReviewForm.tsx`** - Review form component
5. **`src/app/hooks/useReviews.ts`** - Review data management hook
6. **`src/app/lib/services/reviewService.ts`** - Review service layer
7. **`src/app/business/[id]/review/page.tsx`** - Write review page

### Related Tables:
- `reviews` - Main reviews table
- `review_images` - Review images storage references
- `review_helpful_votes` - Helpful votes on reviews
- `review_replies` - Business owner replies to reviews
- `review_flags` - Reported/flagged reviews

