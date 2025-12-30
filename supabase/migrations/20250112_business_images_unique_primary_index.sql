-- Add unique index to prevent multiple primary images per business
-- This provides database-level guarantee against race conditions

-- Drop existing index if it exists (to allow re-running)
DROP INDEX IF EXISTS business_images_single_primary;

-- Create unique partial index
-- This ensures only one row per business can have is_primary = true
CREATE UNIQUE INDEX business_images_single_primary
ON public.business_images (business_id)
WHERE is_primary = true;

-- Add comment
COMMENT ON INDEX business_images_single_primary IS 'Ensures only one primary image per business (database-level constraint)';

