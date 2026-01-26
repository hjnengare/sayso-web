-- Migration: Create user_reco_impressions table
-- Lightweight tracking of which businesses a user has recently seen
-- Used to reduce repetition in For You feed (don't show same business within 48h)

CREATE TABLE IF NOT EXISTS user_reco_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one record per user+business
  -- On conflict, we update the timestamp
  UNIQUE(user_id, business_id)
);

-- Index for efficient lookups by user + recency
CREATE INDEX IF NOT EXISTS idx_user_reco_impressions_user_recent
ON user_reco_impressions(user_id, shown_at DESC);

-- Index for cleanup job
CREATE INDEX IF NOT EXISTS idx_user_reco_impressions_shown_at
ON user_reco_impressions(shown_at);

-- Enable RLS
ALTER TABLE user_reco_impressions ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own impressions
CREATE POLICY "Users can view own impressions"
ON user_reco_impressions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own impressions"
ON user_reco_impressions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own impressions"
ON user_reco_impressions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own impressions"
ON user_reco_impressions FOR DELETE
USING (auth.uid() = user_id);

-- Function to record impressions (upsert)
CREATE OR REPLACE FUNCTION record_reco_impressions(
  p_user_id UUID,
  p_business_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert impressions (update timestamp if exists)
  INSERT INTO user_reco_impressions (user_id, business_id, shown_at)
  SELECT p_user_id, unnest(p_business_ids), NOW()
  ON CONFLICT (user_id, business_id)
  DO UPDATE SET shown_at = NOW();
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION record_reco_impressions(UUID, UUID[]) TO authenticated;

-- Function to get recently shown business IDs (for exclusion)
CREATE OR REPLACE FUNCTION get_recently_shown_businesses(
  p_user_id UUID,
  p_hours INTEGER DEFAULT 48
)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(business_id),
    ARRAY[]::UUID[]
  )
  FROM user_reco_impressions
  WHERE user_id = p_user_id
    AND shown_at > NOW() - (p_hours || ' hours')::INTERVAL;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_recently_shown_businesses(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recently_shown_businesses(UUID, INTEGER) TO anon;

-- Cleanup function: Remove impressions older than 7 days
-- Can be called by a cron job or pg_cron
CREATE OR REPLACE FUNCTION cleanup_old_reco_impressions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM user_reco_impressions
  WHERE shown_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Add comments
COMMENT ON TABLE user_reco_impressions IS
'Tracks which businesses were shown to users in For You feed. Used to reduce repetition.';

COMMENT ON FUNCTION record_reco_impressions IS
'Records that businesses were shown to a user. Upserts to update timestamp if already exists.';

COMMENT ON FUNCTION get_recently_shown_businesses IS
'Returns business IDs shown to user within the last N hours (default 48).';
