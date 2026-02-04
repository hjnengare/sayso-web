-- =============================================
-- Materialized View: Top and Trending Businesses
-- Pre-computed rankings for fast page loads
-- =============================================

-- =============================================
-- 1. Top Rated Businesses (All Time)
-- =============================================

-- Check if latitude/longitude columns exist and create view accordingly
DO $$
DECLARE
  v_has_geo_columns BOOLEAN;
  v_create_view_sql TEXT;
BEGIN
  -- Check if lat (and lng) columns exist (schema uses lat/lng, not latitude/longitude)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'lat'
  ) INTO v_has_geo_columns;

  -- Drop existing view if it exists
  DROP MATERIALIZED VIEW IF EXISTS mv_top_rated_businesses CASCADE;

  -- Build CREATE VIEW statement based on available columns
  IF v_has_geo_columns THEN
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_top_rated_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        b.verified,
        b.price_range,
        b.badge,
        b.slug,
        b.lat AS latitude,
        b.lng AS longitude,
        bs.total_reviews,
        bs.average_rating,
        bs.percentiles,
        (bs.average_rating * LOG(bs.total_reviews + 1)) as weighted_score,
        b.created_at,
        NOW() as last_refreshed
      FROM businesses b
      INNER JOIN business_stats bs ON b.id = bs.business_id
      WHERE 
        b.status = ''active''
        AND bs.total_reviews >= 3
        AND bs.average_rating >= 3.5
      ORDER BY 
        weighted_score DESC,
        bs.average_rating DESC,
        bs.total_reviews DESC
      LIMIT 100';
  ELSE
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_top_rated_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        b.verified,
        b.price_range,
        b.badge,
        b.slug,
        NULL::DOUBLE PRECISION as latitude,
        NULL::DOUBLE PRECISION as longitude,
        bs.total_reviews,
        bs.average_rating,
        bs.percentiles,
        (bs.average_rating * LOG(bs.total_reviews + 1)) as weighted_score,
        b.created_at,
        NOW() as last_refreshed
      FROM businesses b
      INNER JOIN business_stats bs ON b.id = bs.business_id
      WHERE 
        b.status = ''active''
        AND bs.total_reviews >= 3
        AND bs.average_rating >= 3.5
      ORDER BY 
        weighted_score DESC,
        bs.average_rating DESC,
        bs.total_reviews DESC
      LIMIT 100';
  END IF;

  EXECUTE v_create_view_sql;
END $$;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_rated_businesses_id 
  ON mv_top_rated_businesses(id);

CREATE INDEX IF NOT EXISTS idx_mv_top_rated_businesses_category 
  ON mv_top_rated_businesses(category);

CREATE INDEX IF NOT EXISTS idx_mv_top_rated_businesses_score 
  ON mv_top_rated_businesses(weighted_score DESC);

-- =============================================
-- 2. Trending Businesses (Last 30 Days)
-- =============================================

