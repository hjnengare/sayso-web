DROP FUNCTION IF EXISTS public.get_similar_businesses(UUID, INTEGER, DECIMAL);

CREATE OR REPLACE FUNCTION public.get_similar_businesses(
  p_target_business_id UUID,
  p_limit INTEGER DEFAULT 12,
  p_radius_km DECIMAL DEFAULT 50.0
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
  uploaded_images TEXT[],
  verified BOOLEAN,
  price_range TEXT,
  badge TEXT,
  slug TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_reviews INTEGER,
  average_rating DECIMAL,
  percentiles JSONB,
  similarity_score DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_target_category TEXT;
  v_target_interest_id TEXT;
  v_target_sub_interest_id TEXT;
  v_target_price_range TEXT;
  v_target_lat DECIMAL;
  v_target_lng DECIMAL;
  v_target_location TEXT;
  v_has_postgis BOOLEAN;
BEGIN
  SELECT 
    b.category,
    b.interest_id,
    b.sub_interest_id,
    b.price_range,
    b.lat,
    b.lng,
    b.location
  INTO 
    v_target_category,
    v_target_interest_id,
    v_target_sub_interest_id,
    v_target_price_range,
    v_target_lat,
    v_target_lng,
    v_target_location
  FROM public.businesses b
  WHERE b.id = p_target_business_id
    AND b.status = 'active';

  IF v_target_category IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) INTO v_has_postgis;

  RETURN QUERY
  WITH scored_businesses AS (
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
      COALESCE(bs.total_reviews, 0) AS total_reviews,
      COALESCE(bs.average_rating, 0)::numeric AS average_rating,
      bs.percentiles,
      (
        (
          -- Category is mandatory and carries most weight
          CASE WHEN b.category = v_target_category THEN 60 ELSE 0 END +
          -- Sub-interest (subcategory) alignment for tighter matching
          CASE WHEN b.sub_interest_id IS NOT NULL AND b.sub_interest_id = v_target_sub_interest_id THEN 25 ELSE 0 END +
          -- Interest (parent category) alignment as secondary signal
          CASE WHEN b.interest_id IS NOT NULL AND b.interest_id = v_target_interest_id THEN 15 ELSE 0 END +
          -- Optional price range nudge (kept small)
          CASE WHEN v_target_price_range IS NOT NULL AND b.price_range = v_target_price_range THEN 5 ELSE 0 END +
          -- Geographic proximity as tie-breaker only (small weight)
          CASE 
            WHEN v_target_lat IS NOT NULL AND v_target_lng IS NOT NULL 
                 AND b.lat IS NOT NULL AND b.lng IS NOT NULL
            THEN
              CASE 
                WHEN v_has_postgis THEN
                  GREATEST(
                    0,
                    10 - (
                      ST_Distance(
                        ST_MakePoint(v_target_lng, v_target_lat)::geography,
                        ST_MakePoint(b.lng, b.lat)::geography
                      ) / 1000.0
                    ) / (p_radius_km / 10.0)
                  )
                ELSE
                  GREATEST(
                    0,
                    10 - (
                      6371 * acos(
                        LEAST(
                          1.0, 
                          cos(radians(v_target_lat)) * 
                          cos(radians(b.lat)) * 
                          cos(radians(b.lng) - radians(v_target_lng)) + 
                          sin(radians(v_target_lat)) * 
                          sin(radians(b.lat))
                        )
                      )
                    ) / (p_radius_km / 10.0)
                  )
              END
            ELSE 0
          END +
          -- Quality bonus, but only after core category match
          CASE 
            WHEN COALESCE(bs.average_rating, 0) >= 4.0 AND COALESCE(bs.total_reviews, 0) >= 5 THEN 4
            WHEN COALESCE(bs.average_rating, 0) >= 3.5 AND COALESCE(bs.total_reviews, 0) >= 3 THEN 2
            ELSE 0
          END
        )::numeric
      ) AS similarity_score,
      CASE 
        WHEN v_target_lat IS NOT NULL AND v_target_lng IS NOT NULL 
             AND b.lat IS NOT NULL AND b.lng IS NOT NULL
        THEN
          CASE 
            WHEN v_has_postgis THEN
              ST_Distance(
                ST_MakePoint(v_target_lng, v_target_lat)::geography,
                ST_MakePoint(b.lng, b.lat)::geography
              ) / 1000.0
            ELSE
              6371 * acos(
                LEAST(
                  1.0, 
                  cos(radians(v_target_lat)) * 
                  cos(radians(b.lat)) * 
                  cos(radians(b.lng) - radians(v_target_lng)) + 
                  sin(radians(v_target_lat)) * 
                  sin(radians(b.lat))
                )
              )
          END
        ELSE NULL
      END AS distance_km
    FROM public.businesses b
    LEFT JOIN public.business_stats bs ON b.id = bs.business_id
    WHERE b.id != p_target_business_id
      AND b.status = 'active'
      -- Only consider businesses sharing the primary category to avoid unrelated matches
      AND b.category = v_target_category
      -- Optional refinement signals; they do not widen beyond the category
      AND (
        (v_target_sub_interest_id IS NOT NULL AND b.sub_interest_id = v_target_sub_interest_id)
        OR (v_target_interest_id IS NOT NULL AND b.interest_id = v_target_interest_id)
        OR (
          v_target_lat IS NOT NULL AND v_target_lng IS NOT NULL 
          AND b.lat IS NOT NULL AND b.lng IS NOT NULL
          AND (
            (v_has_postgis AND ST_DWithin(
              ST_MakePoint(v_target_lng, v_target_lat)::geography,
              ST_MakePoint(b.lng, b.lat)::geography,
              p_radius_km * 1000
            ))
            OR
            (NOT v_has_postgis AND (
              6371 * acos(
                LEAST(
                  1.0, 
                  cos(radians(v_target_lat)) * 
                  cos(radians(b.lat)) * 
                  cos(radians(b.lng) - radians(v_target_lng)) + 
                  sin(radians(v_target_lat)) * 
                  sin(radians(b.lat))
                )
              )
            ) <= p_radius_km)
          )
        )
        OR (v_target_price_range IS NOT NULL AND b.price_range = v_target_price_range)
        -- If no refinement signals are available, allow same-category businesses as fallback
        OR (
          v_target_sub_interest_id IS NULL AND v_target_interest_id IS NULL AND v_target_lat IS NULL AND v_target_price_range IS NULL
        )
      )
  )
  SELECT 
    sb.id,
    sb.name,
    sb.description,
    sb.category,
    sb.interest_id,
    sb.sub_interest_id,
    sb.location,
    sb.address,
    sb.phone,
    sb.email,
    sb.website,
    sb.image_url,
    sb.uploaded_images,
    sb.verified,
    sb.price_range,
    sb.badge,
    sb.slug,
    sb.latitude,
    sb.longitude,
    sb.created_at,
    sb.updated_at,
    sb.total_reviews,
    sb.average_rating,
    sb.percentiles,
    sb.similarity_score
  FROM scored_businesses sb
  WHERE sb.distance_km IS NULL OR sb.distance_km <= p_radius_km
  ORDER BY sb.similarity_score DESC, sb.average_rating DESC, sb.total_reviews DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_similar_businesses(UUID, INTEGER, DECIMAL) TO authenticated, anon;

GRANT SELECT ON TABLE public.businesses TO anon, authenticated;
GRANT SELECT ON TABLE public.business_images TO anon, authenticated;
GRANT SELECT ON TABLE public.business_stats TO anon, authenticated;

COMMENT ON FUNCTION public.get_similar_businesses IS
  'Returns businesses similar to a target business using weighted scoring.';
