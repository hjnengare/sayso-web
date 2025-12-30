# Supabase Setup Instructions

This guide will help you set up your Supabase database and storage for the KLIO application.

## Prerequisites

- A Supabase account and project
- Access to your Supabase project's SQL Editor and Storage settings

## Step 1: Database Setup

### Run Initial Database Schema

1. Go to your Supabase Dashboard > SQL Editor
2. Run the initial schema setup:
   - Open and run `src/app/lib/setup-database.sql`
   - This creates the profiles table and triggers

### Add Missing Profile Fields

1. Run the migration to add profile fields:
   - Open and run `src/app/lib/add-profile-fields-migration.sql`
   - This adds avatar_url, username, display_name, and other fields

### Run Database Functions

1. Run the database functions:
   - Open and run `src/app/lib/database-functions.sql`
   - This creates helper functions for managing user interests, subcategories, and dealbreakers

### Add Account Deletion Function

1. Run the account deletion function:
   - Open and run `src/app/lib/delete-user-account-function.sql`
   - This creates a function to allow users to delete their own accounts
   - Required for GDPR compliance and account deletion feature

## Step 2: Storage Setup

### Create Storage Buckets

1. Go to Supabase Dashboard > Storage
2. Create the following buckets:
   - **avatars** (public bucket)
   - **review-images** (public bucket)
   - **business-images** (public bucket) - See detailed setup: [Business Images Storage Setup](./BUSINESS_IMAGES_STORAGE_SETUP.md)

### Configure Storage Policies

1. Go to Supabase Dashboard > Storage > Policies
2. For the **avatars** bucket, run the storage policy SQL:
   - Open and run `src/app/lib/setup-storage.sql`
   - This sets up policies to allow users to upload/update/delete their own avatars
   - This also allows public read access

3. For the **review-images** bucket, create similar policies:
   - Users can upload to `review-images/{review_id}/` paths
   - Public read access for all review images

4. For the **business-images** bucket:
   - Run the migration: `src/app/lib/migrations/002_business/008_business-images-storage.sql`
   - This sets up policies for business owners to upload/update/delete their business images
   - Public read access for all business images
   - See detailed guide: [Business Images Storage Setup](./BUSINESS_IMAGES_STORAGE_SETUP.md)

### Alternative: Create Buckets via SQL

If you prefer to use SQL for bucket creation:

```sql
-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create review-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create business-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-images', 'business-images', true)
ON CONFLICT (id) DO NOTHING;
```

## Step 3: Verify Setup

### Check Database Tables

```sql
-- Verify profiles table has all columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
```

You should see:
- user_id
- avatar_url
- username
- display_name
- locale
- is_top_reviewer
- reviews_count
- badges_count
- And other fields from setup-database.sql

### Check Storage Buckets

```sql
-- Verify storage buckets exist
SELECT id, name, public 
FROM storage.buckets 
WHERE id IN ('avatars', 'review-images', 'business-images');
```

### Check Storage Policies

```sql
-- Verify storage policies
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';
```

## Troubleshooting

### Profile Picture Upload Issues

If profile picture upload is stuck or fails:

1. **Check storage bucket exists**: Go to Storage > Buckets and verify "avatars" exists
2. **Check storage policies**: Go to Storage > Policies for avatars bucket and verify policies are set
3. **Check database columns**: Run the database migration if avatar_url column is missing
4. **Check browser console**: Look for specific error messages

### Database Errors

If you see column-related errors:

1. **Verify migration ran**: Check if all columns exist in the profiles table
2. **Re-run migrations**: Sometimes migrations need to be run in order
3. **Check RLS policies**: Ensure Row Level Security is properly configured

### Storage Permission Errors

If uploads fail with permission errors:

1. **Check bucket public setting**: avatars bucket should be public
2. **Verify RLS policies**: Storage policies must allow authenticated users to insert
3. **Check user authentication**: Ensure the user is properly authenticated

### Account Deletion Errors

If account deletion fails:

1. **Check delete function exists**: Verify the `delete_user_account` function was created
2. **Check function permissions**: Ensure authenticated users can execute the function
3. **Check database cascade**: Verify `ON DELETE CASCADE` is set on foreign keys
4. **Check storage policies**: Verify users can delete their own storage objects

## Quick Setup Script Order

Run these SQL files in order:

1. `src/app/lib/setup-database.sql` - Initial schema
2. `src/app/lib/add-profile-fields-migration.sql` - Add profile fields
3. `src/app/lib/database-functions.sql` - Database functions
4. `src/app/lib/delete-user-account-function.sql` - Account deletion function
5. `src/app/lib/setup-storage.sql` - Storage policies (avatars, review-images)
6. `src/app/lib/migrations/002_business/008_business-images-storage.sql` - Business images storage policies
7. `src/app/lib/migrations/002_business/009_business-images-table.sql` - Business images table (multiple images per business)

## Need Help?

If you encounter issues:
1. Check the browser console for specific error messages
2. Check Supabase logs in Dashboard > Logs
3. Verify all environment variables are set correctly in `.env.local`