-- First, ensure we have a reviews table index on created_at (if reviews table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    CREATE INDEX IF NOT EXISTS idx_reviews_created_at 
      ON reviews(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_reviews_business_created 
      ON reviews(business_id, created_at DESC);
  END IF;
END $$;

-- Materialized view for trending
-- Trending businesses view (with geo columns check)
DO $$
DECLARE
  v_has_geo_columns BOOLEAN;
  v_create_view_sql TEXT;
BEGIN
  -- Check if lat (and lng) columns exist (schema uses lat/lng, not latitude/longitude)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'lat'
  ) INTO v_has_geo_columns;

  -- Drop existing view if it exists
  DROP MATERIALIZED VIEW IF EXISTS mv_trending_businesses CASCADE;

  -- Build CREATE VIEW statement
  IF v_has_geo_columns THEN
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_trending_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        b.verified,
        b.price_range,
        b.badge,
        b.slug,
        b.lat AS latitude,
        b.lng AS longitude,
        bs.total_reviews,
        bs.average_rating,
        bs.percentiles,
        COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') as recent_reviews_30d,
        COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''7 days'') as recent_reviews_7d,
        AVG(r.rating) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') as recent_avg_rating,
        (
          COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''7 days'') * 3 +
          COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') * 1 +
          COALESCE(AVG(r.rating) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days''), 0) * 5
        ) as trending_score,
        MAX(r.created_at) as last_review_date,
        NOW() as last_refreshed
      FROM businesses b
      INNER JOIN business_stats bs ON b.id = bs.business_id
      LEFT JOIN reviews r ON b.id = r.business_id
      WHERE 
        b.status = ''active''
        AND b.created_at <= NOW() - INTERVAL ''7 days''
      GROUP BY b.id, b.name, b.category, b.location, b.image_url,
               b.verified, b.price_range, b.badge, b.slug, b.lat, b.lng,
               bs.total_reviews, bs.average_rating, bs.percentiles
      HAVING 
        COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') >= 2
      ORDER BY trending_score DESC
      LIMIT 100';
  ELSE
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_trending_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        b.verified,
        b.price_range,
        b.badge,
        b.slug,
        NULL::DOUBLE PRECISION as latitude,
        NULL::DOUBLE PRECISION as longitude,
        bs.total_reviews,
        bs.average_rating,
        bs.percentiles,
        COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') as recent_reviews_30d,
        COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''7 days'') as recent_reviews_7d,
        AVG(r.rating) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') as recent_avg_rating,
        (
          COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''7 days'') * 3 +
          COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') * 1 +
          COALESCE(AVG(r.rating) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days''), 0) * 5
        ) as trending_score,
        MAX(r.created_at) as last_review_date,
        NOW() as last_refreshed
      FROM businesses b
      INNER JOIN business_stats bs ON b.id = bs.business_id
      LEFT JOIN reviews r ON b.id = r.business_id
      WHERE 
        b.status = ''active''
        AND b.created_at <= NOW() - INTERVAL ''7 days''
      GROUP BY b.id, b.name, b.category, b.location, b.image_url,
               b.verified, b.price_range, b.badge, b.slug,
               bs.total_reviews, bs.average_rating, bs.percentiles
      HAVING 
        COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') >= 2
      ORDER BY trending_score DESC
      LIMIT 100';
  END IF;

  EXECUTE v_create_view_sql;
END $$;

-- Indexes for trending view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trending_businesses_id 
  ON mv_trending_businesses(id);

CREATE INDEX IF NOT EXISTS idx_mv_trending_businesses_category 
  ON mv_trending_businesses(category);

CREATE INDEX IF NOT EXISTS idx_mv_trending_businesses_score 
  ON mv_trending_businesses(trending_score DESC);

-- =============================================
-- 3. New and Notable (Recently Added)
-- =============================================

-- New businesses view (with geo columns check)
DO $$
DECLARE
  v_has_geo_columns BOOLEAN;
  v_create_view_sql TEXT;
BEGIN
  -- Check if lat (and lng) columns exist (schema uses lat/lng, not latitude/longitude)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'lat'
  ) INTO v_has_geo_columns;

  -- Drop existing view if it exists
  DROP MATERIALIZED VIEW IF EXISTS mv_new_businesses CASCADE;

  -- Build CREATE VIEW statement
  IF v_has_geo_columns THEN
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_new_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        b.verified,
        b.price_range,
        b.badge,
        b.slug,
        b.lat AS latitude,
        b.lng AS longitude,
        bs.total_reviews,
        bs.average_rating,
        bs.percentiles,
        b.created_at,
        EXTRACT(DAY FROM NOW() - b.created_at) as days_old,
        NOW() as last_refreshed
      FROM businesses b
      LEFT JOIN business_stats bs ON b.id = bs.business_id
      WHERE 
        b.status = ''active''
        AND b.created_at >= NOW() - INTERVAL ''90 days''
      ORDER BY b.created_at DESC
      LIMIT 100';
  ELSE
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_new_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        b.verified,
        b.price_range,
        b.badge,
        b.slug,
        NULL::DOUBLE PRECISION as latitude,
        NULL::DOUBLE PRECISION as longitude,
        bs.total_reviews,
        bs.average_rating,
        bs.percentiles,
        b.created_at,
        EXTRACT(DAY FROM NOW() - b.created_at) as days_old,
        NOW() as last_refreshed
      FROM businesses b
      LEFT JOIN business_stats bs ON b.id = bs.business_id
      WHERE 
        b.status = ''active''
        AND b.created_at >= NOW() - INTERVAL ''90 days''
      ORDER BY b.created_at DESC
      LIMIT 100';
  END IF;

  EXECUTE v_create_view_sql;
END $$;

