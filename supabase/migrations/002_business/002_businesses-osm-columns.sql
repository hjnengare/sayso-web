-- Migration: Add OSM-related columns to businesses table for idempotent seeding
-- Run this SQL in your Supabase SQL Editor

-- Add lat/lng for coordinates
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

-- Add source tracking for idempotent upserts
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_id text;

-- Create unique index for idempotent upserts
-- This ensures we can upsert by (source, source_id) without duplicates
CREATE UNIQUE INDEX IF NOT EXISTS businesses_source_unique
ON businesses (source, source_id) 
WHERE source IS NOT NULL AND source_id IS NOT NULL;

-- Add index for coordinate-based queries (optional but useful)
CREATE INDEX IF NOT EXISTS idx_businesses_coordinates ON businesses (lat, lng) 
WHERE lat IS NOT NULL AND lng IS NOT NULL;

