# Dual Account Architecture - Same Email for Personal & Business

## Overview

This document outlines the system architecture for allowing the same email address to be used for both Personal (User) and Business accounts completely independently.

**Example:**
- Jess can have a Personal account with `jess@gmail.com`
- The same email `jess@gmail.com` can create a Business account for her nail salon
- These are completely separate profiles with:
  - Different auth tokens
  - Independent permissions
  - Separate role contexts
  - Distinct data/profiles
  - No implicit linking

## Current Problem

**Current behavior (problematic):**
- Supabase `auth.users` table enforces email uniqueness at the auth layer
- One email = One `auth.users` record
- When a user registers, they get ONE user_id in auth.users
- The profiles table has a 1:1 relationship with auth.users via user_id
- This means one email can only have one identity in the system

**Why this is limiting:**
- If Jess registers as a Personal user with jess@gmail.com, her auth.users record is created
- If she later wants a Business account, she can't use the same email (Supabase blocks it)
- She'd have to use jess.business@gmail.com or a different email

## Solution Architecture

### 1. **Two Separate Supabase Auth Sessions (Recommended)**

The simplest, most secure approach is to use **two separate Supabase projects** or utilize Supabase's multi-tenant capability:

**Option A: Separate Supabase Projects**
- Personal Account Project: auth.users with role 'user'
- Business Account Project: auth.users with role 'business_owner'
- Same email can exist in both projects independently
- Two separate JWT tokens issued
- Clear separation of concerns

**Option B: Single Project with Custom Auth Logic**
- Use email + account_type as composite key
- Implement custom JWT claims to track account context
- Manage role switching via profiles table

### 2. **Modified Database Schema** (Option B Implementation)

Since you likely have a single project, here's the schema change:

#### Key Changes:

```sql
-- NEW: Create account_identities table to replace 1:1 user_id relationship
CREATE TABLE public.account_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL, -- Redundant copy for easier querying
  account_type TEXT NOT NULL CHECK (account_type IN ('personal', 'business')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One identity per email + account_type combination
  UNIQUE(email, account_type)
);

-- MODIFIED: profiles table now has account_identities instead of direct user_id
ALTER TABLE public.profiles 
  DROP CONSTRAINT profiles_pkey,
  ADD COLUMN account_identity_id UUID REFERENCES public.account_identities(id) ON DELETE CASCADE,
  ADD PRIMARY KEY (account_identity_id);
  -- Keep user_id for backward compatibility, add account_type column
  ADD COLUMN account_type TEXT CHECK (account_type IN ('personal', 'business')) DEFAULT 'personal';
```

#### Impact on Existing Tables:

1. **reviews** table:
   - Add `account_identity_id UUID` (new primary identity reference)
   - Keep `user_id` for backward compatibility
   - Ensure reviews are tied to account_identity, not just user_id

2. **businesses** table:
   - Existing `owner_id` continues to work (references auth.users)
   - No change needed initially (businesses are created by business accounts)

3. **saved_businesses** table:
   - Add `account_identity_id` column
   - Keep user_id for now
   - Ensure saves are per account identity

### 3. **Authentication Flow**

#### Personal Account Registration:
```
1. User enters email + password + username
2. Check: Does account_identities have this (email, 'personal')?
   - If YES: Reject (personal account already exists)
   - If NO: Continue
3. Create auth.users record (Supabase handles uniqueness)
4. Create account_identities row: (auth_user_id, email, 'personal')
5. Create profiles row: (account_identity_id, account_type='personal', ...)
6. Return JWT with personal account context
```

#### Business Account Registration (Same Email):
```
1. User enters email + password + username
2. Check: Does account_identities have this (email, 'business')?
   - If YES: Reject (business account already exists)
   - If NO: Continue
3. Issue: Supabase will reject auth.users INSERT (email already exists)
   SOLUTION: Use custom auth provider or:
   - Create account_identities: (auth_user_id=existing, email, 'business')
   - Create profiles row: (account_identity_id, account_type='business', ...)
   - Return JWT for business context (same auth_user_id, different claims)
```

#### Role Switching:
```
1. User clicks "Switch to Business Mode"
2. Query: SELECT * FROM account_identities WHERE email = user.email AND account_type = 'business'
3. If found: Fetch profiles record for that account_identity
4. Issue new JWT with business context (same auth_user_id, but business claims)
5. Update current_role in profiles table
6. Redirect to business dashboard
```

### 4. **JWT & Session Management**

Each JWT should include:
```json
{
  "sub": "auth_user_id",  // Shared across both accounts
  "email": "jess@gmail.com",
  "account_context": {
    "type": "personal" | "business",
    "account_identity_id": "uuid",
    "profile_id": "uuid"
  }
}
```

This allows:
- Same authentication (auth_user_id) for both accounts
- Different authorization contexts (account_context.type)
- Separation in database queries

