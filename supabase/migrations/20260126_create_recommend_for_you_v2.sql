CREATE OR REPLACE FUNCTION generate_candidates_personalized(
  p_user_id UUID,
  p_interest_ids TEXT[],
  p_sub_interest_ids TEXT[],
  p_excluded_ids UUID[],
  p_limit INTEGER DEFAULT 150
)
RETURNS TABLE (
  business_id UUID,
  source TEXT,
  interest_match_score NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id AS business_id,
    'personalized' AS source,
    CASE
      WHEN array_length(p_sub_interest_ids, 1) > 0 AND b.sub_interest_id = ANY(p_sub_interest_ids) THEN 1.0
      WHEN array_length(p_interest_ids, 1) > 0 AND b.interest_id = ANY(p_interest_ids) THEN 0.6
      ELSE 0.2
    END AS interest_match_score
  FROM businesses b
  WHERE b.status = 'active'
    AND (p_excluded_ids IS NULL OR b.id <> ALL(p_excluded_ids))
    AND (
      -- Match by sub-interest (most specific)
      (array_length(p_sub_interest_ids, 1) > 0 AND b.sub_interest_id = ANY(p_sub_interest_ids))
      OR
      -- Match by interest (broader)
      (array_length(p_interest_ids, 1) > 0 AND b.interest_id = ANY(p_interest_ids))
    )
  ORDER BY
    interest_match_score DESC,
    COALESCE(b.last_activity_at, b.updated_at, b.created_at) DESC
  LIMIT p_limit;
$$;

-- Generate top-rated candidates (quality signal)
CREATE OR REPLACE FUNCTION generate_candidates_top_rated(
  p_excluded_ids UUID[],
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  business_id UUID,
  source TEXT,
  quality_score NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id AS business_id,
    'top_rated' AS source,
    (
      COALESCE(bs.average_rating, 0) * 0.6 +
      LN(1 + COALESCE(bs.total_reviews, 0)) * 0.4
    ) AS quality_score
  FROM businesses b
  LEFT JOIN business_stats bs ON bs.business_id = b.id
  WHERE b.status = 'active'
    AND (p_excluded_ids IS NULL OR b.id <> ALL(p_excluded_ids))
    AND COALESCE(bs.average_rating, 0) >= 3.5
    AND COALESCE(bs.total_reviews, 0) >= 2
  ORDER BY quality_score DESC
  LIMIT p_limit;
$$;

-- Generate fresh/active candidates (recency signal)
CREATE OR REPLACE FUNCTION generate_candidates_fresh(
  p_excluded_ids UUID[],
  p_limit INTEGER DEFAULT 80
)
RETURNS TABLE (
  business_id UUID,
  source TEXT,
  freshness_score NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id AS business_id,
    'fresh' AS source,
    -- Exponential decay: half-life of 30 days
    EXP(-0.693 * EXTRACT(DAYS FROM NOW() - COALESCE(b.last_activity_at, b.updated_at, b.created_at)) / 30.0) AS freshness_score
  FROM businesses b
  WHERE b.status = 'active'
    AND (p_excluded_ids IS NULL OR b.id <> ALL(p_excluded_ids))
    AND COALESCE(b.last_activity_at, b.updated_at, b.created_at) > NOW() - INTERVAL '90 days'
  ORDER BY freshness_score DESC
  LIMIT p_limit;
$$;

-- Generate diverse/explore candidates (variety signal)
CREATE OR REPLACE FUNCTION generate_candidates_explore(
  p_excluded_ids UUID[],
  p_seen_sub_interests TEXT[],
  p_limit INTEGER DEFAULT 70
)
RETURNS TABLE (
  business_id UUID,
  source TEXT,
  diversity_score NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id AS business_id,
    'explore' AS source,
    -- Boost businesses from unseen subcategories
    CASE
      WHEN p_seen_sub_interests IS NULL OR b.sub_interest_id <> ALL(p_seen_sub_interests) THEN 1.0
      ELSE 0.3
    END +
    -- Add some randomness for discovery
    random() * 0.2 AS diversity_score
  FROM businesses b
  LEFT JOIN business_stats bs ON bs.business_id = b.id
  WHERE b.status = 'active'
    AND (p_excluded_ids IS NULL OR b.id <> ALL(p_excluded_ids))
    AND COALESCE(bs.average_rating, 0) >= 3.0
  ORDER BY diversity_score DESC, random()
  LIMIT p_limit;
$$;

-- =============================================
-- STAGE B: RANKING FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION rank_candidates(
  p_candidate_ids UUID[],
  p_user_interest_ids TEXT[],
  p_user_sub_interest_ids TEXT[],
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 40
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  interest_id TEXT,
  sub_interest_id TEXT,
  location TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  image_url TEXT,
  verified BOOLEAN,
  price_range TEXT,
  badge TEXT,
  slug TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  total_reviews INTEGER,
  average_rating NUMERIC,
  percentiles JSONB,
  final_score DOUBLE PRECISION,
  diversity_rank INTEGER
)
LANGUAGE sql
STABLE
AS $$
WITH candidate_data AS (
  SELECT
    b.id,
    b.name,
    b.description,
    b.category,
    b.interest_id,
    b.sub_interest_id,
    b.location,
    b.address,
    b.phone,
    b.email,
    b.website,
    b.image_url,
    b.verified,
    b.price_range,
    b.badge,
    b.slug,
    b.lat AS latitude,
    b.lng AS longitude,
    b.created_at,
    b.updated_at,
    b.last_activity_at,
    COALESCE(bs.total_reviews, 0) AS total_reviews,
    COALESCE(bs.average_rating, 0) AS average_rating,
    bs.percentiles,
    -- Check if business has any images (from business_images table)
    EXISTS (SELECT 1 FROM business_images bi WHERE bi.business_id = b.id LIMIT 1) AS has_images
  FROM businesses b
  LEFT JOIN business_stats bs ON bs.business_id = b.id
  WHERE b.id = ANY(p_candidate_ids)
),
scored AS (
  SELECT
    cd.*,
    -- Interest Score (0-25 points)
    CASE
      WHEN array_length(p_user_sub_interest_ids, 1) > 0 AND cd.sub_interest_id = ANY(p_user_sub_interest_ids) THEN 25.0
      WHEN array_length(p_user_interest_ids, 1) > 0 AND cd.interest_id = ANY(p_user_interest_ids) THEN 15.0
      ELSE 5.0  -- Base score for non-matching (still discoverable)
    END AS interest_score,

    -- Quality Score (0-20 points)
    -- Uses Bayesian average to handle low review counts
    (
      (cd.average_rating * cd.total_reviews + 3.5 * 5) / (cd.total_reviews + 5)
    ) * 3.0 +  -- Bayesian rating (0-15)
    LEAST(LN(1 + cd.total_reviews) * 1.5, 5.0)  -- Review volume bonus (0-5, capped)
    AS quality_score,

    -- Freshness Score (0-10 points) - Exponential decay, half-life 45 days
    -- Never goes to zero, just gets very small
    EXP(-0.693 * EXTRACT(DAYS FROM NOW() - COALESCE(cd.last_activity_at, cd.updated_at, cd.created_at)) / 45.0) * 10.0
    AS freshness_score,

    -- Distance Score (0-10 points) - With neutral fallback when location unavailable
    CASE
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL
           AND cd.latitude IS NOT NULL AND cd.longitude IS NOT NULL THEN
        -- Inverse distance scoring: closer = higher
        GREATEST(
          0,
          10.0 - (
            6371 * acos(
              LEAST(1, GREATEST(-1,
                cos(radians(p_latitude)) *
                cos(radians(cd.latitude)) *
                cos(radians(cd.longitude) - radians(p_longitude)) +
                sin(radians(p_latitude)) *
                sin(radians(cd.latitude))
              ))
            ) * 0.5  -- Scale: 20km = 0 points
          )
        )
      WHEN p_latitude IS NULL OR p_longitude IS NULL THEN
        5.0  -- Neutral score when user location unavailable
      ELSE
        3.0  -- Slight penalty when business has no location
    END AS distance_score,

    -- Verified bonus (0-3 points)
    CASE WHEN cd.verified THEN 3.0 ELSE 0.0 END AS verified_bonus,

    -- Photo bonus (0-2 points) - check image_url or business_images
    CASE WHEN cd.image_url IS NOT NULL OR cd.has_images THEN 2.0 ELSE 0.0 END AS photo_bonus,

    -- Light randomness to avoid stagnation (0-2 points)
    random() * 2.0 AS randomness
  FROM candidate_data cd
),
final_scored AS (
  SELECT
    s.*,
    (
      s.interest_score +
      s.quality_score +
      s.freshness_score +
      s.distance_score +
      s.verified_bonus +
      s.photo_bonus +
      s.randomness
    ) AS final_score
  FROM scored s
),
-- Diversity enforcement: limit per subcategory
ranked AS (
  SELECT
    fs.*,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(fs.sub_interest_id, fs.category, 'uncategorized')
      ORDER BY fs.final_score DESC
    ) AS diversity_rank
  FROM final_scored fs
)
SELECT
  id,
  name,
  description,
  category,
  interest_id,
  sub_interest_id,
  location,
  address,
  phone,
  email,
  website,
  image_url,
  verified,
  price_range,
  badge,
  slug,
  latitude,
  longitude,
  created_at,
  updated_at,
  last_activity_at,
  total_reviews::INTEGER,
  average_rating,
  percentiles,
  final_score,
  diversity_rank::INTEGER
FROM ranked
WHERE diversity_rank <= 5  -- Max 5 per subcategory
ORDER BY final_score DESC
LIMIT p_limit;
$$;

-- =============================================
-- MAIN RECOMMENDER FUNCTION (V2)
-- =============================================

CREATE OR REPLACE FUNCTION recommend_for_you_v2(
  p_user_id UUID DEFAULT NULL,
  p_interest_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_sub_interest_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_limit INTEGER DEFAULT 40,
  p_price_ranges TEXT[] DEFAULT NULL,
  p_suppress_recent_hours INTEGER DEFAULT 48
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  interest_id TEXT,
  sub_interest_id TEXT,
  location TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  image_url TEXT,
  verified BOOLEAN,
  price_range TEXT,
  badge TEXT,
  slug TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_reviews INTEGER,
  average_rating NUMERIC,
  percentiles JSONB,
  personalization_score DOUBLE PRECISION,
  diversity_rank INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_recently_shown UUID[];
  v_excluded_ids UUID[];
  v_has_strong_prefs BOOLEAN;
  v_personal_limit INTEGER;
  v_top_limit INTEGER;
  v_fresh_limit INTEGER;
  v_explore_limit INTEGER;
  v_candidate_ids UUID[];
  v_seen_sub_interests TEXT[];
BEGIN
  -- =============================================
  -- STEP 0: Get recently shown businesses to exclude
  -- =============================================
  IF p_user_id IS NOT NULL AND p_suppress_recent_hours > 0 THEN
    SELECT COALESCE(array_agg(business_id), ARRAY[]::UUID[])
    INTO v_recently_shown
    FROM user_reco_impressions
    WHERE user_id = p_user_id
      AND shown_at > NOW() - (p_suppress_recent_hours || ' hours')::INTERVAL;
  ELSE
    v_recently_shown := ARRAY[]::UUID[];
  END IF;

  v_excluded_ids := v_recently_shown;

  -- =============================================
  -- STEP 1: DYNAMIC BUCKET SIZING
  -- Based on preference strength
  -- =============================================
  v_has_strong_prefs := (
    array_length(p_interest_ids, 1) >= 3 OR
    array_length(p_sub_interest_ids, 1) >= 2
  );

  IF v_has_strong_prefs THEN
    -- Strong preferences: more personalized content (70/15/10/5)
    v_personal_limit := 175;
    v_top_limit := 40;
    v_fresh_limit := 25;
    v_explore_limit := 15;
  ELSE
    -- Weak/no preferences: more exploration (40/30/20/10)
    v_personal_limit := 100;
    v_top_limit := 75;
    v_fresh_limit := 50;
    v_explore_limit := 25;
  END IF;

  -- =============================================
  -- STEP 2: STAGE A - CANDIDATE GENERATION
  -- Gather ~300-500 candidates from multiple sources
  -- =============================================

  -- Collect candidates from all sources
  WITH all_candidates AS (
    -- Personalized candidates
    SELECT business_id, source, interest_match_score AS score
    FROM generate_candidates_personalized(
      p_user_id,
      p_interest_ids,
      p_sub_interest_ids,
      v_excluded_ids,
      v_personal_limit
    )

    UNION ALL

    -- Top rated candidates
    SELECT business_id, source, quality_score AS score
    FROM generate_candidates_top_rated(v_excluded_ids, v_top_limit)

    UNION ALL

    -- Fresh/active candidates
    SELECT business_id, source, freshness_score AS score
    FROM generate_candidates_fresh(v_excluded_ids, v_fresh_limit)

    UNION ALL

    -- Explore/diverse candidates (pass seen sub-interests)
    SELECT business_id, source, diversity_score AS score
    FROM generate_candidates_explore(
      v_excluded_ids,
      (SELECT array_agg(DISTINCT sub_interest_id) FROM businesses WHERE id = ANY(v_excluded_ids)),
      v_explore_limit
    )
  ),
  -- Deduplicate and keep best score per business
  deduped AS (
    SELECT DISTINCT ON (business_id) business_id, source, score
    FROM all_candidates
    ORDER BY business_id, score DESC
  )
  SELECT array_agg(business_id)
  INTO v_candidate_ids
  FROM deduped;

  -- Handle empty candidate pool
  IF v_candidate_ids IS NULL OR array_length(v_candidate_ids, 1) = 0 THEN
    -- Fallback: get any active businesses
    SELECT array_agg(b.id)
    INTO v_candidate_ids
    FROM businesses b
    LEFT JOIN business_stats bs ON bs.business_id = b.id
    WHERE b.status = 'active'
      AND (v_excluded_ids IS NULL OR b.id <> ALL(v_excluded_ids))
    ORDER BY COALESCE(bs.average_rating, 0) DESC
    LIMIT 100;
  END IF;

  -- =============================================
  -- STEP 3: Apply price filter to candidates
  -- =============================================
  IF p_price_ranges IS NOT NULL AND array_length(p_price_ranges, 1) > 0 THEN
    SELECT array_agg(id)
    INTO v_candidate_ids
    FROM businesses
    WHERE id = ANY(v_candidate_ids)
      AND (price_range = ANY(p_price_ranges) OR price_range IS NULL);
  END IF;

  -- =============================================
  -- STEP 4: STAGE B - RANKING
  -- Score and rank the candidate pool
  -- =============================================
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.description,
    r.category,
    r.interest_id,
    r.sub_interest_id,
    r.location,
    r.address,
    r.phone,
    r.email,
    r.website,
    r.image_url,
    r.verified,
    r.price_range,
    r.badge,
    r.slug,
    r.latitude,
    r.longitude,
    r.created_at,
    r.updated_at,
    r.total_reviews,
    r.average_rating,
    r.percentiles,
    r.final_score AS personalization_score,
    r.diversity_rank
  FROM rank_candidates(
    v_candidate_ids,
    p_interest_ids,
    p_sub_interest_ids,
    p_latitude,
    p_longitude,
    p_limit
  ) r;

END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_candidates_personalized TO authenticated;
GRANT EXECUTE ON FUNCTION generate_candidates_personalized TO anon;
GRANT EXECUTE ON FUNCTION generate_candidates_top_rated TO authenticated;
GRANT EXECUTE ON FUNCTION generate_candidates_top_rated TO anon;
GRANT EXECUTE ON FUNCTION generate_candidates_fresh TO authenticated;
GRANT EXECUTE ON FUNCTION generate_candidates_fresh TO anon;
GRANT EXECUTE ON FUNCTION generate_candidates_explore TO authenticated;
GRANT EXECUTE ON FUNCTION generate_candidates_explore TO anon;
GRANT EXECUTE ON FUNCTION rank_candidates TO authenticated;
GRANT EXECUTE ON FUNCTION rank_candidates TO anon;
GRANT EXECUTE ON FUNCTION recommend_for_you_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION recommend_for_you_v2 TO anon;

-- Comments
COMMENT ON FUNCTION recommend_for_you_v2 IS
'Netflix-style two-stage recommender for For You feed.
Stage A: Generates 300-500 candidates from personalized, top-rated, fresh, and explore sources.
Stage B: Ranks candidates using interest match, quality, freshness, distance, and diversity scoring.
Supports repetition suppression via user_reco_impressions table.
Note: Images are fetched separately from business_images table by the API.';

COMMENT ON FUNCTION rank_candidates IS
'Stage B of the recommender: scores and ranks candidate businesses using multiple signals.
Uses Bayesian rating, exponential decay for freshness, and soft diversity constraints.';
