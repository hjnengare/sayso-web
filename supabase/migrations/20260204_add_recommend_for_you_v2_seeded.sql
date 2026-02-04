-- Adds a deterministic, cache-friendly wrapper around recommend_for_you_v2.
-- - Stable ordering within a short time window via p_seed
-- - Returns uploaded_images to avoid extra round trips from the API route

CREATE OR REPLACE FUNCTION public.recommend_for_you_v2_seeded(
  p_user_id UUID DEFAULT NULL,
  p_interest_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_sub_interest_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_limit INTEGER DEFAULT 40,
  p_price_ranges TEXT[] DEFAULT NULL,
  p_suppress_recent_hours INTEGER DEFAULT 48,
  p_seed TEXT DEFAULT NULL
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
  uploaded_images TEXT[],
  personalization_score DOUBLE PRECISION,
  diversity_rank INTEGER
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH base AS (
    SELECT *
    FROM public.recommend_for_you_v2(
      p_user_id,
      p_interest_ids,
      p_sub_interest_ids,
      p_latitude,
      p_longitude,
      LEAST(GREATEST(p_limit, 40) * 2, 120),
      p_price_ranges,
      p_suppress_recent_hours
    )
  ),
  with_images AS (
    SELECT
      b.*,
      COALESCE(imgs.uploaded_images, ARRAY[]::TEXT[]) AS uploaded_images
    FROM base b
    LEFT JOIN LATERAL (
      SELECT array_agg(url ORDER BY sort_order ASC) AS uploaded_images
      FROM public.business_images bi
      WHERE bi.business_id = b.id
    ) imgs ON TRUE
  ),
  ranked AS (
    SELECT
      *,
      row_number() OVER (
        ORDER BY
          personalization_score DESC,
          md5(id::text || ':' || COALESCE(p_seed, ''))
      ) AS seeded_rank
    FROM with_images
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
    total_reviews,
    average_rating,
    percentiles,
    uploaded_images,
    personalization_score,
    diversity_rank
  FROM ranked
  ORDER BY seeded_rank
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.recommend_for_you_v2_seeded(
  UUID,
  TEXT[],
  TEXT[],
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  TEXT[],
  INTEGER,
  TEXT
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.recommend_for_you_v2_seeded(
  UUID,
  TEXT[],
  TEXT[],
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  TEXT[],
  INTEGER,
  TEXT
) TO anon;

COMMENT ON FUNCTION public.recommend_for_you_v2_seeded IS
'Deterministic wrapper around recommend_for_you_v2 that adds stable seeded ordering and returns uploaded_images.';
