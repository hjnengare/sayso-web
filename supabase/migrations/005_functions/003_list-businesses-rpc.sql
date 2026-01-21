-- =============================================
-- RPC Function: list_businesses_optimized
-- Complex business listing logic in one database call
-- Includes filtering, sorting, pagination, and stats
-- =============================================

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
  uploaded_image TEXT,
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
      b.uploaded_image,
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
      -- Calculate distance if geolocation provided (using Haversine formula as fallback)
      CASE 
        WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL 
             AND b.lat IS NOT NULL AND b.lng IS NOT NULL THEN
          -- Haversine formula for distance calculation
          6371 * acos(
            cos(radians(p_latitude)) * 
            cos(radians(b.lat)) * 
            cos(radians(b.lng) - radians(p_longitude)) + 
            sin(radians(p_latitude)) * 
            sin(radians(b.lat))
          )
        ELSE NULL
      END as distance_km
    FROM businesses b
    LEFT JOIN business_stats bs ON b.id = bs.business_id
    WHERE 
      -- Always filter to active businesses
      b.status = 'active'
      
      -- Keyset pagination (cursor-based)
      AND (
        p_cursor_id IS NULL 
        OR (p_sort_order = 'desc' AND b.created_at < p_cursor_created_at)
        OR (p_sort_order = 'asc' AND b.created_at > p_cursor_created_at)
        OR (b.created_at = p_cursor_created_at AND b.id > p_cursor_id)
      )
      
      -- Category filter
      AND (p_category IS NULL OR b.category = p_category)
      
      -- Location filter (text search)
      AND (p_location IS NULL OR b.location ILIKE '%' || p_location || '%')
      
      -- Verified filter
      AND (p_verified IS NULL OR b.verified = p_verified)
      
      -- Price range filter
      AND (p_price_range IS NULL OR b.price_range = p_price_range)
      
      -- Badge filter
      AND (p_badge IS NULL OR b.badge = p_badge)
      
      -- Minimum rating filter
      AND (p_min_rating IS NULL OR COALESCE(bs.average_rating, 0) >= p_min_rating)
      
      -- Full-text search
      AND (p_search IS NULL OR b.search_vector @@ websearch_to_tsquery('english', p_search))
      
      -- Geographic radius filter (using Haversine formula)
      AND (
        p_latitude IS NULL 
        OR p_longitude IS NULL
        OR b.lat IS NULL 
        OR b.lng IS NULL
        OR (
          -- Distance in km using Haversine
          6371 * acos(
            cos(radians(p_latitude)) * 
            cos(radians(b.lat)) * 
            cos(radians(b.lng) - radians(p_longitude)) + 
            sin(radians(p_latitude)) * 
            sin(radians(b.lat))
          ) <= p_radius_km
        )
      )
  ),
  sorted_businesses AS (
    SELECT fb.*
    FROM filtered_businesses fb
    ORDER BY
      CASE WHEN p_sort_by = 'rating' AND p_sort_order = 'desc' THEN fb.average_rating END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'rating' AND p_sort_order = 'asc' THEN fb.average_rating END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'reviews' AND p_sort_order = 'desc' THEN fb.total_reviews END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'reviews' AND p_sort_order = 'asc' THEN fb.total_reviews END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'distance' AND p_sort_order = 'asc' THEN fb.distance_km END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'distance' AND p_sort_order = 'desc' THEN fb.distance_km END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN fb.name END ASC,
      CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN fb.name END DESC,
      -- Default: created_at with secondary sort by id for consistency
      CASE WHEN p_sort_order = 'desc' THEN fb.created_at END DESC NULLS LAST,
      CASE WHEN p_sort_order = 'asc' THEN fb.created_at END ASC NULLS LAST,
      fb.id
    LIMIT p_limit
  )
  SELECT 
    sb.*,
    sb.id as cursor_id,
    sb.created_at as cursor_created_at
  FROM sorted_businesses sb;
END;
$$;

-- =============================================
-- Grant permissions
-- =============================================

GRANT EXECUTE ON FUNCTION list_businesses_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION list_businesses_optimized TO anon;

-- =============================================
-- Add comment for documentation
-- =============================================

COMMENT ON FUNCTION list_businesses_optimized IS 
'Optimized business listing with filtering, sorting, keyset pagination, and distance calculations. 
Returns businesses with stats in a single query. Use cursor_id and cursor_created_at from last result for next page.';

-- =============================================
-- Example Usage:
-- =============================================

-- Get first page of restaurants in Cape Town
-- SELECT * FROM list_businesses_optimized(
--   p_limit := 20,
--   p_category := 'restaurant',
--   p_location := 'Cape Town'
-- );

-- Get next page (using cursor from previous result)
-- SELECT * FROM list_businesses_optimized(
--   p_limit := 20,
--   p_cursor_id := 'uuid-from-last-result',
--   p_cursor_created_at := 'timestamp-from-last-result',
--   p_category := 'restaurant',
--   p_location := 'Cape Town'
-- );

-- Search verified restaurants near coordinates
-- SELECT * FROM list_businesses_optimized(
--   p_limit := 20,
--   p_category := 'restaurant',
--   p_verified := true,
--   p_latitude := -33.9249,
--   p_longitude := 18.4241,
--   p_radius_km := 5,
--   p_sort_by := 'distance',
--   p_sort_order := 'asc'
-- );

-- Full-text search
-- SELECT * FROM list_businesses_optimized(
--   p_limit := 20,
--   p_search := 'pizza italian',
--   p_sort_by := 'rating',
--   p_sort_order := 'desc'
-- );

