-- ============================================
-- Migration: Ensure Cascade Delete on Account Deletion
-- ============================================
-- This migration ensures that all foreign keys referencing auth.users(id)
-- have ON DELETE CASCADE to properly clean up user data when an account is deleted.
-- ============================================

-- Fix review_flags.reviewed_by to SET NULL when the reviewing admin is deleted
-- (The flag should remain, but the reviewer reference should be cleared)
DO $$
BEGIN
  -- Drop existing foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'review_flags_reviewed_by_fkey'
    AND table_name = 'review_flags'
  ) THEN
    ALTER TABLE review_flags DROP CONSTRAINT review_flags_reviewed_by_fkey;
  END IF;
  
  -- Add foreign key with ON DELETE SET NULL
  ALTER TABLE review_flags
  ADD CONSTRAINT review_flags_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;
  
  RAISE NOTICE 'Updated review_flags.reviewed_by foreign key to SET NULL on delete';
END $$;

-- Verify all critical foreign keys have CASCADE or SET NULL
DO $$
DECLARE
  fk_record RECORD;
  missing_cascade_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Checking foreign key constraints on auth.users...';
  
  FOR fk_record IN
    SELECT 
      tc.table_name,
      kcu.column_name,
      tc.constraint_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON rc.unique_constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'users'
      AND ccu.table_schema = 'auth'
      AND tc.table_schema = 'public'
  LOOP
    -- Check if delete rule is appropriate
    IF fk_record.delete_rule NOT IN ('CASCADE', 'SET NULL') THEN
      RAISE NOTICE '⚠️  %.% has delete rule: % (should be CASCADE or SET NULL)', 
        fk_record.table_name, 
        fk_record.column_name, 
        fk_record.delete_rule;
      missing_cascade_count := missing_cascade_count + 1;
    ELSE
      RAISE NOTICE '✅ %.% has proper delete rule: %', 
        fk_record.table_name, 
        fk_record.column_name, 
        fk_record.delete_rule;
    END IF;
  END LOOP;
  
  IF missing_cascade_count = 0 THEN
    RAISE NOTICE '✅ All foreign keys to auth.users have proper cascade behavior';
  ELSE
    RAISE WARNING '⚠️  Found % foreign key(s) that may need cascade delete', missing_cascade_count;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON CONSTRAINT review_flags_reviewed_by_fkey ON review_flags IS 
  'Foreign key to auth.users. Set to NULL when the reviewing admin account is deleted, preserving the flag record.';

