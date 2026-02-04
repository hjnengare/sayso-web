-- =============================================
-- Backfill business_stats for active businesses that have no row
-- Fixes: trending/featured/top-rated MVs and RPCs only return businesses
-- that have a business_stats row (INNER JOIN). Without this, 800+ active
-- businesses can be missing stats and never appear in discovery.
--
-- After this, refresh materialized views so trending/top-rated pick up more rows:
--   SELECT refresh_business_views();
-- To recompute stats for businesses that have reviews (correct percentiles):
--   SELECT update_business_stats(id) FROM businesses WHERE status = 'active';
-- =============================================

-- Insert default stats (0 reviews, 0 rating) for every active business
-- that doesn't already have a business_stats row.
-- Percentiles match update_business_stats() zero-review defaults.
INSERT INTO business_stats (
  business_id,
  total_reviews,
  average_rating,
  rating_distribution,
  percentiles,
  updated_at
)
SELECT
  b.id,
  0,
  0.0,
  '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
  '{"punctuality": 0, "friendliness": 0, "trustworthiness": 0, "cost-effectiveness": 0}'::jsonb,
  NOW()
FROM businesses b
WHERE b.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM business_stats bs WHERE bs.business_id = b.id
  )
ON CONFLICT (business_id) DO NOTHING;
