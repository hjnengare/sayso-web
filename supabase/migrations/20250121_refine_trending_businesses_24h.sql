-- =============================================
-- Refine Trending Businesses Logic (24-Hour Rolling Window)
-- Focus on objective, time-based signals
-- =============================================

-- Drop existing trending view and function
DROP MATERIALIZED VIEW IF EXISTS mv_trending_businesses CASCADE;

-- =============================================
-- Create Function to Calculate Trending Score (24-hour rolling window)
-- =============================================
-- Prioritize review volume first, then rating as tie-breaker
-- Exclude stale or low-activity businesses

CREATE OR REPLACE FUNCTION calculate_trending_score_24h(
  p_business_id UUID,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  reviews_24h INTEGER,
  avg_rating_24h DECIMAL,
  trending_score DECIMAL
) AS $$
DECLARE
  v_reviews_24h INTEGER;
  v_avg_rating_24h DECIMAL;
  v_score DECIMAL;
BEGIN
  -- Count reviews from the last 24 hours (rolling window)
  SELECT 
    COUNT(*),
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
  INTO v_reviews_24h, v_avg_rating_24h
  FROM public.reviews
  WHERE business_id = p_business_id
    AND created_at >= p_now - INTERVAL '24 hours'
    AND created_at <= p_now;

  -- Trending score: volume is primary (weight 100), rating is tie-breaker (weight 10)
  -- This ensures businesses with more reviews rank higher, with rating breaking ties
  v_score := (v_reviews_24h::numeric * 100) + (v_avg_rating_24h * 10);

  RETURN QUERY SELECT v_reviews_24h, v_avg_rating_24h, v_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- Recreate Materialized View (24-hour trending)
-- =============================================

CREATE MATERIALIZED VIEW mv_trending_businesses AS
SELECT 
  b.id,
  b.name,
  b.category,
  b.interest_id,
  b.sub_interest_id,
  b.location,
  b.address,
  b.image_url,
  COALESCE(
    ARRAY(
      SELECT bi.url 
      FROM public.business_images bi 
      WHERE bi.business_id = b.id 
      ORDER BY bi.is_primary DESC, bi.sort_order ASC
    ),
    ARRAY[]::TEXT[]
  ) AS uploaded_images,
  b.verified,
  b.price_range,
  b.badge,
  b.slug,
  b.lat AS latitude,
  b.lng AS longitude,
  b.created_at,
  b.updated_at,
  bs.total_reviews,
  bs.average_rating,
  bs.percentiles,
  -- 24-hour trending signals
  (cs.reviews_24h)::INTEGER as recent_reviews_24h,
  (cs.avg_rating_24h)::DECIMAL as recent_avg_rating_24h,
  (cs.trending_score)::DECIMAL as trending_score,
  MAX(r.created_at) FILTER (WHERE r.created_at >= NOW() - INTERVAL '24 hours') as last_review_24h,
  NOW() as last_refreshed
FROM public.businesses b
INNER JOIN public.business_stats bs ON b.id = bs.business_id
LEFT JOIN public.reviews r ON b.id = r.business_id
CROSS JOIN LATERAL calculate_trending_score_24h(b.id, NOW()) cs
WHERE 
  b.status = 'active'
  -- Business must have at least 1 review in 24-hour window to be trending
  AND cs.reviews_24h >= 1
  -- Business must have overall rating of 3.0+ to be trustworthy
  AND COALESCE(bs.average_rating, 0) >= 3.0
  -- Exclude very new businesses (give them at least 2 days to mature)
  AND b.created_at <= NOW() - INTERVAL '2 days'
GROUP BY 
  b.id, b.name, b.category, b.interest_id, b.sub_interest_id, 
  b.location, b.address, b.image_url, b.verified, b.price_range, 
  b.badge, b.slug, b.lat, b.lng, b.created_at, b.updated_at,
  bs.total_reviews, bs.average_rating, bs.percentiles,
  cs.reviews_24h, cs.avg_rating_24h, cs.trending_score
