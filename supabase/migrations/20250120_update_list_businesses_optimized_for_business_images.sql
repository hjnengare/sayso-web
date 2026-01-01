-- Migration: Update list_businesses_optimized RPC function to use business_images table
-- This replaces uploaded_images array column with business_images table query

-- Drop and recreate the function to use business_images table
DROP FUNCTION IF EXISTS list_businesses_optimized(
  INTEGER, UUID, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN, TEXT, TEXT, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION list_businesses_optimized(
  -- Pagination (keyset-based for better performance)
  p_limit INTEGER DEFAULT 20,
  p_cursor_id UUID DEFAULT NULL,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Filters
  p_category TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_verified BOOLEAN DEFAULT NULL,
  p_price_range TEXT DEFAULT NULL,
  p_badge TEXT DEFAULT NULL,
  p_min_rating DECIMAL DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  
  -- Geolocation
  p_latitude DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL,
  p_radius_km DECIMAL DEFAULT 10,
  
  -- Sorting
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  location TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  image_url TEXT,
  uploaded_images TEXT[], -- Array of image URLs from business_images table (for backward compatibility)
  verified BOOLEAN,
  price_range TEXT,
  badge TEXT,
  slug TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Stats
  total_reviews INTEGER,
  average_rating DECIMAL,
  percentiles JSONB,
  -- Computed fields
  distance_km DOUBLE PRECISION,
  -- Cursor for next page
  cursor_id UUID,
  cursor_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_has_postgis BOOLEAN;
BEGIN
  -- Check if PostGIS is available
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) INTO v_has_postgis;

  RETURN QUERY
  WITH filtered_businesses AS (
    SELECT 
      b.id,
      b.name,
      b.description,
      b.category,
      b.location,
      b.address,
      b.phone,
      b.email,
      b.website,
      b.image_url,
      -- Get images from business_images table as array (for backward compatibility)
      COALESCE(
        ARRAY(
          SELECT bi.url 
          FROM business_images bi 
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
      COALESCE(bs.total_reviews, 0) as total_reviews,
      COALESCE(bs.average_rating, 0) as average_rating,
      bs.percentiles,
      -- Calculate distance if coordinates provided
      CASE 
        WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL 
          AND b.lat IS NOT NULL AND b.lng IS NOT NULL
        THEN
          CASE 
            WHEN v_has_postgis THEN
              ST_Distance(
                ST_MakePoint(p_longitude, p_latitude)::geography,
                ST_MakePoint(b.lng, b.lat)::geography
              ) / 1000.0
            ELSE
              -- Haversine formula fallback (approximate)
              6371 * acos(
                LEAST(1.0, 
                  cos(radians(p_latitude)) * 
                  cos(radians(b.lat)) * 
                  cos(radians(b.lng) - radians(p_longitude)) + 
                  sin(radians(p_latitude)) * 
                  sin(radians(b.lat))
                )
              )
          END
        ELSE NULL
      END AS distance_km
    FROM businesses b
    LEFT JOIN business_stats bs ON b.id = bs.business_id
    WHERE b.status = 'active'
      AND (p_category IS NULL OR b.category ILIKE p_category)
      AND (p_location IS NULL OR b.location ILIKE '%' || p_location || '%')
      AND (p_verified IS NULL OR b.verified = p_verified)
      AND (p_price_range IS NULL OR b.price_range = p_price_range)
      AND (p_badge IS NULL OR b.badge = p_badge)
      AND (p_min_rating IS NULL OR COALESCE(bs.average_rating, 0) >= p_min_rating)
      AND (p_search IS NULL OR 
        b.name ILIKE '%' || p_search || '%' OR
        b.description ILIKE '%' || p_search || '%' OR
        b.category ILIKE '%' || p_search || '%' OR
        b.location ILIKE '%' || p_search || '%'
      )
      -- Cursor-based pagination
      AND (
        p_cursor_id IS NULL OR
        (p_sort_by = 'created_at' AND p_sort_order = 'desc' AND 
         (b.created_at < p_cursor_created_at OR (b.created_at = p_cursor_created_at AND b.id < p_cursor_id))) OR
        (p_sort_by = 'created_at' AND p_sort_order = 'asc' AND 
         (b.created_at > p_cursor_created_at OR (b.created_at = p_cursor_created_at AND b.id > p_cursor_id))) OR
        (p_sort_by != 'created_at' AND b.id < p_cursor_id)
      )
  ),
  sorted_businesses AS (
    SELECT *
    FROM filtered_businesses
    ORDER BY
      CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN created_at END DESC,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN created_at END ASC,
      CASE WHEN p_sort_by = 'total_reviews' AND p_sort_order = 'desc' THEN total_reviews END DESC,
      CASE WHEN p_sort_by = 'total_reviews' AND p_sort_order = 'asc' THEN total_reviews END ASC,
      CASE WHEN (p_sort_by = 'average_rating' OR p_sort_by = 'total_rating' OR p_sort_by = 'rating') AND p_sort_order = 'desc' THEN average_rating END DESC,
      CASE WHEN (p_sort_by = 'average_rating' OR p_sort_by = 'total_rating' OR p_sort_by = 'rating') AND p_sort_order = 'asc' THEN average_rating END ASC,
      CASE WHEN p_sort_by = 'distance' AND p_sort_order = 'asc' THEN distance_km END ASC,
      id DESC -- Always include id for consistent ordering
    LIMIT p_limit
  )
  SELECT 
    sb.id,
    sb.name,
    sb.description,
    sb.category,
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
    sb.distance_km,
    sb.id AS cursor_id,
    sb.created_at AS cursor_created_at
  FROM sorted_businesses sb;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION list_businesses_optimized(
  INTEGER, UUID, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN, TEXT, TEXT, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT
) TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION list_businesses_optimized(
  INTEGER, UUID, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN, TEXT, TEXT, DECIMAL, TEXT, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT
) IS 
  'Optimized business listing function with pagination, filtering, and sorting. Uses business_images table to get image URLs as array for backward compatibility.';

