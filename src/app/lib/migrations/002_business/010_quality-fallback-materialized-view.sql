-- =============================================
-- Materialized View: Quality fallback for discovery
-- Used to fill trending/featured when primary RPC returns fewer than requested.
-- Requires: businesses.lat, businesses.lng (002_businesses-osm-columns).
-- =============================================

DROP MATERIALIZED VIEW IF EXISTS mv_quality_fallback_businesses CASCADE;

CREATE MATERIALIZED VIEW mv_quality_fallback_businesses AS
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
  COALESCE(bs.total_reviews, 0) AS total_reviews,
  COALESCE(bs.average_rating, 0) AS average_rating,
  bs.percentiles,
  b.created_at,
  b.updated_at,
  NOW() AS last_refreshed,
  (
    (CASE WHEN b.verified THEN 2 ELSE 0 END) +
    (CASE WHEN COALESCE(b.description, '') <> '' THEN 1 ELSE 0 END) +
    (CASE WHEN COALESCE(b.image_url, '') <> '' THEN 1 ELSE 0 END) +
    LOG(1 + COALESCE(bs.total_reviews, 0)) +
    (COALESCE(bs.average_rating, 0) * 0.5)
  ) AS quality_score
FROM businesses b
LEFT JOIN business_stats bs ON bs.business_id = b.id
WHERE b.status = 'active'
ORDER BY quality_score DESC, b.created_at DESC
LIMIT 200;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_quality_fallback_id
  ON mv_quality_fallback_businesses(id);

CREATE OR REPLACE FUNCTION get_quality_fallback_businesses(p_limit INT DEFAULT 20)
RETURNS SETOF mv_quality_fallback_businesses
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM mv_quality_fallback_businesses
  ORDER BY quality_score DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_quality_fallback_businesses TO authenticated, anon;
GRANT SELECT ON mv_quality_fallback_businesses TO authenticated, anon;

-- Update refresh_business_views to include this MV (idempotent)
CREATE OR REPLACE FUNCTION refresh_business_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_rated_businesses;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_businesses;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_new_businesses;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_quality_fallback_businesses;
  RAISE NOTICE 'Business materialized views refreshed at %', NOW();
END;
$$;

COMMENT ON MATERIALIZED VIEW mv_quality_fallback_businesses IS
'Quality-scored businesses for filling trending/featured when primary RPC returns fewer than requested. Refreshed with other business views.';
