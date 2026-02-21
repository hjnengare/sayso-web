# Role-Based Access Control Implementation Summary

## Overview
Implemented comprehensive role-based account type system that distinguishes between **Personal Users** and **Business Owners** with automatic redirects, access restrictions, and role-specific navigation.

## Architecture

### 1. **Account Type Model**
- Uses existing `role` column in `profiles` table
- Values: `'user'` (personal) | `'business_owner'` (business)
- Default: `'user'`
- Set during signup via auth metadata `accountType` parameter

### 2. **Type System Updates**
**File**: `src/app/lib/types/database.ts`
- Extended `Profile` interface with `role?: 'user' | 'business_owner' | 'admin'`
- Extended `SignUpData` interface with optional `accountType: 'user' | 'business_owner'`

### 3. **Database Migrations**
**File**: `supabase/migrations/20260120_update_handle_new_user_for_account_type.sql`
- Updated `handle_new_user()` trigger to read `accountType` from auth metadata
- Sets profile role during account creation based on signup selection
- Falls back to `'user'` if no account type specified

## Implementation Details

### 4. **Authentication Flows**

#### 4a. **Signup (Registration)**
**File**: `src/app/register/page.tsx`
- Added account type toggle UI: "Personal User" vs "Business Owner"
- Default: "Personal User"
- UI uses button-based selection with visual feedback
- Passes `accountType` to registration

**File**: `src/app/lib/auth.ts` (AuthService.signUp)
- Accepts optional `accountType` parameter
- Includes `accountType` in auth metadata during signup
- Defaults to `'user'` if not provided

**File**: `src/app/contexts/AuthContext.tsx` (register method)
- Accepts `accountType` parameter
- Passes to `AuthService.signUp`
- No duplicate auth flows - uses same signup for both types

#### 4b. **Login & Redirects**
**File**: `src/app/contexts/AuthContext.tsx` (login method)
- **Personal Users** (`role === 'user'`):
  - After verification → `/home`
  - During onboarding → Normal flow (`/interests`, `/subcategories`, `/deal-breakers`)
- **Business Owners** (`role === 'business_owner'`):
  - After verification → `/for-businesses`
  - If onboarding incomplete → `/for-businesses` (skip personal onboarding)

### 5. **Middleware Access Control**
**File**: `src/middleware.ts`

#### Profile Data Fetch
- Single DB read includes `role` column
- Avoids duplicate queries, uses cached data throughout middleware

#### Role-Based Route Enforcement
**Business-Only Routes** (require `role === 'business_owner'`):
- `/for-businesses`
- `/owners/*`
- `/business/[id]/edit`

**Personal Onboarding Routes** (blocked for business owners):
- `/interests`
- `/subcategories`
- `/deal-breakers`

**Personal User Routes** (blocked for business owners):
- `/for-you`
- `/profile` (shared, but personal-focused)
- `/saved`
- `/my-businesses` (personal user version)

#### Redirect Logic
- Business user accessing personal route → redirect to `/for-businesses`
- Personal user accessing business route → redirect to `/home`
- Unauthenticated → redirect to `/onboarding` or `/login?redirect=...`

### 6. **Navigation & UI**
**File**: `src/app/components/Header/Header.tsx`

#### Role-Aware Navigation
```typescript
const userRole = user?.profile?.role || 'user';
const isBusinessAccountUser = userRole === 'business_owner';
```

#### Menu Items by Role
**Business Users see:**
- `/for-businesses` - "For Businesses"
- `/my-businesses` - "My Businesses"
- `/profile` - "Profile"

**Personal Users see:**
- `/dm` - "Messages"
- `/saved` - "Saved"
- `/profile` - "Profile"

#### Features
- Conditional rendering based on `isBusinessAccountUser`
- Lock indicators for guest users
- Dynamic menu construction
- No cross-role visibility

## Flow Diagrams

