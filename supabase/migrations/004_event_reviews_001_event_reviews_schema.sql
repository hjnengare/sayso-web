-- Event Reviews Table Schema
-- Run this SQL in your Supabase SQL Editor or PostgreSQL database

-- Event reviews table
CREATE TABLE IF NOT EXISTS event_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL, -- Using TEXT since events use ticketmaster_id or custom IDs
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add constraint to prevent duplicate reviews from same user
  UNIQUE(event_id, user_id)
);

-- Event review images table
CREATE TABLE IF NOT EXISTS event_review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES event_reviews(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  image_url TEXT,
  alt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_reviews_event_id ON event_reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_user_id ON event_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_rating ON event_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_event_reviews_created_at ON event_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_reviews_helpful_count ON event_reviews(helpful_count DESC);

-- Index for event review images
CREATE INDEX IF NOT EXISTS idx_event_review_images_review_id ON event_review_images(review_id);
CREATE INDEX IF NOT EXISTS idx_event_review_images_created_at ON event_review_images(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_event_reviews_event_created ON event_reviews(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_reviews_user_created ON event_reviews(user_id, created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on event_reviews table
DROP TRIGGER IF EXISTS update_event_reviews_updated_at_trigger ON event_reviews;
CREATE TRIGGER update_event_reviews_updated_at_trigger
  BEFORE UPDATE ON event_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_event_reviews_updated_at();

-- Row Level Security (RLS)
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_review_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_reviews
CREATE POLICY "Event reviews are viewable by everyone"
  ON event_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own event reviews"
  ON event_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own event reviews"
  ON event_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event reviews"
  ON event_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for event_review_images
CREATE POLICY "Event review images are viewable by everyone"
  ON event_review_images FOR SELECT
  USING (true);

CREATE POLICY "Users can create images for their own event reviews"
  ON event_review_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_reviews
      WHERE event_reviews.id = event_review_images.review_id
      AND event_reviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images for their own event reviews"
  ON event_review_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM event_reviews
      WHERE event_reviews.id = event_review_images.review_id
      AND event_reviews.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON event_reviews TO authenticated;
GRANT SELECT, INSERT, DELETE ON event_review_images TO authenticated;
GRANT SELECT ON event_reviews TO anon;
GRANT SELECT ON event_review_images TO anon;
