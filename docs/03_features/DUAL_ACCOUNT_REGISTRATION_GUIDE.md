# Dual-Account Registration System

## Overview
A single email address can register for **both** Personal and Business accounts independently. Each account type has isolated onboarding, permissions, and UX flows.

## Architecture

### Key Concepts
- **One auth.users row per email**: Supabase auth enforces one email = one auth account
- **One profiles row per user_id**: role field supports 'user', 'business_owner', or 'both'
- **current_role field**: Tracks which mode the user is actively in
- **Isolated flows**: Personal and Business have completely separate onboarding and routes

### User Registration Flows

#### Flow 1: New Email, First Account Type (Personal or Business)
```
1. User registers with new email + accountType (Personal)
2. AuthService.signUp() checks profiles table for email
3. Email not found → Proceed with Supabase auth.signUp()
4. auth.users row created
5. Trigger creates profiles row with role='user', current_role='user'
6. User sent to verify-email page
7. After email verification → Personal onboarding
```

#### Flow 2: Existing Email, Same Account Type (Block Duplicate)
```
1. User tries to register with existing email + same accountType
2. AuthService.signUp() checks profiles table
3. Found matching role='user' for 'user' registration
4. Return error: "Email already has Personal account. Please log in."
5. User directed to login page
```

#### Flow 3: Existing Email, Different Account Type (Upgrade Path)
```
1. User tries to register with existing email + different accountType (user email tries Business)
2. AuthService.signUp() checks profiles table
3. Found role='user', but accountType='business_owner'
4. Attempt Supabase auth.signUp() - FAILS (email already exists in auth.users)
5. Catch error and return: "Email already has Personal account. Log in to Settings to add Business."
6. User shown login button
7. User logs in with existing credentials
8. User goes to Settings/Profile → "Add Business Account"
9. Calls /api/auth/register-second-account-type with new accountType
10. Profile updated: role='both', current_role='business_owner'
11. User directed to appropriate onboarding for new role
```

#### Flow 4: Logged In User Adding Second Account Type
```
1. User is authenticated with role='user'
2. Navigates to Settings → "Add Business Account"
3. Calls /api/auth/register-second-account-type with accountType='business_owner'
4. API checks profile.role
5. If role !== 'both' and role !== requested type:
   - Update profile: role='both', current_role=accountType
   - Return success
6. User redirected to onboarding for new role
```

## Key Files

### Registration & Auth
- `src/app/lib/auth.ts` - AuthService.signUp() with dual-account logic
- `src/app/contexts/AuthContext.tsx` - register() method with error handling
- `src/app/register/page.tsx` - Registration UI with error messaging

### Profile Management
- `src/app/api/user/update-role/route.ts` - Switch active role (current_role)
- `src/app/api/auth/register-second-account-type/route.ts` - **NEW** Add second account type (role='both')

### OAuth Integration
- `src/app/auth/callback/route.ts` - Detects OAuth email with business tie-in → role selection gate
- `src/app/onboarding/select-account-type/page.tsx` - Role selection UI for OAuth users

### Middleware & Routing
- `src/middleware.ts` - Routes based on current_role (not role), blocks cross-role access
- Personal routes blocked for business users: /home, /for-you, /trending, /leaderboard, /saved, /profile
- Business routes blocked for personal users: /claim-business, /my-businesses

## Error Codes

| Code | Scenario | Message | User Action |
|------|----------|---------|------------|
| `duplicate_account_type` | Registering same type on same email | "Email already has Personal/Business account. Log in." | Redirect to login |
| `email_exists_can_add_account_type` | Registering different type on same email | "Email already has account. Log in and add second type in Settings." | Redirect to login |
| `email_already_exists` | (Deprecated - no longer used) | | |

## Role Values in Database

### `role` field (represents what accounts exist)
- `'user'` - Only Personal account
- `'business_owner'` - Only Business account  
- `'both'` - Both Personal and Business accounts
- `'admin'` - System admin

### `current_role` field (represents active mode)
- `'user'` - Currently in Personal mode
- `'business_owner'` - Currently in Business mode
- `null` - Not yet set (rare)

## Testing Scenarios

### ✅ Should Work
1. New email registers for Personal
2. New email registers for Business
3. Personal user logs in → can see personal routes
4. Business user logs in → can see business routes
5. Personal user with role='both' switches to Business mode via /api/user/switch-role
6. OAuth user with business tie-in sees role-selection gate → selects Business → goes to claim-business

### ❌ Should Fail
1. Register same email twice for Personal (blocked)
2. Personal user tries to access /claim-business (redirected to /home)
3. Business user tries to access /profile (redirected to /my-businesses)
4. User without verified email tries to onboard (redirected to /verify-email)

## Sequence Diagram: Dual Registration Flow

```
Personal User                 System                    Database
   |                            |                           |
   |-- Register (user) -------->|                           |
   |                            |-- Check profiles -------->|
   |                            |<-- Not found -------------|
   |                            |-- Create auth.users ------>|
   |                            |<-- Created --------------|
   |                            |-- Trigger creates ------->|
   |                            |   profiles (role='user')   |
   |                            |<-- Created --------------|
   |<-- Verify email page ------|                           |
   |-- Click verify link ------>|                           |
   |<-- Profile verified -------|                           |
   |<-- Interests onboarding -->|                           |
   |                            |                           |
   |-- [Later] Add Business ->|                           |
   |                            |-- Check profile -------->|
   |                            |<-- role='user' ---------|
   |                            |-- Update to 'both' ----->|
   |                            |<-- Updated --------------|
   |<-- Business onboarding -->|                           |
```

## Future Enhancements

1. **Settings page** to manage dual accounts
2. **Account type switcher** in header for users with role='both'
3. **Merge confirmations** when adding second account type
4. **Email preferences** per account type
5. **Admin panel** to view and manage dual-account users
