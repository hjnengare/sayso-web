# Backend Implementation Plan - User Features Focus

This document outlines all backend work required for user-facing features that need immediate attention. Business-related features are excluded and will be handled separately.

## 🎯 Critical Missing User Features

### 1. Review Helpful Votes ⚠️ INCOMPLETE
**Status:** Partially implemented (UI exists, backend incomplete)  
**Priority:** HIGH  
**Location:** `src/app/components/Reviews/ReviewCard.tsx` has helpful button

**Required Endpoints:**
- `POST /api/reviews/[id]/helpful` - Mark review as helpful (vote)
- `DELETE /api/reviews/[id]/helpful` - Remove helpful vote
- `GET /api/reviews/[id]/helpful` - Check if current user marked helpful
- `GET /api/reviews/[id]/helpful/count` - Get helpful vote count

**Database Schema:**
```sql
CREATE TABLE review_helpful_votes (
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);

CREATE INDEX idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);
CREATE INDEX idx_review_helpful_votes_user_id ON review_helpful_votes(user_id);
```

**Implementation:**
- Prevent duplicate votes (enforced by primary key)
- Update review helpful count in real-time
- Return vote status with review data
- Handle vote removal gracefully

---

### 2. Review Update/Delete ✅ COMPLETE
**Status:** Fully implemented with proper validation and sanitization  
**Priority:** HIGH  
**Location:** `src/app/api/reviews/[id]/route.ts` and `src/app/api/reviews/[id]/images/route.ts`

**Implemented Endpoints:**
- ✅ `PUT /api/reviews/[id]` - Update review (owner only)
- ✅ `DELETE /api/reviews/[id]` - Delete review (owner only)
- ✅ `PUT /api/reviews/[id]/images` - Update review images (add, replace, remove)

**Validation:**
- ✅ Verify user owns the review before allowing edit/delete
- ✅ Validate content length (10-5000 characters) using `ReviewValidator`
- ✅ Sanitize input to prevent XSS using `sanitizeText` function
- ✅ Validate image uploads (type: jpeg, jpg, png, webp; size: max 5MB; max 10 images)

**Implementation Details:**
- ✅ Update review content, rating, tags with proper validation
- ✅ Handle image replacement/removal with storage cleanup
- ✅ Recalculate business statistics after changes (always recalculates, not just on rating change)
- ✅ Delete cascades to review_images, review_helpful_votes, and review_replies
- ✅ Proper error handling and rollback for failed image uploads

---

### 3. Review Flagging System ✅ COMPLETE
**Status:** Fully implemented with rate limiting and auto-hide logic  
**Priority:** MEDIUM-HIGH  
**Location:** `src/app/api/reviews/[id]/flag/route.ts` and `supabase/migrations/create_review_flags.sql`

**Implemented Endpoints:**
- ✅ `POST /api/reviews/[id]/flag` - Flag inappropriate review
- ✅ `GET /api/reviews/[id]/flag/status` - Check if user flagged this review
- ✅ `DELETE /api/reviews/[id]/flag` - Remove flag (if user changes mind)

**Database Schema:**
- ✅ `review_flags` table created with all required fields
- ✅ RLS policies for user and admin access
- ✅ Indexes for performance optimization
- ✅ Auto-update trigger for `updated_at` timestamp

**Flag Reasons (Validated):**
- ✅ `spam` - Spam or fake review
- ✅ `inappropriate` - Inappropriate content
- ✅ `harassment` - Harassment or hate speech
- ✅ `off_topic` - Off-topic content
- ✅ `other` - Other (requires details)

**Implementation Details:**
- ✅ Prevent duplicate flags from same user (UNIQUE constraint)
- ✅ Rate limiting (max 10 flags per hour per user) via `FlagRateLimiter`
- ✅ Auto-hide detection when threshold reached (5 flags)
- ✅ Users cannot flag their own reviews
- ✅ Only pending flags can be removed (reviewed flags are locked)
- ✅ Comprehensive error handling and validation
- ⚠️ **Note:** Auto-hide requires adding `moderation_status` column to reviews table or creating RPC function `auto_hide_review` for full functionality

---

### 4. Saved/Bookmarked Businesses 🔖 MISSING
**Status:** Frontend context exists (`SavedItemsContext`) but no backend  
**Priority:** MEDIUM-HIGH  
**Location:** `src/app/contexts/SavedItemsContext.tsx`

