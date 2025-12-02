# User Profile Enhancements - Implementation Summary

## Overview

This implementation adds comprehensive user profile enhancements to the review platform, including extended profile data, statistics, activity feeds, and preferences management.

## Database Migration

**File:** `supabase/migrations/20250102_add_profile_enhancements.sql`

### New Columns Added to `profiles` table:
- `bio` (TEXT) - User biography (max 2000 characters)
- `location` (TEXT) - User location
- `website_url` (TEXT) - User website URL (validated)
- `social_links` (JSONB) - Social media links object
- `privacy_settings` (JSONB) - Privacy preferences
- `last_active_at` (TIMESTAMPTZ) - Last activity timestamp

### Features:
- Constraints for data validation (URL format, bio length)
- Indexes for performance
- Trigger to auto-update `last_active_at` on profile updates
- Default values for JSONB fields

## API Endpoints

All endpoints follow the consistent `{ data, error }` response pattern and require authentication.

### 1. GET /api/user/profile
**Purpose:** Get current user's full profile

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "username": "string",
    "display_name": "string",
    "avatar_url": "string",
    "bio": "string",
    "location": "string",
    "website_url": "string",
    "social_links": {
      "instagram": "url",
      "x": "url",
      "tiktok": "url"
    },
    "privacy_settings": {
      "showActivity": true,
      "showStats": true,
      "showSavedBusinesses": false
    },
    "created_at": "timestamp",
    "last_active_at": "timestamp"
  },
  "error": null
}
```

### 2. PUT /api/user/profile
**Purpose:** Update user profile fields

**Request Body:**
```json
{
  "bio": "string (max 2000 chars)",
  "location": "string",
  "website_url": "string (valid URL)",
  "social_links": {
    "instagram": "url",
    "x": "url"
  }
}
```

**Response:** Updated profile object

### 3. PUT /api/user/preferences
**Purpose:** Update user preferences (interests, deal-breakers, privacy settings)

**Request Body:**
```json
{
  "interests": ["interest_id_1", "interest_id_2"],
  "dealBreakers": ["dealbreaker_id_1"],
  "privacy_settings": {
    "showActivity": true,
    "showStats": false,
    "showSavedBusinesses": true
  }
}
```

**Response:** Updated preferences object

### 4. GET /api/user/stats
**Purpose:** Get user statistics

**Response:**
```json
{
  "data": {
    "totalReviewsWritten": 12,
    "totalHelpfulVotesGiven": 34,
    "totalBusinessesSaved": 7,
    "accountCreationDate": "2024-03-10T12:34:56.000Z",
    "lastActiveDate": "2025-12-02T06:30:00.000Z",
    "helpfulVotesReceived": 89
  },
  "error": null
}
```

### 5. GET /api/user/activity
**Purpose:** Get paginated user activity feed

**Query Parameters:**
- `page` (default: 1)
- `pageSize` (default: 20, max: 100)

**Response:**
```json
{
  "data": {
    "data": [
      {
        "id": "review-uuid",
        "type": "REVIEW",
        "createdAt": "timestamp",
        "metadata": {
          "businessId": "uuid",
          "businessName": "string",
          "rating": 5,
          "reviewSnippet": "string"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "totalPages": 3,
      "hasMore": true
    }
  },
  "error": null
}
```

**Activity Types:**
- `REVIEW` - Review written
- `SAVE` - Business saved
- `HELPFUL_VOTE` - Helpful vote given

### 6. GET /api/user/reviews
**Purpose:** Get paginated list of user reviews

**Query Parameters:**
- `page` (default: 1)
- `pageSize` (default: 10, max: 100)

**Response:**
```json
{
  "data": {
    "data": [
      {
        "id": "uuid",
        "business_id": "uuid",
        "rating": 5,
        "title": "string",
        "body": "string",
        "created_at": "timestamp",
        "helpful_count": 10,
        "business": {
          "id": "uuid",
          "name": "string",
          "slug": "string",
          "image_url": "string"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 25,
      "totalPages": 3,
      "hasMore": true
    }
  },
  "error": null
}
```

## Type Definitions

**File:** `src/app/lib/types/user.ts`

Key types:
- `EnhancedProfile` - Full profile with enhancements
- `UserStats` - User statistics
- `UserActivityItem` - Activity feed item
- `UserReview` - Review with business info
- `PrivacySettings` - Privacy preferences
- `SocialLinks` - Social media links
- `ApiResponse<T>` - Standard API response wrapper
- `PaginatedResponse<T>` - Paginated response wrapper

## Service Layer

**File:** `src/app/lib/services/userService.ts`

### Functions:
- `getCurrentUserId()` - Get authenticated user ID
- `updateLastActive()` - Update last active timestamp
- `getUserProfile()` - Get full user profile
- `updateUserProfile()` - Update profile fields
- `getUserStats()` - Calculate user statistics
- `getUserActivity()` - Get activity feed
- `getUserReviews()` - Get user reviews

## Validation

**File:** `src/app/lib/utils/validation.ts`

### Functions:
- `isValidUrl()` - Validate URL format
- `isValidBio()` - Validate bio length
- `isValidSocialLinks()` - Validate social links
- `validateProfileUpdate()` - Validate profile update payload

## Error Handling

All endpoints return consistent error responses:
```json
{
  "data": null,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE"
  }
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Validation error
- `401` - Unauthorized
- `404` - Not found
- `500` - Internal server error

## Last Active Tracking

The `last_active_at` field is automatically updated when users:
- Get their profile (`GET /api/user/profile`)
- Get their stats (`GET /api/user/stats`)
- Get their activity (`GET /api/user/activity`)
- Get their reviews (`GET /api/user/reviews`)
- Update their profile or preferences

## Privacy Settings

Privacy settings control what information is visible to others:
- `showActivity` - Show activity feed
- `showStats` - Show statistics
- `showSavedBusinesses` - Show saved businesses

Currently, all endpoints return full data for the current user. The structure is designed to easily filter data when viewing other users' profiles in the future.

## Database Tables Used

- `profiles` - User profiles
- `reviews` - User reviews
- `review_helpful_votes` - Helpful votes
- `saved_businesses` - Saved businesses
- `user_interests` - User interests
- `user_subcategories` - User subcategories
- `user_dealbreakers` - User deal-breakers

## Next Steps

1. Run the migration: `supabase/migrations/20250102_add_profile_enhancements.sql`
2. Test each endpoint with authenticated requests
3. Update frontend components to use the new endpoints
4. Consider adding public profile endpoints for viewing other users' profiles (with privacy filtering)

