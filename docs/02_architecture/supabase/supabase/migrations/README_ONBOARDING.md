# Onboarding Tables Migration

This migration sets up all the necessary database tables, RLS policies, and functions for the onboarding system.

## What This Migration Creates

### Tables
1. **user_interests** - Stores user's selected interest categories
2. **user_subcategories** - Stores user's selected subcategories within interests
3. **user_dealbreakers** - Stores user's dealbreakers (things they want to avoid)

### Profile Columns
Adds the following columns to the `profiles` table:
- `onboarding_step` - Current step in onboarding (default: 'interests')
- `onboarding_complete` - Boolean flag indicating completion
- `interests_count` - Count of selected interests
- `subcategories_count` - Count of selected subcategories
- `dealbreakers_count` - Count of selected dealbreakers
- `last_interests_updated` - Timestamp of last interests update
- `last_subcategories_updated` - Timestamp of last subcategories update
- `last_dealbreakers_updated` - Timestamp of last dealbreakers update

### Functions
1. **replace_user_interests** - Replaces user's interests
2. **replace_user_subcategories** - Replaces user's subcategories
3. **replace_user_dealbreakers** - Replaces user's dealbreakers
4. **complete_onboarding_atomic** - Atomically completes entire onboarding (saves all data at once)

### Security
- Row Level Security (RLS) enabled on all tables
- Policies ensure users can only manage their own data

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/migrations/20250111_setup_onboarding_tables.sql`
4. Copy and paste the entire SQL script
5. Click **Run** to execute

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Direct SQL Connection
If you have direct database access, you can run the SQL file directly using your preferred SQL client.

## Verification

After running the migration, verify that everything was created:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_interests', 'user_subcategories', 'user_dealbreakers');

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'replace_user_interests',
  'replace_user_subcategories', 
  'replace_user_dealbreakers',
  'complete_onboarding_atomic'
);

-- Check profile columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name LIKE 'onboarding%' OR column_name LIKE '%_count';
```

## Usage

Once the migration is complete, the onboarding API at `/api/user/onboarding` will automatically use these tables and functions to save user onboarding data.

The API endpoint expects:
- **POST** `/api/user/onboarding` with body:
  ```json
  {
    "step": "complete",
    "interests": ["food-drink", "beauty-wellness"],
    "subcategories": [
      {"subcategory_id": "restaurants", "interest_id": "food-drink"}
    ],
    "dealbreakers": ["trustworthiness", "punctuality"]
  }
  ```

## Notes

- This migration uses `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`, so it's safe to run multiple times
- The migration will not delete existing data
- All functions use `SECURITY DEFINER` to ensure proper permissions
- RLS policies ensure users can only access their own data

