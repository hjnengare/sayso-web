-- Review helpful votes table
-- Note: This matches the existing migration at src/app/lib/migrations/003_reviews/006_review-helpful-votes.sql
-- If that migration has already been run, you can skip this one
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id 
  ON review_helpful_votes(review_id);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user_id 
  ON review_helpful_votes(user_id);

-- Enable RLS
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can insert their own votes
CREATE POLICY "Users can insert their own helpful votes"
  ON review_helpful_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own helpful votes
CREATE POLICY "Users can delete their own helpful votes"
  ON review_helpful_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Anyone can read helpful votes
CREATE POLICY "Anyone can read helpful votes"
  ON review_helpful_votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

