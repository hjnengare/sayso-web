-- Migration: Add business hours column to businesses table
-- Run this SQL in your Supabase SQL Editor or PostgreSQL database

-- Add hours column as JSONB to store business hours
-- Format: {"monday": "9:00 AM - 5:00 PM", "tuesday": "9:00 AM - 5:00 PM", ...}
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS hours JSONB DEFAULT NULL;

-- Add index for hours queries (optional, but useful if you need to query by hours)
CREATE INDEX IF NOT EXISTS idx_businesses_hours ON businesses USING GIN (hours)
WHERE hours IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN businesses.hours IS 'Business operating hours stored as JSONB. Format: {"monday": "9:00 AM - 5:00 PM", "tuesday": "9:00 AM - 5:00 PM", "wednesday": "9:00 AM - 5:00 PM", "thursday": "9:00 AM - 5:00 PM", "friday": "9:00 AM - 5:00 PM", "saturday": "10:00 AM - 4:00 PM", "sunday": "Closed"}';

