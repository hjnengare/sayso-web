-- Optimize home feed APIs (featured, events-and-specials, trending, similar)
-- Adds indexes for common filters/sorts and runs ANALYZE after taxonomy changes.

begin;

-- Events & specials: fast filter by current/ upcoming and ordering by start_date.
create index if not exists idx_events_and_specials_period
  on public.events_and_specials (coalesce(end_date, start_date), start_date);
create index if not exists idx_events_and_specials_type_start
  on public.events_and_specials (type, start_date);

-- Reviews: recent counts per business.
create index if not exists idx_reviews_business_created_at
  on public.reviews (business_id, created_at desc);

-- Business images: fetch primary + newest first.
create index if not exists idx_business_images_business_primary_created_at
  on public.business_images (business_id, is_primary desc, created_at desc);

-- Businesses: active/visible filter plus primary taxonomy + recency.
create index if not exists idx_businesses_active_visible_primary
  on public.businesses (primary_subcategory_slug, primary_category_slug, last_activity_at desc)
  where status = 'active'
    and (is_hidden is null or is_hidden = false)
    and (is_system is null or is_system = false);

-- Ensure stats lookups by business_id are efficient (usually PK, but keep for safety).
create index if not exists idx_business_stats_business_id
  on public.business_stats (business_id);

-- Refresh planner stats after taxonomy refactors.
analyze public.events_and_specials;
analyze public.reviews;
analyze public.business_images;
analyze public.businesses;
analyze public.business_stats;

commit;
