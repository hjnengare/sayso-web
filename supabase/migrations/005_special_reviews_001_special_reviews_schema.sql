-- Special Reviews Table Schema
-- Run this SQL in your Supabase SQL Editor or PostgreSQL database

-- Special reviews table
CREATE TABLE IF NOT EXISTS special_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  special_id TEXT NOT NULL, -- Using TEXT for flexible special IDs
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add constraint to prevent duplicate reviews from same user
  UNIQUE(special_id, user_id)
);

-- Special review images table
CREATE TABLE IF NOT EXISTS special_review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES special_reviews(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  image_url TEXT,
  alt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_special_reviews_special_id ON special_reviews(special_id);
CREATE INDEX IF NOT EXISTS idx_special_reviews_user_id ON special_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_special_reviews_rating ON special_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_special_reviews_created_at ON special_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_special_reviews_helpful_count ON special_reviews(helpful_count DESC);

-- Index for special review images
CREATE INDEX IF NOT EXISTS idx_special_review_images_review_id ON special_review_images(review_id);
CREATE INDEX IF NOT EXISTS idx_special_review_images_created_at ON special_review_images(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_special_reviews_special_created ON special_reviews(special_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_special_reviews_user_created ON special_reviews(user_id, created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_special_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on special_reviews table
DROP TRIGGER IF EXISTS update_special_reviews_updated_at_trigger ON special_reviews;
CREATE TRIGGER update_special_reviews_updated_at_trigger
  BEFORE UPDATE ON special_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_special_reviews_updated_at();

-- Row Level Security (RLS)
ALTER TABLE special_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_review_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for special_reviews
CREATE POLICY "Special reviews are viewable by everyone"
  ON special_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own special reviews"
  ON special_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own special reviews"
  ON special_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own special reviews"
  ON special_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for special_review_images
CREATE POLICY "Special review images are viewable by everyone"
  ON special_review_images FOR SELECT
  USING (true);

CREATE POLICY "Users can create images for their own special reviews"
  ON special_review_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM special_reviews
      WHERE special_reviews.id = special_review_images.review_id
      AND special_reviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images for their own special reviews"
  ON special_review_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM special_reviews
      WHERE special_reviews.id = special_review_images.review_id
      AND special_reviews.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON special_reviews TO authenticated;
GRANT SELECT, INSERT, DELETE ON special_review_images TO authenticated;
GRANT SELECT ON special_reviews TO anon;
GRANT SELECT ON special_review_images TO anon;