-- Indexes for new businesses view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_new_businesses_id 
  ON mv_new_businesses(id);

CREATE INDEX IF NOT EXISTS idx_mv_new_businesses_category 
  ON mv_new_businesses(category);

CREATE INDEX IF NOT EXISTS idx_mv_new_businesses_created 
  ON mv_new_businesses(created_at DESC);

-- =============================================
-- 4. Refresh Function
-- =============================================

CREATE OR REPLACE FUNCTION refresh_business_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_rated_businesses;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_businesses;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_new_businesses;
  
  RAISE NOTICE 'Business materialized views refreshed at %', NOW();
END;
$$;

-- =============================================
-- 5. Create pg_cron Schedule (if extension is available)
-- =============================================

-- Check if pg_cron is available and schedule refresh
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Refresh every 15 minutes
    PERFORM cron.schedule(
      'refresh-business-views',
      '*/15 * * * *',  -- Every 15 minutes
      'SELECT refresh_business_views();'
    );
    RAISE NOTICE 'pg_cron schedule created for business views refresh';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Install with: CREATE EXTENSION pg_cron;';
    RAISE NOTICE 'Manual refresh: SELECT refresh_business_views();';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job. Run manually: SELECT refresh_business_views();';
END;
$$;

-- =============================================
-- 6. Helper Functions to Query Views
-- =============================================

-- Get top rated businesses
CREATE OR REPLACE FUNCTION get_top_rated_businesses(
  p_limit INTEGER DEFAULT 20,
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF mv_top_rated_businesses
LANGUAGE sql
STABLE
AS $$
  SELECT * 
  FROM mv_top_rated_businesses
  WHERE p_category IS NULL OR category = p_category
  ORDER BY weighted_score DESC
  LIMIT p_limit;
$$;

-- Get trending businesses
CREATE OR REPLACE FUNCTION get_trending_businesses(
  p_limit INTEGER DEFAULT 20,
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF mv_trending_businesses
LANGUAGE sql
STABLE
AS $$
  SELECT * 
  FROM mv_trending_businesses
  WHERE p_category IS NULL OR category = p_category
  ORDER BY trending_score DESC
  LIMIT p_limit;
$$;

-- Get new businesses
CREATE OR REPLACE FUNCTION get_new_businesses(
  p_limit INTEGER DEFAULT 20,
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF mv_new_businesses
LANGUAGE sql
STABLE
AS $$
  SELECT * 
  FROM mv_new_businesses
  WHERE p_category IS NULL OR category = p_category
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- =============================================
-- 7. Grant Permissions
-- =============================================

GRANT SELECT ON mv_top_rated_businesses TO authenticated, anon;
GRANT SELECT ON mv_trending_businesses TO authenticated, anon;
GRANT SELECT ON mv_new_businesses TO authenticated, anon;

GRANT EXECUTE ON FUNCTION get_top_rated_businesses TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_trending_businesses TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_new_businesses TO authenticated, anon;

-- =============================================
-- 8. Initial Refresh
-- =============================================

SELECT refresh_business_views();

-- =============================================
-- Comments
-- =============================================

COMMENT ON MATERIALIZED VIEW mv_top_rated_businesses IS 
'Pre-computed top rated businesses with weighted scores. Refreshed every 15 minutes via pg_cron.';

COMMENT ON MATERIALIZED VIEW mv_trending_businesses IS 
'Pre-computed trending businesses based on recent review activity. Refreshed every 15 minutes via pg_cron.';

COMMENT ON MATERIALIZED VIEW mv_new_businesses IS 
'Recently added businesses (last 90 days). Refreshed every 15 minutes via pg_cron.';

COMMENT ON FUNCTION refresh_business_views IS 
'Refreshes all business materialized views. Can be called manually or scheduled via pg_cron.';

-- =============================================
-- Usage Examples:
-- =============================================

-- Get top 10 rated restaurants
-- SELECT * FROM get_top_rated_businesses(10, 'restaurant');

-- Get trending businesses (all categories)
-- SELECT * FROM get_trending_businesses(20);

-- Get new cafes
-- SELECT * FROM get_new_businesses(15, 'cafe');

-- Manual refresh if needed
-- SELECT refresh_business_views();

-- Check when views were last refreshed
-- SELECT last_refreshed FROM mv_top_rated_businesses LIMIT 1;