**Required Endpoints:**
- `POST /api/saved/businesses` - Save business to user's list
- `DELETE /api/saved/businesses/[id]` - Remove business from saved list
- `GET /api/saved/businesses` - List user's saved businesses (paginated)
- `GET /api/saved/businesses/[id]` - Check if business is saved
- `GET /api/saved/businesses/count` - Get count of saved businesses

**Database Schema:**
```sql
CREATE TABLE saved_businesses (
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT, -- Optional user notes about why they saved it
  PRIMARY KEY (user_id, business_id)
);

CREATE INDEX idx_saved_businesses_user_id ON saved_businesses(user_id);
CREATE INDEX idx_saved_businesses_business_id ON saved_businesses(business_id);
CREATE INDEX idx_saved_businesses_created_at ON saved_businesses(created_at DESC);
```

**Implementation:**
- Return saved businesses with full business data
- Support pagination (20 per page)
- Include business stats (rating, review count)
- Sort by saved date (newest first) or alphabetically
- Return saved status with business listings

---

### 5. User Profile Enhancements 👤 PARTIAL
**Status:** Basic profile exists, needs enhancements  
**Priority:** MEDIUM

**Required Endpoints:**
- `GET /api/user/profile` - Get current user's full profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/stats` - Get user statistics (reviews written, helpful votes given, etc.)
- `GET /api/user/activity` - Get user activity feed (reviews, saves, etc.)
- `PUT /api/user/preferences` - Update user preferences (interests, deal-breakers)
- `GET /api/user/reviews` - Get all reviews by user (paginated)

**Database Schema Updates:**
```sql
-- Add to profiles table if not exists:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_settings JSONB;
```

