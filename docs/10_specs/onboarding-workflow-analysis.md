# Onboarding Workflow Analysis

## Overview
The onboarding workflow is a multi-step process that guides new users through account setup, interest selection, subcategory selection, and deal-breaker configuration. The workflow is designed to collect user preferences for personalization while maintaining a smooth, progressive user experience.

## Workflow Steps

### 1. **Landing Page (`/onboarding`)**
- **Purpose**: Initial entry point for new users
- **Access**: Public (no authentication required)
- **Features**:
  - Welcome carousel with onboarding images
  - "Get Started" button → `/register`
  - "Log in" button → `/login`
- **State**: No user data collected

### 2. **Registration/Login (`/register`, `/login`)**
- **Purpose**: User authentication
- **Access**: Public
- **Requirements**: 
  - Email and password for registration
  - Email verification required before proceeding
- **Post-Auth Flow**: 
  - Redirects to `/interests` after successful login/registration
  - Email verification check via `EmailVerificationGuard`

### 3. **Interests Selection (`/interests`)**
- **Purpose**: Collect user's main interest categories
- **Access**: Protected (requires authentication + email verification)
- **Validation**:
  - Minimum: 3 interests required
  - Maximum: 6 interests allowed
- **Data Collection**:
  - Selected interests stored in `localStorage` (key: `onboarding_interests`)
  - State managed via `OnboardingContext`
  - **NOT saved to database** until final step
- **Navigation**:
  - Next button → `/subcategories?interests={selectedIds}`
  - Passes selected interests as URL parameters
- **Features**:
  - Prefetching of next page for performance
  - Toast notifications for selection milestones
  - Analytics tracking (first selection, minimum reached)

### 4. **Subcategories Selection (`/subcategories`)**
- **Purpose**: Collect specific subcategories within selected interests
- **Access**: Protected (requires authentication)
- **Validation**:
  - Minimum: 1 subcategory required
  - Maximum: 10 subcategories allowed
- **Data Collection**:
  - Selected subcategories stored in `localStorage` (key: `onboarding_subcategories`)
  - State managed via `OnboardingContext`
  - **NOT saved to database** until final step
- **Navigation**:
  - Receives interests from URL params: `?interests={ids}`
  - Next button → `/deal-breakers?interests={ids}&subcategories={ids}`
  - Passes both interests and subcategories as URL parameters
- **Features**:
  - Dynamic loading of subcategories based on selected interests
  - Grouped display by parent interest category
  - Fallback handling if no interests provided

### 5. **Deal-Breakers Selection (`/deal-breakers`)**
- **Purpose**: Collect user's deal-breaker preferences
- **Access**: Protected (requires authentication)
- **Validation**:
  - Minimum: 1 deal-breaker required (but UI suggests 2-3)
  - Maximum: 3 deal-breakers allowed
- **Data Collection**:
  - Selected deal-breakers stored in `localStorage` (key: `onboarding_dealbreakers`)
  - State managed via `OnboardingContext`
- **Critical Action**: 
  - **SAVES ALL DATA** to database via `/api/user/onboarding` endpoint
  - Uses atomic transaction (`complete_onboarding_atomic` RPC) with fallback
  - Saves: interests, subcategories, deal-breakers
  - Updates profile: `onboarding_step = 'complete'`, `onboarding_complete = true`
- **Navigation**:
  - Receives interests and subcategories from URL params
  - Next button → `/complete` (after saving)
- **Error Handling**:
  - Proceeds to complete page even if save fails (graceful degradation)
  - Logs errors but doesn't block user flow

### 6. **Completion Page (`/complete`)**
- **Purpose**: Celebration and confirmation
- **Access**: Protected (requires authentication)
- **Features**:
  - Confetti animation (respects reduced motion preferences)
  - Success message and visual feedback
  - Auto-redirect to `/home` after 2 seconds
  - Manual "Continue to Home" button
- **State**: User profile now marked as `onboarding_complete = true`

## Data Flow