### Personal User Flow
```
Register (accountType='user')
    ↓ [verify email]
    ↓ [email verified]
/interests (select interests)
    ↓
/subcategories (select subcategories)
    ↓
/deal-breakers (select deal-breakers)
    ↓
/complete (celebration)
    ↓
/home (main feed - accessible)
→ /for-you (personalized)
→ /trending
→ /profile
→ /saved
→ /dm (messages)
↛ /for-businesses (blocked → redirect to /home)
↛ /owners/* (blocked → redirect to /home)
```

### Business Owner Flow
```
Register (accountType='business_owner')
    ↓ [verify email]
    ↓ [email verified]
/for-businesses (claim/manage businesses)
→ /my-businesses (owned businesses)
→ /profile
↛ /interests (blocked → redirect to /for-businesses)
↛ /subcategories (blocked → redirect to /for-businesses)
↛ /deal-breakers (blocked → redirect to /for-businesses)
↛ /for-you (blocked → redirect to /for-businesses)
↛ /saved (blocked → redirect to /for-businesses)
```

## Security Considerations

### Multi-Layer Enforcement
1. **Auth Role Level** ✓
   - Roles set during signup in auth metadata
   - Profile role persists in database

2. **Route Guards/Middleware** ✓
   - Middleware enforces access at route level
   - Prevents direct URL navigation to restricted routes
   - Automatic redirects to appropriate dashboards

3. **UI Navigation Layer** ✓
   - Header conditionally shows/hides routes
   - Menu reflects user's account type
   - Users don't see inaccessible navigation

### No Duplicate Flows
- Single signup flow with role selection
- Single login flow with role-based redirects
- One authentication service for both account types
- Role determined at auth time, not post-signup

### RLS Policies
- Existing RLS policies continue to work
- Profile `role` field can be used in new policies
- Business access checks already in place (useRequireBusinessOwner hook)

## Key Files Modified

1. `src/app/lib/types/database.ts` - Type definitions
2. `src/app/lib/auth.ts` - Auth service signup
3. `src/app/contexts/AuthContext.tsx` - Auth context and flows
4. `src/middleware.ts` - Route protection and role enforcement
5. `src/app/components/Header/Header.tsx` - Role-aware navigation
6. `src/app/register/page.tsx` - Account type selection UI
7. `src/app/onboarding/page.tsx` - Updated auth links
8. `supabase/migrations/20260120_update_handle_new_user_for_account_type.sql` - DB trigger

## Testing Checklist

### Personal User Flow
- [ ] Sign up as personal user
- [ ] Receives email verification
- [ ] Completes onboarding steps
- [ ] Redirects to /home
- [ ] Can access /for-you, /trending, /profile, /saved
- [ ] Cannot access /for-businesses, /owners
- [ ] Blocked routes redirect to /home

### Business Owner Flow
- [ ] Sign up as business owner
- [ ] Receives email verification
- [ ] Redirects directly to /for-businesses (skips onboarding)
- [ ] Can access /my-businesses, /profile
- [ ] Cannot access /interests, /for-you, /saved
- [ ] Can claim/manage businesses
- [ ] Blocked routes redirect to /for-businesses

### Login Flows
- [ ] Personal user login → /home
- [ ] Business user login → /for-businesses
- [ ] Incomplete personal onboarding → next step
- [ ] Incomplete business onboarding → /for-businesses

### Navigation
- [ ] Personal user sees personal menu items
- [ ] Business user sees business menu items
- [ ] Header correctly hides role-inappropriate items
- [ ] No cross-role items visible

## Future Enhancements

1. **Role Switching**: Allow users to switch between personal/business modes
2. **Multi-Business Management**: Support multiple business accounts per user
3. **Team Management**: Allow business owners to add managers/staff
4. **Advanced RLS Policies**: Use role in sophisticated row-level security rules
5. **Role-Based Permissions**: Extend beyond user/business_owner to manager, staff roles

## Notes

- Onboarding page now shows generic "Sign Up" and "Log In" links (account type selected during signup)
- Migration will be applied when Supabase is updated
- No breaking changes to existing authentication
- Backward compatible - old users default to 'user' role
- All changes isolated to role-based features, no impact on existing functionality
