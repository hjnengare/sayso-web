-- ============================================================================
-- Curated Businesses Algorithm
-- Returns top3 businesses for hero display and next10 for the list below
-- Uses Bayesian rating adjustment, popularity scoring, freshness, and diversity
-- ============================================================================

-- Drop existing function if it exists (for updates)
DROP FUNCTION IF EXISTS get_curated_businesses(TEXT, INTEGER, DOUBLE PRECISION, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION get_curated_businesses(
  p_interest_id TEXT DEFAULT NULL,           -- NULL = all interests
  p_limit INTEGER DEFAULT 13,                -- Total businesses to return (3 + 10)
  p_user_lat DOUBLE PRECISION DEFAULT NULL,  -- User latitude for distance boost
  p_user_lng DOUBLE PRECISION DEFAULT NULL   -- User longitude for distance boost
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  image_url TEXT,
  category TEXT,
  sub_interest_id TEXT,
  interest_id TEXT,
  description TEXT,
  location TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  average_rating DECIMAL(3,2),
  total_reviews INTEGER,
  verified BOOLEAN,
  owner_verified BOOLEAN,
  slug TEXT,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  curation_score DECIMAL(12,8),
  is_top3 BOOLEAN,
  rank_position INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Bayesian prior parameters (tunable)
  v_prior_mean DECIMAL := 4.0;       -- Prior mean rating
  v_prior_weight INTEGER := 5;        -- Prior review count weight
  
  -- Quality gate thresholds
  v_min_reviews_top3 INTEGER := 3;    -- Minimum reviews for top 3
  v_min_saves_top3 INTEGER := 5;      -- Alternative: minimum saves for top 3
  v_min_views_top3 INTEGER := 50;     -- Alternative: minimum impressions for top 3
  
  -- Scoring weights (must sum to ~1.0 excluding verified boost)
  v_weight_rating DECIMAL := 0.55;
  v_weight_popularity DECIMAL := 0.20;
  v_weight_freshness DECIMAL := 0.15;
  v_weight_distance DECIMAL := 0.10;
  v_verified_boost DECIMAL := 0.05;
  
  -- Freshness half-life in days
  v_freshness_halflife INTEGER := 30;
  
  -- Distance decay (20km = 0 boost)
  v_max_distance_km DECIMAL := 20.0;
  
  -- Diversity: minimum distance between top 3 picks (meters)
  v_min_diversity_meters DECIMAL := 200.0;
BEGIN
  RETURN QUERY
  WITH 
  -- ========================================================================
  -- Step 1: Gather base business data with stats
  -- ========================================================================
  business_base AS (
    SELECT
      b.id,
      b.name,
      COALESCE(b.image_url, '') as image_url,
      b.category,
      b.sub_interest_id,
      b.interest_id,
      b.description,
      b.location,
      b.lat,
      b.lng,
      COALESCE(bs.average_rating, 0)::DECIMAL(3,2) as avg_rating,
      COALESCE(bs.total_reviews, 0) as review_count,
      b.verified,
      COALESCE(b.owner_verified, false) as owner_verified,
      b.slug,
      COALESCE(b.last_activity_at, b.updated_at, b.created_at) as last_activity_at,
      b.created_at
    FROM businesses b
    LEFT JOIN business_stats bs ON bs.business_id = b.id
    WHERE b.status = 'active'
      -- Filter by interest if specified
      AND (p_interest_id IS NULL OR b.interest_id = p_interest_id OR b.sub_interest_id = p_interest_id OR b.category = p_interest_id)
  ),
  
  -- ========================================================================
  -- Step 2: Get save counts per business
  -- ========================================================================
  save_counts AS (
    SELECT 
      business_id,
      COUNT(*)::INTEGER as save_count
    FROM saved_businesses
    GROUP BY business_id
  ),
  
  -- ========================================================================
  -- Step 3: Get impression counts per business (proxy for views)
  -- ========================================================================
  impression_counts AS (
    SELECT 
      business_id,
      COUNT(*)::INTEGER as impression_count
    FROM user_reco_impressions
    GROUP BY business_id
  ),
  
  -- ========================================================================
  -- Step 4: Calculate all scoring components
  -- ========================================================================
  scored_businesses AS (
    SELECT
      bb.*,
      COALESCE(sc.save_count, 0) as saves,
      COALESCE(ic.impression_count, 0) as views,
      
      -- Bayesian weighted rating: (avg_rating * review_count + prior_mean * prior_weight) / (review_count + prior_weight)
      CASE 
        WHEN bb.review_count + v_prior_weight > 0 THEN
          (bb.avg_rating * bb.review_count + v_prior_mean * v_prior_weight) / (bb.review_count + v_prior_weight)
        ELSE v_prior_mean
      END as weighted_rating,
      
      -- Popularity: log-scaled engagement (saves heavily weighted since we track them)
      -- popularity = log(1 + views) * 0.2 + log(1 + saves) * 0.6 + log(1 + clicks) * 0.2
      -- Since we don't have clicks, redistribute: views 0.3, saves 0.7
      (
        LN(1 + COALESCE(ic.impression_count, 0)) * 0.3 +
        LN(1 + COALESCE(sc.save_count, 0)) * 0.7
      ) as raw_popularity,
      
      -- Freshness: exp(-days_since_last_activity / 30)
      EXP(-EXTRACT(DAYS FROM NOW() - COALESCE(bb.last_activity_at, bb.created_at)) / v_freshness_halflife) as freshness,
      
      -- Distance boost (only if user location provided)
      CASE 
        WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL AND bb.lat IS NOT NULL AND bb.lng IS NOT NULL THEN
          GREATEST(0, 1 - (
            -- Haversine approximation for distance in km
            6371 * 2 * ASIN(SQRT(
              POWER(SIN((RADIANS(bb.lat) - RADIANS(p_user_lat)) / 2), 2) +
              COS(RADIANS(p_user_lat)) * COS(RADIANS(bb.lat)) *
              POWER(SIN((RADIANS(bb.lng) - RADIANS(p_user_lng)) / 2), 2)
            )) / v_max_distance_km
          ))
        ELSE 0.5  -- Neutral boost when no location
      END as distance_boost,
      
      -- Verified boost
      CASE WHEN bb.verified OR COALESCE(bb.owner_verified, false) THEN v_verified_boost ELSE 0 END as verified_boost,
      
      -- Quality gate check for top 3
      CASE 
        WHEN bb.review_count >= v_min_reviews_top3 THEN true
        WHEN COALESCE(sc.save_count, 0) >= v_min_saves_top3 THEN true
        WHEN COALESCE(ic.impression_count, 0) >= v_min_views_top3 THEN true
        ELSE false
      END as meets_quality_gate
      
    FROM business_base bb
    LEFT JOIN save_counts sc ON sc.business_id = bb.id
    LEFT JOIN impression_counts ic ON ic.business_id = bb.id
  ),
  
  -- ========================================================================
  -- Step 5: Normalize scores and calculate final curation score
  -- ========================================================================
  normalized_scores AS (
    SELECT
      sb.*,
      -- Normalize weighted_rating to 0-1 (assuming 1-5 scale, so (rating-1)/4)
      GREATEST(0, LEAST(1, (sb.weighted_rating - 1) / 4)) as norm_rating,
      -- Normalize popularity (use max in dataset)
      sb.raw_popularity / NULLIF(MAX(sb.raw_popularity) OVER (), 0) as norm_popularity
    FROM scored_businesses sb
  ),
  
  final_scores AS (
    SELECT
      ns.*,
      -- Final curation score
      (
        v_weight_rating * ns.norm_rating +
        v_weight_popularity * COALESCE(ns.norm_popularity, 0) +
        v_weight_freshness * ns.freshness +
        v_weight_distance * ns.distance_boost +
        ns.verified_boost
      ) as curation_score
    FROM normalized_scores ns
  ),
  
  -- ========================================================================
  -- Step 6: Rank all businesses for selection
  -- ========================================================================
  ranked_all AS (
    SELECT
      fs.*,
      ROW_NUMBER() OVER (
        ORDER BY 
          fs.curation_score DESC,
          fs.review_count DESC,
          fs.saves DESC,
          fs.created_at DESC,
          fs.id ASC
      ) as initial_rank
    FROM final_scores fs
  ),
  
  -- ========================================================================
  -- Step 7: Select Top 3 with quality gates and diversity
  -- Using a simpler iterative approach via window functions
  -- ========================================================================
  
  -- Get quality candidates first, then fallback candidates
  quality_candidates AS (
    SELECT 
      ra.*,
      ROW_NUMBER() OVER (ORDER BY ra.curation_score DESC, ra.initial_rank) as quality_rank
    FROM ranked_all ra
    WHERE ra.meets_quality_gate = true
  ),
  
  -- Fallback: all businesses ordered by freshness for cold start
  fallback_candidates AS (
    SELECT 
      ra.*,
      ROW_NUMBER() OVER (ORDER BY ra.freshness DESC, ra.curation_score DESC, ra.initial_rank) as fallback_rank
    FROM ranked_all ra
  ),
  
  -- Select top 3: prefer quality candidates, use diversity-aware selection
  -- For simplicity, we'll pick top 3 from quality candidates
  -- and apply diversity post-hoc (skip if too close to previous picks)
  top3_raw AS (
    SELECT 
      qc.*,
      -- Calculate distance to all higher-ranked candidates
      (
        SELECT MIN(
          CASE 
            WHEN qc2.lat IS NULL OR qc2.lng IS NULL OR qc.lat IS NULL OR qc.lng IS NULL THEN 99999
            ELSE 6371000 * 2 * ASIN(SQRT(
              POWER(SIN((RADIANS(qc.lat) - RADIANS(qc2.lat)) / 2), 2) +
              COS(RADIANS(qc2.lat)) * COS(RADIANS(qc.lat)) *
              POWER(SIN((RADIANS(qc.lng) - RADIANS(qc2.lng)) / 2), 2)
            ))
          END
        )
        FROM quality_candidates qc2
        WHERE qc2.quality_rank < qc.quality_rank
      ) as min_dist_to_higher
    FROM quality_candidates qc
    WHERE qc.quality_rank <= 10  -- Consider top 10 for diversity selection
  ),
  
  -- Final top 3 selection with diversity
  top3_selected AS (
    SELECT 
      tr.*,
      ROW_NUMBER() OVER (
        ORDER BY 
          -- Penalize if too close to a higher-ranked pick
          CASE WHEN COALESCE(tr.min_dist_to_higher, 99999) < v_min_diversity_meters THEN 1 ELSE 0 END,
          tr.quality_rank
      ) as diversity_rank
    FROM top3_raw tr
  ),
  
  -- Get final top 3 (with fallback if not enough quality candidates)
  top3_final AS (
    SELECT 
      t.id, t.name, t.image_url, t.category, t.sub_interest_id, t.interest_id,
      t.description, t.location, t.lat, t.lng, t.avg_rating, t.review_count,
      t.verified, t.owner_verified, t.slug, t.last_activity_at, t.created_at,
      t.curation_score, t.saves, t.freshness,
      true as is_top3,
      t.diversity_rank::INTEGER as rank_position
    FROM top3_selected t
    WHERE t.diversity_rank <= 3
  ),
  
  -- Add fallback businesses if top3 has fewer than 3
  top3_with_fallback AS (
    -- First: businesses from quality selection
    SELECT * FROM top3_final
    
    UNION ALL
    
    -- Fallback: add from fallback_candidates if needed
    SELECT 
      fc.id, fc.name, fc.image_url, fc.category, fc.sub_interest_id, fc.interest_id,
      fc.description, fc.location, fc.lat, fc.lng, fc.avg_rating, fc.review_count,
      fc.verified, fc.owner_verified, fc.slug, fc.last_activity_at, fc.created_at,
      fc.curation_score, fc.saves, fc.freshness,
      true as is_top3,
      (fc.fallback_rank + (SELECT COUNT(*) FROM top3_final))::INTEGER as rank_position
    FROM fallback_candidates fc
    WHERE fc.id NOT IN (SELECT id FROM top3_final)
      AND (SELECT COUNT(*) FROM top3_final) < 3
      AND fc.fallback_rank <= (3 - (SELECT COUNT(*) FROM top3_final))
  ),
  
  -- ========================================================================
  -- Step 8: Get next 10 (excluding top 3)
  -- ========================================================================
  next10_selected AS (
    SELECT 
      ra.id, ra.name, ra.image_url, ra.category, ra.sub_interest_id, ra.interest_id,
      ra.description, ra.location, ra.lat, ra.lng, ra.avg_rating, ra.review_count,
      ra.verified, ra.owner_verified, ra.slug, ra.last_activity_at, ra.created_at,
      ra.curation_score, ra.saves, ra.freshness,
      false as is_top3,
      (ROW_NUMBER() OVER (ORDER BY ra.curation_score DESC, ra.initial_rank) + 3)::INTEGER as rank_position
    FROM ranked_all ra
    WHERE ra.id NOT IN (SELECT id FROM top3_with_fallback)
  ),
  
  -- ========================================================================
  -- Step 9: Combine results
  -- ========================================================================
  final_result AS (
    SELECT * FROM top3_with_fallback WHERE rank_position <= 3
    UNION ALL
    SELECT * FROM next10_selected WHERE rank_position <= 13
  )
  
  -- Return final results
  SELECT
    fr.id,
    fr.name,
    fr.image_url,
    fr.category,
    fr.sub_interest_id,
    fr.interest_id,
    fr.description,
    fr.location,
    fr.lat,
    fr.lng,
    fr.avg_rating as average_rating,
    fr.review_count as total_reviews,
    fr.verified,
    fr.owner_verified,
    fr.slug,
    fr.last_activity_at,
    fr.created_at,
    fr.curation_score,
    fr.is_top3,
    fr.rank_position
  FROM final_result fr
  ORDER BY fr.is_top3 DESC, fr.rank_position ASC
  LIMIT p_limit;
  
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_curated_businesses TO authenticated;
GRANT EXECUTE ON FUNCTION get_curated_businesses TO anon;

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_interest_status 
ON businesses(interest_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_businesses_sub_interest_status 
ON businesses(sub_interest_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_saved_businesses_business_id 
ON saved_businesses(business_id);

CREATE INDEX IF NOT EXISTS idx_user_reco_impressions_business 
ON user_reco_impressions(business_id);

-- Comments
COMMENT ON FUNCTION get_curated_businesses IS
'Advanced curation algorithm for Sayso homepage.

Returns top 3 businesses (for hero carousel) and next 10 (for list) per interest.

Scoring formula:
- 55% Bayesian-adjusted rating (prior: 4.0, weight: 5 reviews)
- 20% Log-scaled popularity (saves + impressions)
- 15% Freshness (exponential decay, 30-day half-life)
- 10% Distance boost (if user location provided)
- +5% Verified business boost

Quality gates for top 3: requires reviews >= 3 OR saves >= 5 OR views >= 50
Diversity: top 3 picks penalized if < 200m apart (if location data available)
Cold start fallback: uses freshness + newest businesses

Parameters:
- p_interest_id: Filter by interest (NULL = all interests)
- p_limit: Total businesses to return (default 13 = 3 + 10)
- p_user_lat/lng: User location for distance boost';
