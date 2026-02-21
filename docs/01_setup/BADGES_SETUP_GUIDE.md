# Badges System Setup Guide

This guide will help you set up and verify the Badges system is working correctly.

## Problem Identified

The profile page was using an old achievements API (`/api/user/achievements`) that computed achievements dynamically instead of using the badges system tables (`badges` and `user_badges`).

## Changes Made

### 1. **Profile Page Updated** ✅
- **File**: `src/app/profile/page.tsx`
- **Change**: Now fetches badges from `/api/badges/user?user_id={id}` instead of `/api/user/achievements`
- **Result**: Profile will now display badges from the `user_badges` table

### 2. **RLS Policies Created** ✅
- **File**: `supabase/migrations/20260113_add_badges_rls_policies.sql`
- **Change**: Added Row Level Security policies for badges tables
- **Policies**:
  - Users can read all badges (catalog and earned badges)
  - Only service role can insert/delete badges
  - Badges cannot be updated once awarded

### 3. **Review Cards Updated** ✅
- **File**: `src/app/components/ReviewerCard/ReviewerCard.tsx`
- **Change**: Review card variant now displays user badges
- **Result**: Badges will show on both reviewer cards and review cards

## Setup Steps

### Step 1: Run Database Migrations

You need to run TWO migrations in your Supabase SQL editor:

#### Migration 1: Create Badges System
```sql
-- Run the entire contents of:
-- supabase/migrations/20260112_create_badges_system.sql
```

This creates:
- `badges` table with 60+ badge definitions
- `user_badges` table to track earned badges
- Includes the "New Voice" (First Timer) badge

#### Migration 2: Add RLS Policies
```sql
-- Run the entire contents of:
-- supabase/migrations/20260113_add_badges_rls_policies.sql
```

This adds:
- Row Level Security policies
- Proper access control for badge awarding

### Step 2: Create Badge Stats RPC Functions

```sql
-- Run the entire contents of:
-- supabase/migrations/20260112_create_badge_stats_rpc.sql
```

This creates:
- `get_user_badge_stats()` - Calculates user statistics
- `check_badge_earned()` - Validates badge eligibility

### Step 3: Verify Badge Data

Run this query in Supabase SQL Editor to check if badges exist:

```sql
SELECT id, name, description, badge_group, icon_path, rule_type, threshold
FROM public.badges
WHERE id = 'milestone_new_voice';
```

Expected result:
```
id                    | name       | description              | badge_group | icon_path              | rule_type    | threshold
----------------------|------------|--------------------------|-------------|------------------------|--------------|----------
milestone_new_voice   | New Voice  | Posted your first review | milestone   | /badges/027-aniversary.png | review_count | 1
```

### Step 4: Manually Award Badge (Testing)

If you already have reviews but no badge, manually award it:

```sql
-- Replace YOUR_USER_ID with your actual user ID
INSERT INTO public.user_badges (user_id, badge_id)
VALUES ('YOUR_USER_ID', 'milestone_new_voice')
ON CONFLICT (user_id, badge_id) DO NOTHING;
```

To find your user ID:
```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

### Step 5: Test Badge Awarding Flow

1. **Clear existing test data** (optional):
```sql
-- Delete test badges
DELETE FROM public.user_badges WHERE user_id = 'YOUR_USER_ID';
```

2. **Submit a new review** through the app

3. **Check if badge was awarded**:
```sql
SELECT ub.*, b.name, b.description
FROM public.user_badges ub
JOIN public.badges b ON b.id = ub.badge_id
WHERE ub.user_id = 'YOUR_USER_ID'
ORDER BY ub.awarded_at DESC;
```

4. **Check server logs** for badge awarding:
- Look for: `[Badge Check] User xxx earned X new badges`
- If you see errors, they will appear in your Next.js console

### Step 6: Verify Profile Display

1. Navigate to `/profile` in your app
2. Scroll to "Badges & Achievements" section
3. You should see your earned badges with:
   - Badge icon (PNG image)
   - Badge name
   - Description
   - Earned date

## Troubleshooting

### Badge not showing on profile?

1. **Check if migrations ran**:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('badges', 'user_badges');
```

2. **Check if badge was awarded**:
```sql
SELECT * FROM public.user_badges WHERE user_id = 'YOUR_USER_ID';
```

3. **Check RLS policies**:
```sql
SELECT * FROM pg_policies WHERE tablename IN ('badges', 'user_badges');
```

4. **Check browser console** for API errors:
- Open DevTools → Console
- Look for errors from `/api/badges/user`

5. **Check if badge catalog is populated**:
```sql
SELECT COUNT(*) as total_badges FROM public.badges;
-- Should return 60+
```

### Badge awarding not working after review submission?

1. **Check server logs** (Next.js console) for errors like:
   - `[Badge Check] Error checking badge`
   - `[Review Create] Error triggering badge check`

2. **Manually trigger badge check**:
```bash
curl -X POST http://localhost:3000/api/badges/check-and-award \
  -H "Cookie: your-session-cookie"
```

3. **Check RPC functions exist**:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_badge_stats', 'check_badge_earned');
```

### Badge icon not displaying?

1. **Check if PNG file exists**:
   - Look in `/public/badges/027-aniversary.png`
   - Should have 74 PNG files in that directory

2. **Check icon_path in database**:
```sql
SELECT icon_path FROM public.badges WHERE id = 'milestone_new_voice';
```

3. **Verify path starts with `/badges/`** (not `./badges/` or `badges/`)

## Badge System Architecture

```
┌─────────────────────┐
│  Review Submission  │
│  (POST /api/reviews)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│ Trigger Badge Check         │
│ (POST /api/badges/          │
│  check-and-award)           │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ RPC: get_user_badge_stats() │
│ (Calculate user stats)      │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ For each unearned badge:    │
│ RPC: check_badge_earned()   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ INSERT INTO user_badges     │
│ (Award newly earned badges) │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Profile fetches badges      │
│ (GET /api/badges/user)      │
└─────────────────────────────┘
```

## Quick Verification Checklist

- [ ] Migrations run successfully
- [ ] RLS policies enabled
- [ ] RPC functions created
- [ ] Badge catalog populated (60+ badges)
- [ ] User has at least 1 review
- [ ] Badge awarded in `user_badges` table
- [ ] Profile page displays badge
- [ ] Badge icon shows correctly
- [ ] Review cards display badges
- [ ] Reviewer cards display badges

## Next Steps

After setup:
1. Test with a fresh user account
2. Submit a review and verify badge appears immediately
3. Check all badge types are working (milestone, specialist, explorer, community)
4. Verify badge display on reviewer cards and review cards

## Support

If issues persist:
1. Check server logs for errors
2. Verify all migrations ran successfully
3. Test badge API endpoints directly
4. Check RLS policies are not blocking access
