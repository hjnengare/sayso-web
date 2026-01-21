-- Reviews Table Schema
-- Run this SQL in your Supabase SQL Editor or PostgreSQL database

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review images table
-- Stores references to images uploaded to Supabase Storage bucket 'review-images'
CREATE TABLE IF NOT EXISTS review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage bucket (e.g., 'review-images/review-id/image.jpg')
  image_url TEXT, -- Full public URL (can be generated from storage_path)
  alt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_helpful_count ON reviews(helpful_count DESC);

-- Index for review images
CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images(review_id);
CREATE INDEX IF NOT EXISTS idx_review_images_created_at ON review_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_images_storage_path ON review_images(storage_path);

-- Composite index for common queries (business reviews sorted by date)
CREATE INDEX IF NOT EXISTS idx_reviews_business_created ON reviews(business_id, created_at DESC);

-- Composite index for user reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON reviews(user_id, created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on reviews table
DROP TRIGGER IF EXISTS update_reviews_updated_at_trigger ON reviews;
CREATE TRIGGER update_reviews_updated_at_trigger
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Function to update business stats when a review is created/updated/deleted
CREATE OR REPLACE FUNCTION update_business_stats_on_review_change()
RETURNS TRIGGER AS $$
DECLARE
  business_uuid UUID;
BEGIN
  -- Get business_id from the review
  IF TG_OP = 'DELETE' THEN
    business_uuid := OLD.business_id;
  ELSE
    business_uuid := NEW.business_id;
  END IF;

  -- Update business stats
  INSERT INTO business_stats (business_id, total_reviews, average_rating, rating_distribution, updated_at)
  SELECT
    business_uuid,
    COUNT(*)::INTEGER,
    COALESCE(AVG(rating)::DECIMAL(3,2), 0.0),
    jsonb_build_object(
      '1', COUNT(*) FILTER (WHERE rating = 1),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '5', COUNT(*) FILTER (WHERE rating = 5)
    ),
    NOW()
  FROM reviews
  WHERE business_id = business_uuid
  ON CONFLICT (business_id) DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    rating_distribution = EXCLUDED.rating_distribution,
    updated_at = EXCLUDED.updated_at;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update business stats on review insert/update/delete
DROP TRIGGER IF EXISTS update_business_stats_on_review_insert ON reviews;
CREATE TRIGGER update_business_stats_on_review_insert
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_business_stats_on_review_change();

-- Enable Row Level Security (RLS)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
-- Allow everyone to read reviews
CREATE POLICY "Allow public read access to reviews"
  ON reviews FOR SELECT
  USING (true);

-- Allow authenticated users to create reviews
CREATE POLICY "Allow authenticated users to create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reviews
CREATE POLICY "Allow users to update their own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own reviews
CREATE POLICY "Allow users to delete their own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for review_images
-- Allow everyone to read review images
CREATE POLICY "Allow public read access to review images"
  ON review_images FOR SELECT
  USING (true);

-- Allow authenticated users to create review images (only for their own reviews)
CREATE POLICY "Allow authenticated users to create review images"
  ON review_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_images.review_id
      AND reviews.user_id = auth.uid()
    )
  );

-- Allow users to delete their own review images
CREATE POLICY "Allow users to delete their own review images"
  ON review_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_images.review_id
      AND reviews.user_id = auth.uid()
    )
  );

-- Add constraint to prevent duplicate reviews from same user for same business
-- (Optional: Uncomment if you want to enforce one review per user per business)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_business_unique 
--   ON reviews(user_id, business_id);

