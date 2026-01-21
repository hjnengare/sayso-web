-- Review Helpful Votes Table Schema
-- This table tracks which users have marked reviews as helpful
-- Run this SQL in your Supabase SQL Editor or PostgreSQL database

-- Create review_helpful_votes table
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user ON review_helpful_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_created ON review_helpful_votes(created_at DESC);

-- Composite index for common queries (checking if user voted on a review)
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_user ON review_helpful_votes(review_id, user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_helpful_votes

-- Allow authenticated users to vote on reviews
CREATE POLICY "Users can vote on reviews"
  ON review_helpful_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to remove their votes
CREATE POLICY "Users can remove their votes"
  ON review_helpful_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to see all votes (for checking vote status)
CREATE POLICY "Users can see all votes"
  ON review_helpful_votes
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: The helpful_count in the reviews table is maintained by the API endpoints
-- They increment/decrement the count when votes are added/removed

