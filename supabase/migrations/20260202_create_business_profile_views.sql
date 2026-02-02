-- ============================================
-- Business Profile Views Tracking
-- ============================================
-- Tracks unique daily views per viewer per business.
-- Owner visits are excluded at the API layer.
-- ============================================

CREATE TABLE IF NOT EXISTS business_profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One view per viewer per business per day
  UNIQUE(business_id, viewer_id, viewed_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bpv_business_id ON business_profile_views(business_id);
CREATE INDEX IF NOT EXISTS idx_bpv_viewer_id ON business_profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_bpv_business_viewed ON business_profile_views(business_id, viewed_at DESC);

-- Enable RLS
ALTER TABLE business_profile_views ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can record a view
CREATE POLICY "Authenticated users can insert views"
  ON business_profile_views
  FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Business owners can read views for their businesses
CREATE POLICY "Business owners can read their views"
  ON business_profile_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_profile_views.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- Users can read their own view records (for dedup checks)
CREATE POLICY "Users can read own views"
  ON business_profile_views
  FOR SELECT
  USING (auth.uid() = viewer_id);

-- Cleanup function: remove views older than 90 days (optional cron)
CREATE OR REPLACE FUNCTION cleanup_old_profile_views()
RETURNS void AS $$
BEGIN
  DELETE FROM business_profile_views
  WHERE viewed_at < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Documentation
COMMENT ON TABLE business_profile_views IS 'Tracks unique daily profile views per business per viewer';
COMMENT ON COLUMN business_profile_views.viewed_at IS 'Date of the view (deduplicated per day)';
