CREATE OR REPLACE FUNCTION get_featured_businesses(
  p_region TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 12,
  p_seed TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  image_url TEXT,
  category TEXT,
  sub_interest_id TEXT,
  description TEXT,
  location TEXT,
  average_rating DECIMAL(3,2),
  total_reviews INTEGER,
  verified BOOLEAN,
  slug TEXT,
  last_activity_at TIMESTAMPTZ,
  recent_reviews_30d INTEGER,
  recent_reviews_7d INTEGER,
  bayesian_rating DECIMAL(4,2),
  featured_score DECIMAL(10,6),
  bucket TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_rating DECIMAL(3,2) := 4.0;
  v_min_reviews INTEGER := 5;
  v_prior_rating DECIMAL(3,2) := 4.0;
  v_prior_reviews INTEGER := 5;
BEGIN
  RETURN QUERY
  WITH recent_review_counts AS (
    SELECT
      r.business_id,
      COUNT(*) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days') AS recent_reviews_30d,
      COUNT(*) FILTER (WHERE r.created_at >= NOW() - INTERVAL '7 days') AS recent_reviews_7d
    FROM reviews r
    GROUP BY r.business_id
  ),
  qualified_businesses AS (
    SELECT
      b.id,
      b.name,
      COALESCE(b.image_url, '') AS image_url,
      b.category,
      b.sub_interest_id,
      b.description,
      b.location,
      COALESCE(bs.average_rating, 0) AS average_rating,
      COALESCE(bs.total_reviews, 0) AS total_reviews,
      b.verified,
      b.slug,
      COALESCE(b.last_activity_at, b.updated_at, b.created_at) AS last_activity_at,
      COALESCE(rr.recent_reviews_30d, 0) AS recent_reviews_30d,
      COALESCE(rr.recent_reviews_7d, 0) AS recent_reviews_7d,
      (
        (COALESCE(bs.average_rating, 0) * COALESCE(bs.total_reviews, 0) + v_prior_rating * v_prior_reviews)
        / (COALESCE(bs.total_reviews, 0) + v_prior_reviews)
      ) AS bayesian_rating,
      (
        (
          (COALESCE(bs.average_rating, 0) * COALESCE(bs.total_reviews, 0) + v_prior_rating * v_prior_reviews)
          / (COALESCE(bs.total_reviews, 0) + v_prior_reviews)
        ) * 0.60
        + LN(1 + COALESCE(bs.total_reviews, 0)) * 0.20
        + LN(1 + COALESCE(rr.recent_reviews_30d, 0)) * 0.20
      ) AS featured_score,
      COALESCE(b.sub_interest_id, b.category) AS bucket,
      CASE WHEN p_region IS NOT NULL AND LOWER(b.location) LIKE '%' || LOWER(p_region) || '%'
           THEN TRUE ELSE FALSE END AS is_local,
      md5(COALESCE(p_seed, '') || b.id::text) AS seed_hash
    FROM businesses b
    LEFT JOIN business_stats bs ON bs.business_id = b.id
    LEFT JOIN recent_review_counts rr ON rr.business_id = b.id
    WHERE b.status = 'active'
      AND COALESCE(bs.average_rating, 0) >= v_min_rating
      AND COALESCE(bs.total_reviews, 0) >= v_min_reviews
      AND COALESCE(b.last_activity_at, b.updated_at, b.created_at) > NOW() - INTERVAL '180 days'
  ),
  bucket_winners AS (
    SELECT DISTINCT ON (qb.bucket)
      qb.*
    FROM qualified_businesses qb
    ORDER BY
      qb.bucket,
      qb.is_local DESC,
      qb.featured_score DESC,
      qb.total_reviews DESC,
      qb.last_activity_at DESC,
      qb.seed_hash ASC,
      qb.id ASC
  ),
  combined AS (
    SELECT
      bw.*,
      TRUE AS is_bucket_winner
    FROM bucket_winners bw
    UNION ALL
    SELECT
      qb.*,
      FALSE AS is_bucket_winner
    FROM qualified_businesses qb
    WHERE qb.id NOT IN (SELECT id FROM bucket_winners)
  )
  SELECT
    c.id,
    c.name,
    c.image_url,
    c.category,
    c.sub_interest_id,
    c.description,
    c.location,
    c.average_rating,
    c.total_reviews,
    c.verified,
    c.slug,
    c.last_activity_at,
    c.recent_reviews_30d,
    c.recent_reviews_7d,
    c.bayesian_rating,
    c.featured_score,
    c.bucket
  FROM combined c
  ORDER BY
    c.is_bucket_winner DESC,
    c.is_local DESC,
    c.featured_score DESC,
    c.total_reviews DESC,
    c.last_activity_at DESC,
    c.seed_hash ASC,
    c.id ASC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_featured_businesses TO authenticated;
GRANT EXECUTE ON FUNCTION get_featured_businesses TO anon;

COMMENT ON FUNCTION get_featured_businesses IS
'Returns featured businesses with quality thresholds, recency/velocity weighting, and geographic filtering.
Deterministic ordering via seed hash and per-bucket diversity with backfill.';
