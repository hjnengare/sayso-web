-- Migration: Fix materialized views to use uploaded_images instead of uploaded_image
-- This allows the uploaded_image column to be altered/dropped without errors
-- The views will use the first image from uploaded_images array (uploaded_images[1])

-- Drop all materialized views that depend on uploaded_image (CASCADE will drop dependent objects)
DROP MATERIALIZED VIEW IF EXISTS mv_top_rated_businesses CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_trending_businesses CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_new_businesses CASCADE;

-- Recreate the materialized view with updated column reference
-- Check if latitude/longitude columns exist and create view accordingly
DO $$
DECLARE
  v_has_geo_columns BOOLEAN;
  v_create_view_sql TEXT;
BEGIN
  -- Check if latitude and longitude columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'lat'
  ) INTO v_has_geo_columns;

  -- Build CREATE VIEW statement based on available columns
  -- Use first image from uploaded_images array (uploaded_images[1])
  IF v_has_geo_columns THEN
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_top_rated_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        CASE 
          WHEN b.uploaded_images IS NOT NULL AND array_length(b.uploaded_images, 1) > 0 
          THEN b.uploaded_images[1]
          ELSE NULL
        END AS uploaded_image,
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
        CASE 
          WHEN b.uploaded_images IS NOT NULL AND array_length(b.uploaded_images, 1) > 0 
          THEN b.uploaded_images[1]
          ELSE NULL
        END AS uploaded_image,
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

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_rated_businesses_id 
  ON mv_top_rated_businesses(id);

CREATE INDEX IF NOT EXISTS idx_mv_top_rated_businesses_category 
  ON mv_top_rated_businesses(category);

CREATE INDEX IF NOT EXISTS idx_mv_top_rated_businesses_score 
  ON mv_top_rated_businesses(weighted_score DESC);

-- Recreate the get_top_rated_businesses function if it was dropped
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

-- Grant permissions
GRANT SELECT ON mv_top_rated_businesses TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_top_rated_businesses TO authenticated, anon;

-- =============================================
-- 2. Fix mv_trending_businesses
-- =============================================

DO $$
DECLARE
  v_has_geo_columns BOOLEAN;
  v_create_view_sql TEXT;
BEGIN
  -- Check if latitude and longitude columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'lat'
  ) INTO v_has_geo_columns;

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
        CASE 
          WHEN b.uploaded_images IS NOT NULL AND array_length(b.uploaded_images, 1) > 0 
          THEN b.uploaded_images[1]
          ELSE NULL
        END AS uploaded_image,
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
               CASE 
                 WHEN b.uploaded_images IS NOT NULL AND array_length(b.uploaded_images, 1) > 0 
                 THEN b.uploaded_images[1]
                 ELSE NULL
               END,
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
        CASE 
          WHEN b.uploaded_images IS NOT NULL AND array_length(b.uploaded_images, 1) > 0 
          THEN b.uploaded_images[1]
          ELSE NULL
        END AS uploaded_image,
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
               CASE 
                 WHEN b.uploaded_images IS NOT NULL AND array_length(b.uploaded_images, 1) > 0 
                 THEN b.uploaded_images[1]
                 ELSE NULL
               END,
               b.verified, b.price_range, b.badge, b.slug,
               bs.total_reviews, bs.average_rating, bs.percentiles
      HAVING 
        COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') >= 2
      ORDER BY trending_score DESC
      LIMIT 100';
  END IF;

  EXECUTE v_create_view_sql;
END $$;

-- Recreate indexes for trending view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trending_businesses_id 
  ON mv_trending_businesses(id);

CREATE INDEX IF NOT EXISTS idx_mv_trending_businesses_category 
  ON mv_trending_businesses(category);

CREATE INDEX IF NOT EXISTS idx_mv_trending_businesses_score 
  ON mv_trending_businesses(trending_score DESC);

-- Recreate the get_trending_businesses function
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

-- =============================================
-- 3. Fix mv_new_businesses
-- =============================================

DO $$
DECLARE
  v_has_geo_columns BOOLEAN;
  v_create_view_sql TEXT;
BEGIN
  -- Check if latitude and longitude columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'lat'
  ) INTO v_has_geo_columns;

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
        CASE 
          WHEN b.uploaded_images IS NOT NULL AND array_length(b.uploaded_images, 1) > 0 
          THEN b.uploaded_images[1]
          ELSE NULL
        END AS uploaded_image,
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
        CASE 
          WHEN b.uploaded_images IS NOT NULL AND array_length(b.uploaded_images, 1) > 0 
          THEN b.uploaded_images[1]
          ELSE NULL
        END AS uploaded_image,
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

-- Recreate indexes for new businesses view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_new_businesses_id 
  ON mv_new_businesses(id);

CREATE INDEX IF NOT EXISTS idx_mv_new_businesses_category 
  ON mv_new_businesses(category);

CREATE INDEX IF NOT EXISTS idx_mv_new_businesses_created_at 
  ON mv_new_businesses(created_at DESC);

-- Recreate the get_new_businesses function
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
-- 4. Refresh Function
-- =============================================

-- Create or replace the refresh function for all materialized views
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

-- Grant execute permission on refresh function
GRANT EXECUTE ON FUNCTION refresh_business_views() TO authenticated, anon;

-- =============================================
-- 5. Grant Permissions and Refresh
-- =============================================

-- Grant permissions
GRANT SELECT ON mv_top_rated_businesses TO authenticated, anon;
GRANT SELECT ON mv_trending_businesses TO authenticated, anon;
GRANT SELECT ON mv_new_businesses TO authenticated, anon;

GRANT EXECUTE ON FUNCTION get_top_rated_businesses TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_trending_businesses TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_new_businesses TO authenticated, anon;

-- Refresh all materialized views
REFRESH MATERIALIZED VIEW mv_top_rated_businesses;
REFRESH MATERIALIZED VIEW mv_trending_businesses;
REFRESH MATERIALIZED VIEW mv_new_businesses;

-- Add comments
COMMENT ON MATERIALIZED VIEW mv_top_rated_businesses IS 
'Pre-computed top rated businesses with weighted scores. Uses uploaded_images[1] (first image from array). Refreshed every 15 minutes via pg_cron.';

COMMENT ON MATERIALIZED VIEW mv_trending_businesses IS 
'Pre-computed trending businesses based on recent review activity. Uses uploaded_images[1] (first image from array). Refreshed every 15 minutes via pg_cron.';

COMMENT ON MATERIALIZED VIEW mv_new_businesses IS 
'Pre-computed new businesses (last 90 days). Uses uploaded_images[1] (first image from array). Refreshed every 15 minutes via pg_cron.';

COMMENT ON FUNCTION refresh_business_views() IS 
'Refreshes all business materialized views concurrently. Can be called manually or scheduled via pg_cron.';