**User Stats to Track:**
- Total reviews written
- Total helpful votes given
- Total businesses saved
- Account creation date
- Last active date
- Review helpful votes received (on user's reviews)

---

### 6. Enhanced Search & Filtering 🔍 PARTIAL
**Status:** Basic search exists  
**Priority:** MEDIUM

**Missing Features:**
- Distance-based search (requires user location)
- Advanced sorting (by distance, price, rating combo)
- Full-text search improvements
- Search history for users
- Saved searches

**Endpoints:**
- Enhance `GET /api/businesses` with:
  - `lat`, `lng` query params for location-based search
  - `radius_km` for distance filter
  - Better text search ranking
  - Search result highlighting

**Database Schema:**
```sql
CREATE TABLE user_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  filters JSONB,
  result_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_search_history_user_id ON user_search_history(user_id, created_at DESC);
```

---

## 🛠️ Backend Infrastructure Improvements

### 7. Rate Limiting ⚠️ PARTIAL
**Status:** Basic rate limiting exists for auth  
**Priority:** HIGH

**Required:**
- Comprehensive rate limiting on all public endpoints
- Per-user rate limits for authenticated endpoints
- IP-based rate limiting for public endpoints
- Rate limit headers in responses
- Error handling for rate limit exceeded

**Endpoints to Protect:**
- `/api/reviews` - Limit review submissions (10/hour per user)
- `/api/reviews/[id]/helpful` - Prevent vote manipulation (50/hour per user)
- `/api/reviews/[id]/flag` - Limit flagging (10/hour per user)
- `/api/saved/businesses` - Limit saves (100/hour per user)
- All search endpoints - Limit searches (100/hour per IP)

**Implementation:**
- Use existing `rateLimiting.ts` utilities
- Add rate limit middleware to all routes
- Return `429 Too Many Requests` with retry-after header
- Log rate limit violations for monitoring

---

### 8. Input Validation & Sanitization ✅ PARTIAL
**Status:** Basic validation exists  
**Priority:** HIGH

**Required:**
- Zod schema validation for all API endpoints
- SQL injection prevention (Supabase handles this, but verify)
- XSS prevention in text inputs
- File upload validation (type, size limits)
- Email format validation
- Phone number validation
- URL validation for profile links

**Validation Schemas Needed:**
```typescript
// Review validation
const ReviewSchema = z.object({
  content: z.string().min(10).max(5000),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// Profile update validation
const ProfileUpdateSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  website_url: z.string().url().optional(),
  location: z.string().max(200).optional(),
});
```

---

### 9. Error Handling & Logging 📊 MISSING
**Status:** Console.log used throughout  
**Priority:** MEDIUM

**Required:**
- Structured logging system (Winston/Pino)
- Error tracking (Sentry)
- Request/response logging middleware
- Error notification system
- Remove all `console.log` statements (362 instances found)

**Implementation:**
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// Usage in API routes
logger.info({ userId, action: 'review_created' }, 'Review created');
logger.error({ error, userId }, 'Failed to create review');
```

**Error Response Standard:**
```typescript
{
  success: false,
  error: {
    code: 'REVIEW_NOT_FOUND',
    message: 'Review not found',
    details?: any
  }
}
```

---

### 10. Database Functions & Triggers 🔧 PARTIAL
**Status:** Some RPC functions exist  
**Priority:** MEDIUM

**Check/Implement:**
- `complete_onboarding_atomic` - Verify exists and works
- Trigger for updating `updated_at` timestamps on user tables
- Function to calculate user review statistics
- Function to update helpful vote counts

**Missing Functions:**
```sql
-- Calculate user review stats
CREATE OR REPLACE FUNCTION get_user_review_stats(user_uuid UUID)
RETURNS TABLE (
  total_reviews INT,
  avg_rating NUMERIC,
  helpful_votes_received INT,
  total_helpful_votes_given INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT r.id)::INT as total_reviews,
    COALESCE(AVG(r.rating), 0)::NUMERIC(3,2) as avg_rating,
    COALESCE(SUM(rhv_count.count), 0)::INT as helpful_votes_received,
    COALESCE((
      SELECT COUNT(*)::INT 
      FROM review_helpful_votes rhv 
      WHERE rhv.user_id = user_uuid
    ), 0) as total_helpful_votes_given
  FROM reviews r
  LEFT JOIN (
    SELECT review_id, COUNT(*) as count
    FROM review_helpful_votes
    GROUP BY review_id
  ) rhv_count ON r.id = rhv_count.review_id
  WHERE r.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;
```

---

### 11. API Response Standardization 📐 MISSING
**Status:** Inconsistent response formats  
**Priority:** LOW-MEDIUM

**Required:**
- Standardize all API responses:
  ```typescript
  {
    success: boolean
    data?: any
    error?: {
      code: string
      message: string
      details?: any
    }
    message?: string
    meta?: { 
      pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
      timestamp: string
    }
  }
  ```
- Consistent error codes
- API versioning strategy (v1 prefix)

**Helper Function:**
```typescript
// lib/api-response.ts
export function successResponse(data: any, meta?: any) {
  return {
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  };
}

export function errorResponse(code: string, message: string, details?: any) {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}
```

---

## 🔐 Security Enhancements

### 12. Row Level Security (RLS) Audit 🔒 PARTIAL
**Status:** Some RLS policies exist  
**Priority:** HIGH

**Required:**
- Audit all user-related tables for proper RLS policies
- Ensure users can only edit their own data
- Ensure users can only see their own saved businesses
- Ensure users can only flag reviews (not delete)
- Test RLS policies in production-like environment

**Tables to Verify:**
- `profiles` - Users can only read/update their own profile
- `reviews` - Users can read all, but only update/delete their own
- `review_images` - Users can only manage images for their own reviews
- `review_helpful_votes` - Users can only manage their own votes
- `review_flags` - Users can only create flags, not see others' flags
- `saved_businesses` - Users can only see/manage their own saved businesses
- `user_interests` - Users can only manage their own interests
- `user_subcategories` - Users can only manage their own subcategories
- `user_dealbreakers` - Users can only manage their own deal-breakers
- `user_search_history` - Users can only see their own search history

**RLS Policy Examples:**
```sql
-- Users can only manage their own saved businesses
CREATE POLICY "Users can view their own saved businesses"
  ON saved_businesses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved businesses"
  ON saved_businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved businesses"
  ON saved_businesses FOR DELETE
  USING (auth.uid() = user_id);
```

---

### 13. API Authentication & Authorization 🔐 PARTIAL
**Status:** Basic auth exists  
**Priority:** HIGH

**Required:**
- Verify all protected endpoints check authentication
- Implement consistent auth middleware
- Proper error messages for unauthorized access
- Session validation on all protected routes

**Auth Middleware:**
```typescript
// lib/middleware/auth.ts
export async function requireAuth(request: Request) {
  const supabase = getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      errorResponse('UNAUTHORIZED', 'Authentication required'),
      { status: 401 }
    );
  }

  return { user, supabase };
}
```

---

## 📊 User Analytics & Monitoring

### 14. User Activity Tracking 📈 MISSING
**Status:** Not implemented  
**Priority:** LOW

**Required:**
- Track user engagement metrics
- User activity feed
- Review writing patterns
- Search behavior

**Endpoints:**
- `GET /api/user/activity` - Get user activity feed
- `GET /api/user/stats` - Get user statistics

**Database Schema:**
```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'review_created', 'business_saved', 'helpful_voted', etc.
  activity_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_id ON user_activity(user_id, created_at DESC);