ORDER BY trending_score DESC, recent_avg_rating_24h DESC, recent_reviews_24h DESC
LIMIT 100;

-- =============================================
-- Create Indexes for Performance
-- =============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trending_businesses_id 
  ON mv_trending_businesses(id);

CREATE INDEX IF NOT EXISTS idx_mv_trending_businesses_category 
  ON mv_trending_businesses(category);

CREATE INDEX IF NOT EXISTS idx_mv_trending_businesses_score 
  ON mv_trending_businesses(trending_score DESC, recent_avg_rating_24h DESC);

CREATE INDEX IF NOT EXISTS idx_mv_trending_businesses_reviews_24h
  ON mv_trending_businesses(recent_reviews_24h DESC);

-- =============================================
-- Create Function to Fetch Trending Businesses
-- =============================================

CREATE OR REPLACE FUNCTION get_trending_businesses(
  p_limit INTEGER DEFAULT 20,
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF mv_trending_businesses
LANGUAGE SQL
STABLE
AS $$
  SELECT *
  FROM mv_trending_businesses
  WHERE (p_category IS NULL OR category = p_category)
  ORDER BY trending_score DESC, recent_avg_rating_24h DESC, recent_reviews_24h DESC
  LIMIT p_limit;
$$;

-- =============================================
-- Grant Permissions
-- =============================================

GRANT SELECT ON mv_trending_businesses TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_trending_score_24h(UUID, TIMESTAMPTZ) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_trending_businesses(INTEGER, TEXT) TO authenticated, anon;

-- =============================================
-- Create Function to Refresh Materialized View
-- =============================================

CREATE OR REPLACE FUNCTION refresh_mv_trending_businesses()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_businesses;
  RAISE NOTICE 'mv_trending_businesses refreshed at %', NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_mv_trending_businesses() TO authenticated, anon;

-- =============================================
-- Schedule Refresh Job (if pg_cron is available)
-- =============================================

-- This requires pg_cron extension to be enabled
-- Refresh every 5 minutes to capture fresh trending data
DO $$
BEGIN
  -- Try to drop existing job if it exists
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc 
    WHERE proname = 'cron_schedule' 
    AND pg_catalog.pg_namespace.nspname = 'cron'
  ) THEN
    -- pg_cron is available, try to schedule the refresh
    BEGIN
      -- Remove old job if exists
      PERFORM cron.unschedule('refresh-trending-businesses');
    EXCEPTION WHEN OTHERS THEN
      -- Job might not exist, that's OK
      NULL;
    END;

    -- Schedule new job to run every 5 minutes (more frequent for real-time 24h window)
    PERFORM cron.schedule('refresh-trending-businesses', '*/5 * * * *', 'SELECT refresh_mv_trending_businesses()');
    RAISE NOTICE 'Scheduled pg_cron job: refresh-trending-businesses every 5 minutes';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Set up manual refresh or enable pg_cron.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule cron job: %', SQLERRM;
END $$;

-- =============================================
-- Comments
-- =============================================

COMMENT ON MATERIALIZED VIEW mv_trending_businesses IS 
  'Trending businesses based on objective, time-based signals: review volume within 24-hour rolling window (primary), with average rating as tie-breaker. Requires at least 1 review in 24h and 3.0+ overall rating. Excludes businesses less than 2 days old. Refreshed every 5 minutes via pg_cron for near real-time accuracy.';

COMMENT ON FUNCTION calculate_trending_score_24h IS 
  'Calculates 24-hour trending score for a business. Returns review count, average rating, and composite score (volume * 100 + rating * 10). Used to prioritize volume first, rating second.';

COMMENT ON FUNCTION get_trending_businesses IS
  'Retrieves trending businesses from materialized view. Optional category filter. Ordered by trending score, with rating and volume as secondary sort keys.';

COMMENT ON FUNCTION refresh_mv_trending_businesses IS
  'Manually refresh the trending businesses materialized view. Typically called via pg_cron scheduler every 5 minutes.';

-- =============================================
-- Initial Refresh
-- =============================================

SELECT refresh_mv_trending_businesses();
