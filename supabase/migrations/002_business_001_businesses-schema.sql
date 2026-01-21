-- Businesses Table Schema
-- Run this SQL in your Supabase SQL Editor or PostgreSQL database

-- Main businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  image_url TEXT,
  uploaded_images TEXT[],
  verified BOOLEAN DEFAULT false,
  price_range TEXT DEFAULT '$$' CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  badge TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slug TEXT UNIQUE,
  search_vector tsvector,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business stats table for aggregated statistics
CREATE TABLE IF NOT EXISTS business_stats (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  total_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.0 CHECK (average_rating >= 0 AND average_rating <= 5),
  rating_distribution JSONB DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
  percentiles JSONB DEFAULT '{"service": 0, "price": 0, "ambience": 0}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(location);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_verified ON businesses(verified);
CREATE INDEX IF NOT EXISTS idx_businesses_badge ON businesses(badge);
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON businesses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_businesses_search_vector ON businesses USING GIN(search_vector);

-- Business stats indexes
CREATE INDEX IF NOT EXISTS idx_business_stats_rating ON business_stats(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_business_stats_reviews ON business_stats(total_reviews DESC);

-- Function to update search_vector for full-text search
CREATE OR REPLACE FUNCTION businesses_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update search_vector on insert/update
DROP TRIGGER IF EXISTS businesses_search_vector_update_trigger ON businesses;
CREATE TRIGGER businesses_search_vector_update_trigger
  BEFORE INSERT OR UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION businesses_search_vector_update();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on businesses table
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on business_stats table
DROP TRIGGER IF EXISTS update_business_stats_updated_at ON business_stats;
CREATE TRIGGER update_business_stats_updated_at
  BEFORE UPDATE ON business_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - adjust policies as needed
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_stats ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your security requirements)
-- Allow everyone to read active businesses
CREATE POLICY "Allow public read access to active businesses"
  ON businesses FOR SELECT
  USING (status = 'active');

-- Allow authenticated users to read business stats
CREATE POLICY "Allow authenticated users to read business stats"
  ON business_stats FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert businesses (adjust as needed)
CREATE POLICY "Allow authenticated users to insert businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow owners to update their businesses
CREATE POLICY "Allow owners to update their businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