```

---

## 🗄️ Database Schema Updates

### 15. Missing Tables ⚠️
**Priority:** HIGH

**Required:**
1. `review_helpful_votes` - User votes on reviews
2. `review_flags` - Flagged reviews for moderation
3. `saved_businesses` - User bookmarks
4. `user_search_history` - Search history tracking
5. `user_activity` - User activity feed (optional)

### 16. Index Optimization 🗂️
**Priority:** MEDIUM

**Check:**
- Review query performance for user-related queries
- Add indexes on frequently queried columns:
  - `reviews.user_id` - For user's reviews
  - `review_helpful_votes.user_id` - For user's votes
  - `saved_businesses.user_id` - For user's saved businesses
  - `profiles.user_id` - For profile lookups

---

## 🚀 Deployment & Production Readiness

### 17. Environment Configuration 🌍
**Priority:** HIGH

**Required:**
- Production environment variables
- Staging environment setup
- Secrets management
- Database connection pooling
- CDN configuration for images

### 18. Database Migrations 🗄️
**Priority:** HIGH

**Required:**
- Migration scripts for all new tables
- Rollback scripts
- Migration testing in staging
- Data migration for existing data (if any)

---

## 📝 Implementation Priority

### Phase 1: Critical (Week 1-2)
1. Review helpful votes backend
2. Review update/delete endpoints
3. Rate limiting on all endpoints
4. RLS policy audit and fixes
5. Input validation with Zod

### Phase 2: High Priority (Week 3-4)
6. Review flagging system
7. Saved/bookmarked businesses
8. User profile enhancements
9. Structured logging system
10. API response standardization

### Phase 3: Medium Priority (Week 5-6)
11. Email notification system (user-focused)
12. Enhanced search with location
13. User activity tracking
14. Database function optimizations
15. User analytics endpoints

### Phase 4: Nice to Have (Week 7-8)
16. Search history
17. Saved searches
18. Advanced user preferences
19. Notification system improvements

---

## ✅ Testing Requirements

### Unit Tests
- API endpoint tests
- Service layer tests
- Database function tests
- Validation schema tests

### Integration Tests
- Authentication flows
- Review creation and management
- Saved businesses workflow
- Review helpful votes
- Review flagging

### E2E Tests
- Complete user journeys
- Review writing and editing
- Saving and unsaving businesses
- User profile management

---

## 📚 Documentation Needed

- API endpoint documentation (OpenAPI/Swagger)
- Database schema documentation updates
- User feature documentation
- Testing guide

---

## 🔍 Code Quality

### Current Issues Found:
- 362 `console.log` statements need replacement
- Inconsistent error handling
- Missing TypeScript types in some places
- No API versioning
- Mixed client/server code in services (need to separate)

---

## 📊 Summary

**Total Missing User Features:** ~15 major backend features  
**Critical:** 5 features  
**High Priority:** 5 features  
**Medium Priority:** 4 features  
**Low Priority:** 1 feature  

**Estimated Timeline:** 4-6 weeks for full implementation with 1 developer  
**Risk Areas:** Security (RLS), Rate limiting, Data validation

**Note:** Business-related features (business claims, business owner management, admin approval workflows) are excluded from this plan and will be addressed separately.

---

## 🚨 **CRITICAL NOTE: Business Owner POV Not Implemented**

**Status:** The backend has been built primarily from the **user's perspective**. Business owner features are **NOT YET IMPLEMENTED**.

### **Missing Business Owner Features:**
- ❌ Business owner messaging (can only receive, cannot view/manage conversations)
- ❌ Business owner dashboard APIs
- ❌ Business owner notification system
- ❌ Business owner review management APIs
- ❌ Business owner analytics/statistics APIs
- ❌ Business owner profile/settings management

**What Exists:**
- ✅ `business_owners` and `business_ownership_requests` tables
- ✅ Basic ownership service (`businessOwnershipService.ts`)
- ✅ Frontend `/manage-business` page (but backend APIs incomplete)

**Priority:** Business owner features should be implemented as a separate phase after user-facing features are complete.

See `BACKEND_STATUS_SUMMARY.md` for complete details on what's implemented vs. what's missing.