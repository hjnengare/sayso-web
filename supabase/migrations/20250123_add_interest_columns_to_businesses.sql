-- =============================================
-- Add interest_id and sub_interest_id columns to businesses table
-- =============================================
-- This migration adds the interest_id and sub_interest_id columns
-- to the businesses table if they don't already exist

-- Add interest_id column if it doesn't exist
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS interest_id TEXT;

-- Add sub_interest_id column if it doesn't exist
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS sub_interest_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_interest_id ON businesses(interest_id) 
WHERE interest_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_sub_interest_id ON businesses(sub_interest_id) 
WHERE sub_interest_id IS NOT NULL;

-- Create composite index for filtering by both
CREATE INDEX IF NOT EXISTS idx_businesses_interest_composite ON businesses(interest_id, sub_interest_id) 
WHERE interest_id IS NOT NULL OR sub_interest_id IS NOT NULL;

