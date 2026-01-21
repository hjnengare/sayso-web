-- =============================================
-- Performance Optimization: Composite Indexes
-- Add composite indexes for common query patterns
-- =============================================

-- Drop existing single-column indexes that will be replaced by composite ones
DROP INDEX IF EXISTS idx_businesses_category;
DROP INDEX IF EXISTS idx_businesses_status;
DROP INDEX IF EXISTS idx_businesses_verified;
DROP INDEX IF EXISTS idx_businesses_created_at;

-- =============================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- =============================================

-- Most common query: active businesses by category (for category browsing)
CREATE INDEX IF NOT EXISTS idx_businesses_status_category 
  ON businesses(status, category) 
  WHERE status = 'active';

-- Active businesses sorted by creation date (for "New" listings)
CREATE INDEX IF NOT EXISTS idx_businesses_status_created_at 
  ON businesses(status, created_at DESC) 
  WHERE status = 'active';

-- Active verified businesses (for "Verified" filter)
CREATE INDEX IF NOT EXISTS idx_businesses_status_verified 
  ON businesses(status, verified) 
  WHERE status = 'active' AND verified = true;

-- Active businesses by category and verified status (combined filter)
CREATE INDEX IF NOT EXISTS idx_businesses_status_category_verified 
  ON businesses(status, category, verified) 
  WHERE status = 'active';

-- Active businesses by category and price range (common filter combo)
CREATE INDEX IF NOT EXISTS idx_businesses_status_category_price 
  ON businesses(status, category, price_range) 
  WHERE status = 'active';

-- Business location searches (for "near me" features)
CREATE INDEX IF NOT EXISTS idx_businesses_status_location 
  ON businesses(status, location) 
  WHERE status = 'active';

-- Owner lookup (for business management dashboard)
CREATE INDEX IF NOT EXISTS idx_businesses_owner_status 
  ON businesses(owner_id, status) 
  WHERE owner_id IS NOT NULL;

-- =============================================
-- GEOSPATIAL INDEX (GiST) - If using lat/lng
-- =============================================

-- Check if latitude and longitude columns exist (from OSM migration)
-- This enables fast geographic queries
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'lat'
  ) THEN
    -- Create a point column for efficient spatial queries
    ALTER TABLE businesses 
      ADD COLUMN IF NOT EXISTS geo_point GEOMETRY(Point, 4326);
    
    -- Update existing rows to populate geo_point
    UPDATE businesses 
    SET geo_point = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    WHERE lat IS NOT NULL AND lng IS NOT NULL;
    
    -- Create spatial index (GiST)
    CREATE INDEX IF NOT EXISTS idx_businesses_geo_point 
      ON businesses USING GIST(geo_point);
    
    -- Create a trigger to keep geo_point in sync
    CREATE OR REPLACE FUNCTION update_geo_point()
    RETURNS TRIGGER AS $func$
    BEGIN
      IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
        NEW.geo_point = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
      ELSE
        NEW.geo_point = NULL;
      END IF;
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
    
    DROP TRIGGER IF EXISTS businesses_geo_point_update ON businesses;
    CREATE TRIGGER businesses_geo_point_update
      BEFORE INSERT OR UPDATE OF lat, lng ON businesses
      FOR EACH ROW
      EXECUTE FUNCTION update_geo_point();
  END IF;
END $$;

-- =============================================
-- BUSINESS STATS COMPOSITE INDEXES
-- =============================================

-- Drop single-column indexes
DROP INDEX IF EXISTS idx_business_stats_rating;
DROP INDEX IF EXISTS idx_business_stats_reviews;

-- Most popular: sort by rating (descending)
CREATE INDEX IF NOT EXISTS idx_business_stats_rating_reviews 
  ON business_stats(average_rating DESC, total_reviews DESC) 
  WHERE average_rating > 0;

-- Sort by review count (for "Most Reviewed")
CREATE INDEX IF NOT EXISTS idx_business_stats_reviews_rating 
  ON business_stats(total_reviews DESC, average_rating DESC) 
  WHERE total_reviews > 0;

-- =============================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- =============================================

-- Only index businesses that actually have badges
CREATE INDEX IF NOT EXISTS idx_businesses_badge_status 
  ON businesses(badge, status) 
  WHERE badge IS NOT NULL AND status = 'active';

-- Index for slug lookups (used in business detail pages)
-- Already have UNIQUE on slug, but add covering index for faster lookups
CREATE INDEX IF NOT EXISTS idx_businesses_slug_status 
  ON businesses(slug, status);

-- Index for source/source_id lookups (for OSM deduplication during seeding)
CREATE INDEX IF NOT EXISTS idx_businesses_source_id 
  ON businesses(source, source_id) 
  WHERE source IS NOT NULL AND source_id IS NOT NULL;

-- =============================================
-- ANALYZE TABLES
-- =============================================

-- Update table statistics for query planner
ANALYZE businesses;
ANALYZE business_stats;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON INDEX idx_businesses_status_category IS 'Composite index for category browsing - most common query pattern';
COMMENT ON INDEX idx_businesses_status_created_at IS 'Index for sorting by newest first';
COMMENT ON INDEX idx_businesses_status_verified IS 'Partial index for verified businesses filter';
COMMENT ON INDEX idx_business_stats_rating_reviews IS 'Composite index for sorting by rating and reviews';

-- Add comment on geo_point index only if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_businesses_geo_point'
  ) THEN
    COMMENT ON INDEX idx_businesses_geo_point IS 'GiST spatial index for geographic queries (near me features)';
  END IF;
END $$;

