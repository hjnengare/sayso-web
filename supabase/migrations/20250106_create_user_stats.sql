-- ============================================
-- User Stats Table Migration
-- ============================================
-- This migration creates:
-- 1. user_stats table for cached user statistics
-- 2. Function to update user stats
-- 3. Triggers to automatically update stats when data changes
-- ============================================

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_reviews_written INTEGER NOT NULL DEFAULT 0,
  total_helpful_votes_given INTEGER NOT NULL DEFAULT 0,
  total_businesses_saved INTEGER NOT NULL DEFAULT 0,
  helpful_votes_received INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_updated_at ON user_stats(updated_at DESC);

-- Create function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_reviews INTEGER;
  v_total_helpful_votes_given INTEGER;
  v_total_saved INTEGER;
  v_helpful_votes_received INTEGER;
BEGIN
  -- Count total reviews written
  SELECT COUNT(*) INTO v_total_reviews
  FROM reviews
  WHERE user_id = p_user_id;

  -- Count total helpful votes given
  SELECT COUNT(*) INTO v_total_helpful_votes_given
  FROM review_helpful_votes
  WHERE user_id = p_user_id;

  -- Count total businesses saved
  SELECT COUNT(*) INTO v_total_saved
  FROM saved_businesses
  WHERE user_id = p_user_id;

  -- Count helpful votes received (on user's reviews)
  SELECT COUNT(*) INTO v_helpful_votes_received
  FROM review_helpful_votes rhv
  INNER JOIN reviews r ON r.id = rhv.review_id
  WHERE r.user_id = p_user_id;

  -- Insert or update user stats
  INSERT INTO user_stats (
    user_id,
    total_reviews_written,
    total_helpful_votes_given,
    total_businesses_saved,
    helpful_votes_received,
    updated_at
  ) VALUES (
    p_user_id,
    v_total_reviews,
    v_total_helpful_votes_given,
    v_total_saved,
    v_helpful_votes_received,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_reviews_written = EXCLUDED.total_reviews_written,
    total_helpful_votes_given = EXCLUDED.total_helpful_votes_given,
    total_businesses_saved = EXCLUDED.total_businesses_saved,
    helpful_votes_received = EXCLUDED.helpful_votes_received,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user stats when a review is created or deleted
CREATE OR REPLACE FUNCTION trigger_update_user_stats_on_review()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM update_user_stats(NEW.user_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_user_stats(OLD.user_id);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only update if user_id changed
    IF NEW.user_id != OLD.user_id THEN
      PERFORM update_user_stats(OLD.user_id);
      PERFORM update_user_stats(NEW.user_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user stats when a helpful vote is created or deleted
CREATE OR REPLACE FUNCTION trigger_update_user_stats_on_helpful_vote()
RETURNS TRIGGER AS $$
DECLARE
  v_review_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update stats for user who gave the vote
    PERFORM update_user_stats(NEW.user_id);
    -- Update stats for user who received the vote (review owner)
    SELECT user_id INTO v_review_user_id
    FROM reviews
    WHERE id = NEW.review_id;
    IF v_review_user_id IS NOT NULL THEN
      PERFORM update_user_stats(v_review_user_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update stats for user who removed the vote
    PERFORM update_user_stats(OLD.user_id);
    -- Update stats for user who lost the vote (review owner)
    SELECT user_id INTO v_review_user_id
    FROM reviews
    WHERE id = OLD.review_id;
    IF v_review_user_id IS NOT NULL THEN
      PERFORM update_user_stats(v_review_user_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user stats when a business is saved or unsaved
CREATE OR REPLACE FUNCTION trigger_update_user_stats_on_saved_business()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM update_user_stats(NEW.user_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_user_stats(OLD.user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_review_insert ON reviews;
CREATE TRIGGER trigger_update_user_stats_on_review_insert
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_stats_on_review();

DROP TRIGGER IF EXISTS trigger_update_user_stats_on_helpful_vote_insert ON review_helpful_votes;
CREATE TRIGGER trigger_update_user_stats_on_helpful_vote_insert
  AFTER INSERT OR DELETE ON review_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_stats_on_helpful_vote();

DROP TRIGGER IF EXISTS trigger_update_user_stats_on_saved_business_insert ON saved_businesses;
CREATE TRIGGER trigger_update_user_stats_on_saved_business_insert
  AFTER INSERT OR DELETE ON saved_businesses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_stats_on_saved_business();

-- Enable Row Level Security
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own stats
CREATE POLICY "Users can view their own stats"
  ON user_stats
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert/update stats (for triggers/functions)
CREATE POLICY "System can manage user stats"
  ON user_stats
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE user_stats IS 'Cached user statistics for performance optimization';
COMMENT ON FUNCTION update_user_stats IS 'Updates or creates user stats record';
COMMENT ON FUNCTION trigger_update_user_stats_on_review IS 'Trigger function to update user stats when reviews change';
COMMENT ON FUNCTION trigger_update_user_stats_on_helpful_vote IS 'Trigger function to update user stats when helpful votes change';
COMMENT ON FUNCTION trigger_update_user_stats_on_saved_business IS 'Trigger function to update user stats when saved businesses change';

-- Initialize stats for existing users (optional - can be run separately)
-- This will populate stats for all existing users
-- Uncomment if you want to backfill existing data:
/*
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    PERFORM update_user_stats(user_record.id);
  END LOOP;
END $$;
*/

