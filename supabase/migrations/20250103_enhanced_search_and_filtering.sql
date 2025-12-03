-- ============================================
-- Enhanced Search & Filtering Migration
-- ============================================
-- This migration adds:
-- 1. Enhanced search_vector with weighted fields
-- 2. search_history table
-- 3. saved_searches table
-- 4. Performance indexes for distance and full-text search
-- ============================================

-- Enable required extensions for distance calculations
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- ============================================
-- 1. Enhanced search_vector for businesses
-- ============================================

-- Add search_vector column if it doesn't exist
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search_vector with weighted fields
-- Weight A (highest): business name
-- Weight B (medium): category
-- Weight C (lowest): location text
CREATE OR REPLACE FUNCTION businesses_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search_vector
DROP TRIGGER IF EXISTS businesses_search_vector_trigger ON businesses;
CREATE TRIGGER businesses_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, category, location, description ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION businesses_search_vector_update();

-- Update existing rows
UPDATE businesses SET 
  search_vector = 
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(location, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'C')
WHERE search_vector IS NULL;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_businesses_search_vector ON businesses USING GIN(search_vector);

-- ============================================
-- 2. Distance calculation indexes
-- ============================================

-- Index for latitude/longitude for distance queries
-- Only create if the columns exist (they may not exist in all schemas)
DO $$
BEGIN
  -- Check if latitude and longitude columns exist
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'businesses' 
    AND column_name = 'latitude'
  ) AND EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'businesses' 
    AND column_name = 'longitude'
  ) THEN
    -- Create index if columns exist
    CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(latitude, longitude) 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
  ELSE
    -- Log a notice if columns don't exist (non-blocking)
    RAISE NOTICE 'Skipping location index creation: latitude/longitude columns not found in businesses table';
  END IF;
END $$;

-- ============================================
-- 3. search_history table
-- ============================================

CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  radius_km NUMERIC(5, 2),
  sort TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search_history
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_user_created ON search_history(user_id, created_at DESC);

-- RLS for search_history
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search history" ON search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history" ON search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history" ON search_history
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. saved_searches table
-- ============================================

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  params JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for saved_searches
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON saved_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_created ON saved_searches(user_id, created_at DESC);

-- RLS for saved_searches
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved searches" ON saved_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved searches" ON saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches" ON saved_searches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches" ON saved_searches
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_searches_updated_at_trigger
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_searches_updated_at();

-- ============================================
-- 5. Helper function for distance calculation (Haversine)
-- ============================================

CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 NUMERIC,
  lng1 NUMERIC,
  lat2 NUMERIC,
  lng2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  earth_radius_km NUMERIC := 6371.0;
  dlat NUMERIC;
  dlng NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  -- Convert degrees to radians
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  
  -- Haversine formula
  a := sin(dlat / 2) * sin(dlat / 2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlng / 2) * sin(dlng / 2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  
  RETURN earth_radius_km * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 6. Helper function for text highlighting
-- ============================================

CREATE OR REPLACE FUNCTION highlight_text(
  text_content TEXT,
  search_query TEXT
) RETURNS TEXT AS $$
DECLARE
  query_tsquery tsquery;
  highlighted TEXT;
BEGIN
  -- Convert search query to tsquery
  query_tsquery := plainto_tsquery('english', search_query);
  
  -- Use ts_headline for highlighting
  highlighted := ts_headline(
    'english',
    text_content,
    query_tsquery,
    'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15'
  );
  
  RETURN highlighted;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