### 5. **Data Separation & RLS Policies**

Row Level Security must now use both auth.uid() AND account_context:

```sql
-- Reviews - ensure user can only see/modify their own identity's reviews
CREATE POLICY "Users can read their own account's reviews"
  ON reviews FOR SELECT
  USING (
    account_identity_id IN (
      SELECT id FROM account_identities
      WHERE auth_user_id = auth.uid()
    )
  );

-- Profiles - ensure clear account separation
CREATE POLICY "Users can read/update their account profiles"
  ON profiles FOR SELECT
  USING (
    account_identity_id IN (
      SELECT id FROM account_identities
      WHERE auth_user_id = auth.uid()
    )
  );

-- Saved businesses - per account identity
CREATE POLICY "Users can manage their saved businesses per account"
  ON saved_businesses FOR ALL
  USING (
    account_identity_id IN (
      SELECT id FROM account_identities
      WHERE auth_user_id = auth.uid()
    )
  );
```

### 6. **UI/UX Changes**

#### Personal Account View:
- Standard user feed, explore, saved businesses
- Settings tab shows "Personal Account"
- Option to "Add Business Account" (if none exists for this email)

#### Business Account View:
- Business dashboard with analytics
- Claim businesses, manage listings
- Settings tab shows "Business Account"
- Option to "Add Personal Account" (if none exists for this email)

#### Context Switcher:
```
┌─────────────────────────┐
│ Jess (jess@gmail.com)   │
│ ────────────────────── │
│ ☑ Personal Account      │ ← Current
│ ☐ Business Account      │ ← Switch to
│                         │
│ [+ Add Account]         │ ← Add new type
└─────────────────────────┘
```

### 7. **Implementation Checklist**

#### Phase 1: Database Changes
- [ ] Create account_identities table
- [ ] Add account_identity_id to profiles
- [ ] Add account_type column to profiles
- [ ] Create migration for existing data
- [ ] Update RLS policies

#### Phase 2: Authentication
- [ ] Modify signUp handler to check account_identities
- [ ] Implement custom auth logic for business account creation
- [ ] Add JWT claims for account_context
- [ ] Create switch-role API endpoint

#### Phase 3: Data Layer
- [ ] Add account_identity_id to reviews, saved_businesses, etc.
- [ ] Update all queries to filter by account_context
- [ ] Add middleware to extract account_context from JWT

#### Phase 4: UI
- [ ] Create account switcher component
- [ ] Update dashboard to show correct account type
- [ ] Add "Add Account" flow
- [ ] Update settings pages

#### Phase 5: Testing
- [ ] Test dual registration with same email
- [ ] Test role switching
- [ ] Test data isolation
- [ ] Test RLS policies

### 8. **Migration Strategy for Existing Users**

```sql
-- One-time migration script:
-- For each unique email in auth.users:
--   1. Create account_identity with (user_id, email, 'personal')
--   2. Update profiles to reference account_identity
--   3. Migrate reviews to use account_identity_id
--   4. Migrate saved_businesses to use account_identity_id
```

### 9. **Advantages of This Approach**

✅ Same email for multiple account types
✅ Completely independent profiles
✅ Clear role separation
✅ Easy role switching via UI
✅ No data crossover without explicit action
✅ Backward compatible (keep auth.users structure)
✅ Single Supabase project (no multi-project complexity)

### 10. **Risks & Mitigations**

| Risk | Mitigation |
|------|-----------|
| User confusion about which account they're in | Clear visual indicator (header, color coding) |
| Data leakage between accounts | Strict RLS policies + account_identity checks |
| Complex querying | Always include account_context in queries |
| Migration errors | Thorough testing in staging first |
| Performance on account_identities table | Add indexes on (email, account_type) |

## Implementation Order

1. **Week 1**: Database schema changes + migration
2. **Week 2**: Authentication refactoring
3. **Week 3**: UI changes (account switcher, settings)
4. **Week 4**: Testing & edge cases

---

## Files to Modify

### Database
- [ ] New migration: `20260128_create_account_identities_schema.sql`
- [ ] New migration: `20260128_migrate_existing_profiles_to_identities.sql`

### Backend API
- [ ] `src/app/lib/auth.ts` - signUp, signIn, switch-role logic
- [ ] `src/app/api/user/switch-role/route.ts` - account switching
- [ ] `src/app/api/user/add-account/route.ts` - new endpoint for adding account
- [ ] Middleware to extract account_context
- [ ] All data access queries to include account_identity filter

### Frontend
- [ ] `src/app/components/AccountSwitcher.tsx` - new component
- [ ] `src/app/contexts/AuthContext.tsx` - track account_context
- [ ] `src/app/settings/page.tsx` - show both accounts
- [ ] Navigation to highlight current account

### API Routes
- [ ] All queries filtered by account_context
- [ ] Updated RLS policies

