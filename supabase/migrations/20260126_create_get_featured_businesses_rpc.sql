
CREATE OR REPLACE FUNCTION get_featured_businesses(
  p_region TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 12
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
BEGIN
  RETURN QUERY
  WITH qualified_businesses AS (
    -- Only active businesses meeting quality thresholds
    SELECT
      b.id,
      b.name,
      COALESCE(b.image_url, '') as image_url,
      b.category,
      b.sub_interest_id,
      b.description,
      b.location,
      COALESCE(bs.average_rating, 0) as average_rating,
      COALESCE(bs.total_reviews, 0) as total_reviews,
      b.verified,
      b.slug,
      COALESCE(b.last_activity_at, b.updated_at, b.created_at) as last_activity_at,
      -- Balanced score: rating (55%) + reviews (30%) + recency (15%)
      (
        COALESCE(bs.average_rating, 0) * 0.55 +
        LN(1 + COALESCE(bs.total_reviews, 0)) * 0.30 +
        GREATEST(0, 1 - EXTRACT(DAYS FROM NOW() - COALESCE(b.last_activity_at, b.updated_at, b.created_at)) / 90.0) * 0.15
      ) as featured_score,
      -- Bucket key: sub_interest_id takes precedence, fallback to category
      COALESCE(b.sub_interest_id, b.category) as bucket,
      -- Flag for local matching
      CASE WHEN p_region IS NOT NULL AND LOWER(b.location) LIKE '%' || LOWER(p_region) || '%'
           THEN TRUE ELSE FALSE END as is_local
    FROM businesses b
    LEFT JOIN business_stats bs ON bs.business_id = b.id
    WHERE b.status = 'active'
      AND COALESCE(bs.average_rating, 0) >= v_min_rating
      AND COALESCE(bs.total_reviews, 0) >= v_min_reviews
      -- Exclude inactive businesses (no activity in 180 days)
      AND COALESCE(b.last_activity_at, b.updated_at, b.created_at) > NOW() - INTERVAL '180 days'
  ),
  bucket_winners AS (
    -- Select one winner per bucket with deterministic tie-breaking
    -- Local businesses get priority within each bucket when region is specified
    SELECT DISTINCT ON (qb.bucket)
      qb.id,
      qb.name,
      qb.image_url,
      qb.category,
      qb.sub_interest_id,
      qb.description,
      qb.location,
      qb.average_rating,
      qb.total_reviews,
      qb.verified,
      qb.slug,
      qb.last_activity_at,
      qb.featured_score,
      qb.bucket,
      qb.is_local
    FROM qualified_businesses qb
    ORDER BY
      qb.bucket,
      qb.is_local DESC,  -- Local businesses first within bucket
      qb.featured_score DESC,
      qb.total_reviews DESC,
      qb.last_activity_at DESC,
      qb.id ASC
  ),
  ranked_winners AS (
    -- Rank all bucket winners: local first, then by score
    SELECT
      bw.*,
      ROW_NUMBER() OVER (
        ORDER BY
          bw.is_local DESC,  -- Local businesses first overall
          bw.featured_score DESC,
          bw.total_reviews DESC,
          bw.last_activity_at DESC,
          bw.id ASC
      ) as final_rank
    FROM bucket_winners bw
  )
  SELECT
    rw.id,
    rw.name,
    rw.image_url,
    rw.category,
    rw.sub_interest_id,
    rw.description,
    rw.location,
    rw.average_rating,
    rw.total_reviews,
    rw.verified,
    rw.slug,
    rw.last_activity_at,
    rw.featured_score,
    rw.bucket
  FROM ranked_winners rw
  ORDER BY rw.final_rank
  LIMIT p_limit;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_featured_businesses TO authenticated;
GRANT EXECUTE ON FUNCTION get_featured_businesses TO anon;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_status_rating_reviews
ON businesses(status, last_activity_at DESC)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_business_stats_rating_reviews
ON business_stats(average_rating DESC, total_reviews DESC);

-- Comments
COMMENT ON FUNCTION get_featured_businesses IS
'Returns featured businesses with quality thresholds, balanced scoring, and geographic filtering.
Ensures deterministic selection with one winner per category bucket.
Supports cold start fairness and prevents gaming with minimum review requirements.';</content>
<parameter name="filePath">c:\Users\HilarioNengare\Projects\KLIO\supabase\migrations\20260126_create_get_featured_businesses_rpc.sql