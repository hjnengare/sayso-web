# Migration Order for Business Images Table Migration

## Overview

This document outlines the correct order for running migrations to migrate from `uploaded_images` array column to `business_images` table.

## Migration Order (CRITICAL - Run in this exact order)

### 1. Clean up RLS Policies
**File:** `20250120_cleanup_duplicate_rls_policies.sql`

**What it does:**
- Removes duplicate RLS policies on `businesses` table
- Creates single, simple policies for SELECT, INSERT, UPDATE, DELETE
- Fixes silent UPDATE failures caused by conflicting policies

**Why first:** Ensures RLS policies are correct before any data operations

---

### 2. Create Business Images Table and Migrate Data
**File:** `20250120_migrate_to_business_images_table.sql`

**What it does:**
- Creates `business_images` table with proper schema
- Sets up RLS policies for the table
- Migrates existing `uploaded_images` array data to `business_images` table
- Sets first image as primary (`is_primary = true`)

**Why second:** Creates the new table structure and migrates data before updating views

---

### 3. Update Materialized Views
**File:** `20250120_update_materialized_views_for_business_images.sql`

**What it does:**
- Drops existing materialized views (CASCADE to drop dependent functions)
- Recreates `mv_top_rated_businesses` using `business_images` table
- Recreates `mv_trending_businesses` using `business_images` table
- Recreates `mv_new_businesses` using `business_images` table
- Recreates dependent functions (`get_top_rated_businesses`, `get_trending_businesses`, `get_new_businesses`)
- Refreshes all materialized views

**Why third:** Updates views to use new table structure before dropping the column

---

### 4. Drop Uploaded Images Column
**File:** `20250120_drop_uploaded_images_column.sql`

**What it does:**
- Verifies all data has been migrated
- Drops `append_business_images` function (no longer needed)
- Drops `uploaded_images` column from `businesses` table
- Verifies the column was successfully dropped

**Why last:** Can only drop the column after all dependencies are removed

---

## Additional Migrations Needed (Can be done later)

These RPC functions also reference `uploaded_images` and should be updated:

### 1. `recommend_personalized_businesses`
- **Current:** Uses `b.uploaded_images` array
- **Should use:** Query `business_images` table for primary image
- **File to update:** `supabase/migrations/20250118_fix_recommend_personalized_businesses_uploaded_image.sql`

### 2. `list_businesses_optimized`
- **Current:** Uses `b.uploaded_images` array
- **Should use:** Query `business_images` table for primary image
- **File to update:** `supabase/migrations/20250117_fix_list_businesses_optimized_uploaded_image.sql`

**Note:** These can be updated after dropping the column, but the functions will fail until updated.

---

## Verification Steps

After running all migrations:

1. **Verify table exists:**
   ```sql
   SELECT COUNT(*) FROM business_images;
   ```

2. **Verify column is dropped:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'businesses' AND column_name = 'uploaded_images';
   -- Should return 0 rows
   ```

3. **Verify materialized views work:**
   ```sql
   SELECT COUNT(*) FROM mv_top_rated_businesses;
   SELECT COUNT(*) FROM mv_trending_businesses;
   SELECT COUNT(*) FROM mv_new_businesses;
   ```

4. **Verify functions work:**
   ```sql
   SELECT * FROM get_top_rated_businesses(10);
   SELECT * FROM get_trending_businesses(10);
   SELECT * FROM get_new_businesses(10);
   ```

---

## Rollback Plan

If you need to rollback:

1. **Restore column:**
   ```sql
   ALTER TABLE businesses ADD COLUMN uploaded_images TEXT[];
   ```

2. **Migrate data back:**
   ```sql
   UPDATE businesses b
   SET uploaded_images = (
     SELECT ARRAY_AGG(bi.url ORDER BY bi.sort_order)
     FROM business_images bi
     WHERE bi.business_id = b.id
   )
   WHERE EXISTS (SELECT 1 FROM business_images WHERE business_id = b.id);
   ```

3. **Recreate materialized views** (use previous migration files)

---

## Summary

✅ **Run migrations in order:**
1. Cleanup RLS policies
2. Create table and migrate data
3. Update materialized views
4. Drop column

⚠️ **Update later:**
- `recommend_personalized_businesses` function
- `list_businesses_optimized` function