### State Management Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  OnboardingContext                       │
│  - Manages all onboarding state (interests, subcats,     │
│    dealbreakers)                                         │
│  - Persists to localStorage for recovery                │
│  - Provides actions: nextStep(), completeOnboarding()    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Individual Page Components                  │
│  - /interests, /subcategories, /deal-breakers           │
│  - Use OnboardingContext hooks                          │
│  - Handle UI interactions and validation                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              API Endpoint (/api/user/onboarding)         │
│  - POST: Saves all data atomically                      │
│  - Uses Supabase RPC: complete_onboarding_atomic        │
│  - Fallback to individual RPCs if atomic fails          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Database                      │
│  - user_interests table                                 │
│  - user_subcategories table                             │
│  - user_dealbreakers table                              │
│  - profiles table (onboarding_step, onboarding_complete)│
└─────────────────────────────────────────────────────────┘
```

### Data Persistence Strategy

**During Flow (Steps 1-4)**:
- Data stored in **localStorage** only
- No database writes until final step
- Allows users to navigate back/forward without losing selections
- Enables recovery if user closes browser

**Final Step (Step 5)**:
- All data saved atomically to database
- localStorage cleared after successful save
- Profile updated with completion status

## Route Protection & Guards

### OnboardingGuard Component
- **Location**: Wraps onboarding routes
- **Responsibilities**:
  - Prevents completed users from accessing onboarding routes
  - Redirects unauthenticated users to `/onboarding`
  - Validates step prerequisites (e.g., can't access subcategories without interests)
  - Checks email verification status

### ProtectedRoute Component
- **Usage**: Wraps individual onboarding pages
- **Configuration**:
  - `requiresAuth={true}`: All onboarding steps require authentication
  - `requiresOnboarding={false}`: Onboarding steps don't require completed onboarding
  - `allowedOnboardingSteps`: Not used for onboarding pages

### Middleware Protection
- **File**: `src/middleware.ts`
- **Logic**:
  - Redirects completed users away from onboarding routes (except `/complete`)
  - Redirects unauthenticated users from protected routes to `/onboarding`
  - Checks `onboarding_step` in profile to determine redirects

## API Implementation

### Endpoint: `/api/user/onboarding`

#### POST Request
```typescript
{
  step: 'complete' | 'interests' | 'subcategories' | 'deal-breakers',
  interests: string[],
  subcategories: Array<{ subcategory_id: string, interest_id: string }>,
  dealbreakers: string[]
}
```

#### Processing Logic

1. **Atomic Completion** (preferred):
   - Calls `complete_onboarding_atomic` RPC function
   - Single transaction for all data
   - Updates profile in same transaction

2. **Fallback** (if atomic fails):
   - Individual RPC calls:
     - `replace_user_interests`
     - `replace_user_subcategories`
     - `replace_user_dealbreakers`
   - Manual profile update

3. **Response**:
   - Success: `{ success: true, message: '...' }`
   - Error: `{ error: '...' }` with appropriate status code

#### GET Request
- Retrieves user's current onboarding data
- Returns: `{ interests, subcategories, dealbreakers }`
- Used for resuming incomplete onboarding

## Key Design Decisions

### 1. **Deferred Persistence**
- **Why**: Reduces database load, allows flexible navigation
- **Trade-off**: Data lost if user closes browser before completion
- **Mitigation**: localStorage backup

### 2. **URL Parameter Passing**
- **Why**: Enables direct navigation between steps
- **Implementation**: Interests and subcategories passed via query params
- **Benefit**: Can bookmark/share specific step states

### 3. **Atomic Transaction**
- **Why**: Ensures data consistency
- **Implementation**: Single RPC call for all data
- **Fallback**: Individual operations if atomic function unavailable

### 4. **Graceful Error Handling**
- **Why**: Don't block user experience on save failures
- **Implementation**: Proceeds to complete page even if save fails
- **Trade-off**: May require retry mechanism

### 5. **Progressive Enhancement**
- **Why**: Better UX with immediate feedback
- **Features**: 
  - Prefetching next pages
  - Toast notifications
  - Loading states
  - Animation feedback

## Validation Rules

| Step | Minimum | Maximum | Required |
|------|---------|---------|----------|
| Interests | 3 | 6 | Yes |
| Subcategories | 1 | 10 | Yes |
| Deal-breakers | 1 | 3 | Yes (UI suggests 2-3) |

## User Experience Features

### 1. **Visual Feedback**
- Toast notifications for milestones
- Selection animations
- Progress indicators
- Loading states

### 2. **Performance Optimizations**
- Page prefetching
- Lazy loading of subcategories
- Optimistic UI updates

### 3. **Accessibility**
- Reduced motion support
- ARIA labels
- Keyboard navigation
- Screen reader support

### 4. **Error Recovery**
- localStorage persistence
- Graceful degradation on API failures
- Clear error messages

## Edge Cases & Error Scenarios

### 1. **User Closes Browser Mid-Flow**
- **Handling**: Data in localStorage, can resume
- **Limitation**: No server-side recovery

### 2. **API Failure on Final Step**
- **Handling**: Proceeds to complete page, logs error
- **Issue**: Data may not be saved
- **Recommendation**: Add retry mechanism

### 3. **Email Not Verified**
- **Handling**: `EmailVerificationGuard` blocks access
- **Redirect**: To `/verify-email` page

### 4. **Already Completed User**
- **Handling**: Middleware/guards redirect to `/home`
- **Exception**: `/complete` page allowed for celebration

### 5. **Missing Prerequisites**
- **Handling**: Guards redirect to appropriate step
- **Example**: Can't access subcategories without interests

## Potential Improvements

### 1. **Data Recovery**
- Add server-side session storage
- Implement auto-save during flow
- Add "Resume onboarding" feature

### 2. **Error Handling**
- Add retry mechanism for failed saves
- Show user-friendly error messages
- Implement offline support

### 3. **Analytics**
- Track drop-off points
- Measure completion time
- A/B test different flows

### 4. **Validation**
- Add real-time validation feedback
- Show selection counts more prominently
- Add "Recommended" suggestions

### 5. **Performance**
- Implement service worker for offline support
- Add skeleton loading states
- Optimize image loading

## Testing Considerations

### Unit Tests
- OnboardingContext state management
- Validation logic
- Navigation helpers

### Integration Tests
- API endpoint functionality
- Database operations
- Route protection

### E2E Tests
- Complete flow from start to finish
- Error scenarios
- Edge cases (browser close, network failure)

## Security Considerations

1. **Authentication**: All steps require valid session
2. **Authorization**: Users can only modify their own data
3. **Input Validation**: Server-side validation of all inputs
4. **SQL Injection**: Using parameterized RPC calls
5. **XSS**: React's built-in XSS protection

## Database Schema

### Tables

#### `user_interests`
```sql
CREATE TABLE user_interests (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, interest_id)
);
```
- **Purpose**: Stores user's selected interest categories
- **RLS**: Users can only manage their own interests
- **Operations**: Replaced entirely on each save (via `replace_user_interests` RPC)

#### `user_subcategories`
```sql
CREATE TABLE user_subcategories (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subcategory_id TEXT NOT NULL,
  interest_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, subcategory_id)
);
```
- **Purpose**: Stores user's selected subcategories with parent interest reference
- **RLS**: Users can only manage their own subcategories
- **Operations**: Replaced entirely on each save (via `replace_user_subcategories` RPC)
- **Note**: Includes `interest_id` to maintain relationship with parent interest

#### `user_dealbreakers`
```sql
CREATE TABLE user_dealbreakers (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dealbreaker_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, dealbreaker_id)
);
```
- **Purpose**: Stores user's deal-breaker preferences
- **RLS**: Users can only manage their own deal-breakers
- **Operations**: Replaced entirely on each save (via `replace_user_dealbreakers` RPC)

#### `profiles` (onboarding fields)
```typescript
{
  onboarding_step: string,        // 'interests' | 'subcategories' | 'deal-breakers' | 'complete'
  onboarding_complete: boolean,   // true when onboarding is finished
  // ... other profile fields
}
```
- **Purpose**: Tracks onboarding progress and completion status
- **Updates**: Set to `'complete'` and `true` when onboarding finishes

### Database Functions (RPC)

#### `complete_onboarding_atomic`
- **Purpose**: Single atomic transaction to save all onboarding data
- **Parameters**:
  - `p_user_id`: UUID
  - `p_interest_ids`: TEXT[]
  - `p_subcategory_data`: JSONB[] (array of `{subcategory_id, interest_id}`)
  - `p_dealbreaker_ids`: TEXT[]
- **Operations**:
  1. Deletes existing user data from all three tables
  2. Inserts new interests
  3. Inserts new subcategories
  4. Inserts new deal-breakers
  5. Updates profile with completion status
- **Fallback**: If this function doesn't exist, individual RPCs are called

#### `replace_user_interests`
- **Purpose**: Replace all user interests
- **Parameters**: `p_user_id`, `p_interest_ids[]`
- **Operation**: DELETE existing, INSERT new

#### `replace_user_subcategories`
- **Purpose**: Replace all user subcategories
- **Parameters**: `p_user_id`, `p_subcategory_data[]` (JSONB array)
- **Operation**: DELETE existing, INSERT new

#### `replace_user_dealbreakers`
- **Purpose**: Replace all user deal-breakers
- **Parameters**: `p_user_id`, `p_dealbreaker_ids[]`
- **Operation**: DELETE existing, INSERT new

### Row Level Security (RLS)

All three user preference tables have RLS enabled with policies:
- **Policy**: "Users can manage their own [interests/subcategories/dealbreakers]"
- **Rule**: `auth.uid() = user_id`
- **Effect**: Users can only read/write their own data

## Conclusion

The onboarding workflow is well-structured with clear separation of concerns, progressive data collection, and user-friendly design. The deferred persistence strategy balances performance with data safety, while the atomic transaction ensures data consistency. The main areas for improvement are error recovery and offline support.

### Key Strengths
1. **Progressive Enhancement**: Data collected incrementally with immediate feedback
2. **Data Safety**: Atomic transactions ensure consistency
3. **User Experience**: Smooth navigation with localStorage backup
4. **Security**: RLS policies protect user data
5. **Flexibility**: URL parameter passing enables direct navigation

### Areas for Enhancement
1. **Error Recovery**: Add retry mechanism for failed saves
2. **Offline Support**: Service worker for offline capability
3. **Analytics**: Track drop-off points and completion rates
4. **Resume Flow**: Allow users to resume incomplete onboarding
5. **Validation**: More robust client and server-side validation

