-- Fix Reviews Foreign Key to use Profiles table
-- This ensures proper relationship between reviews and user profiles

-- Drop the old foreign key constraint to auth.users
ALTER TABLE reviews 
DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;

-- Add new foreign key constraint to profiles table
ALTER TABLE reviews 
ADD CONSTRAINT reviews_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the constraint exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'reviews_user_id_fkey' 
    AND table_name = 'reviews'
  ) THEN
    RAISE NOTICE 'Foreign key constraint reviews_user_id_fkey successfully created';
  ELSE
    RAISE EXCEPTION 'Failed to create foreign key constraint reviews_user_id_fkey';
  END IF;
END $$;

