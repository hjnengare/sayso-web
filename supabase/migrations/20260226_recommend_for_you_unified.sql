-- Unified For You recommendation function.
-- Replaces recommend_for_you_cold_start (no stats) and the dead recommend_for_you_v2 (wrong columns).
--
-- Design goals:
--   1. Single authoritative scoring formula used by /for-you and home "For You" section.
--   2. Joins business_stats for quality scoring - stat-absent businesses get neutral Bayesian score.
--   3. Dealbreakers that rely on stats (punctuality, friendliness) stay in Node; only
--      data-safe dealbreakers are applied here in SQL:
--        - trustworthiness  -> verified = true  (new businesses <30d are exempt)
--        - value-for-money  -> price_range IN ('$','$$') OR NULL
--        - expensive        -> price_range NOT IN ('$$$','$$$$') OR NULL
--   4. Bucket interleaving: 65% preference-matched, 20% recently added, 15% cold-start discover.
--   5. SECURITY DEFINER so RLS never blocks the full catalogue.
--   6. Same return-column shape as recommend_for_you_cold_start (no API contract change).
--      Adds: source text column for observability.

create or replace function public.recommend_for_you_unified(
  p_interest_ids      text[]            default array[]::text[],
  p_sub_interest_ids  text[]            default array[]::text[],
  p_dealbreaker_ids   text[]            default array[]::text[],
  p_price_ranges      text[]            default null,
  p_latitude          double precision  default null,
  p_longitude         double precision  default null,
  p_limit             integer           default 40,
  p_seed              text              default null
)
returns table (
  id                    uuid,
  name                  text,
  description           text,
  category              text,
  interest_id           text,
  sub_interest_id       text,
  location              text,
  address               text,
  phone                 text,
  email                 text,
  website               text,
  image_url             text,
  verified              boolean,
  price_range           text,
  badge                 text,
  slug                  text,
  latitude              double precision,
  longitude             double precision,
  created_at            timestamptz,
  updated_at            timestamptz,
  total_reviews         integer,
  average_rating        numeric,
  percentiles           jsonb,
  uploaded_images       text[],
  personalization_score double precision,
  diversity_rank        integer,
  source                text
)
language sql
stable
security definer
set search_path = public
as $$
with

-- 1. Hard filters: active, not hidden, not system/placeholder, optional price-range allow-list,
--       and data-safe dealbreakers (NULL-safe so no-stats businesses pass through).
eligible as (
  select
    b.id,
    b.name,
    b.description,
    b.primary_subcategory_slug,
    b.primary_category_slug,
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
    b.lat,
    b.lng,
    b.created_at,
    b.updated_at,
    coalesce(bs.total_reviews, 0)::integer  as total_reviews,
    coalesce(bs.average_rating, 0)::numeric as average_rating,
    bs.percentiles
  from public.businesses b
  left join public.business_stats bs on bs.business_id = b.id
  where b.status = 'active'
    and coalesce(b.is_hidden, false) = false
    and coalesce(b.is_system, false) = false
    and b.name is distinct from 'Sayso System'
    -- price-range allow-list (null b.price_range always passes)
    and (
      p_price_ranges is null
      or array_length(p_price_ranges, 1) is null
      or b.price_range is null
      or b.price_range = any(p_price_ranges)
    )
    -- dealbreaker: trustworthiness - only exclude if NOT new (<30 d) and NOT verified
    and (
      not ('trustworthiness' = any(p_dealbreaker_ids))
      or b.verified = true
      or b.created_at > now() - interval '30 days'
    )
    -- dealbreaker: value-for-money - price_range null passes (no data yet)
    and (
      not ('value-for-money' = any(p_dealbreaker_ids))
      or b.price_range is null
      or b.price_range in ('$', '$$')
    )
    -- dealbreaker: expensive - price_range null passes (no data yet)
    and (
      not ('expensive' = any(p_dealbreaker_ids))
      or b.price_range is null
      or b.price_range not in ('$$$', '$$$$')
    )
),

-- 2. Unified scoring - same formula for all businesses.
scored as (
  select
    e.*,

    -- Preference affinity (0 / 15 / 25)
    case
      when array_length(p_sub_interest_ids, 1) > 0
        and e.primary_subcategory_slug = any(p_sub_interest_ids) then 25.0
      when array_length(p_interest_ids, 1) > 0
        and e.primary_category_slug    = any(p_interest_ids)    then 15.0
      else 0.0
    end as preference_score,

    -- Bayesian quality (0–20)
    -- Uses prior mean 3.5 with weight 5; gracefully handles 0 reviews -> neutral ~10.5
    (coalesce(e.average_rating, 0) * coalesce(e.total_reviews, 0) + 3.5 * 5.0)
      / (coalesce(e.total_reviews, 0) + 5.0) * 3.0
    + least(ln(1.0 + coalesce(e.total_reviews, 0)) * 1.5, 5.0)
    as quality_score,

    -- Freshness: 45-day exponential half-life (0–10); never zero
    exp(-0.693 * extract(days from now() - coalesce(e.updated_at, e.created_at)) / 45.0) * 10.0
    as freshness_score,

    -- New-business recency boost: rewarded for being recently approved
    case
      when e.created_at > now() - interval '30 days'  then 8.0
      when e.created_at > now() - interval '90 days'  then 4.0
      else 0.0
    end as recency_boost,

    -- Quality signals (always present at creation)
    case when coalesce(e.verified, false) then 3.0 else 0.0 end as verified_bonus,
    case when e.image_url is not null and e.image_url <> '' then 2.0 else 0.0 end as image_bonus,

    -- Seeded pseudo-randomness for feed diversity across requests
    (('x' || substr(md5(e.id::text || coalesce(p_seed, '')), 1, 8))::bit(32)::bigint::float8
       / 4294967296.0) * 2.0
    as rand_score

  from eligible e
),

-- 3. Derive total score and classify each business into a bucket.
final_scored as (
  select
    s.*,
    s.preference_score + s.quality_score + s.freshness_score
      + s.recency_boost + s.verified_bonus + s.image_bonus + s.rand_score
    as final_score,

    case
      when s.preference_score > 0                        then 'preference_match'
      when s.created_at > now() - interval '30 days'     then 'new_business'
      else                                                     'cold_start'
    end as source

  from scored s
),

-- 4. Diversity cap: max rows per subcategory within each bucket.
diversity_ranked as (
  select
    fs.*,
    row_number() over (
      partition by coalesce(fs.primary_subcategory_slug, fs.primary_category_slug, 'other')
                 , fs.source
      order by fs.final_score desc
    ) as subcategory_rank
  from final_scored fs
),

-- 5. Per-bucket position for interleaving.
preference_bucket as (
  select *, row_number() over (order by final_score desc) as bucket_pos
  from diversity_ranked
  where source = 'preference_match' and subcategory_rank <= 5
),
new_biz_bucket as (
  select *, row_number() over (order by final_score desc) as bucket_pos
  from diversity_ranked
  where source = 'new_business' and subcategory_rank <= 3
),
cold_bucket as (
  select *, row_number() over (order by final_score desc) as bucket_pos
  from diversity_ranked
  where source = 'cold_start' and subcategory_rank <= 3
),

-- 6. Interleave: every 5 slots -> 3 preferred + 1 new + 1 cold.
--    Slot formula keeps preference dominant while ensuring visibility
--    for new and cold-start businesses.
interleaved as (
  select *, (bucket_pos - 1) * 5 + 0 as slot
  from preference_bucket
  where bucket_pos <= greatest(1, ceil(p_limit * 0.65))

  union all

  select *, (bucket_pos - 1) * 5 + 3 as slot
  from new_biz_bucket
  where bucket_pos <= greatest(1, ceil(p_limit * 0.20))

  union all

  select *, (bucket_pos - 1) * 5 + 4 as slot
  from cold_bucket
  where bucket_pos <= greatest(1, ceil(p_limit * 0.15))
),

-- 7. Attach uploaded images and assign final rank.
with_images as (
  select
    i.*,
    coalesce(
      (select array_agg(bi.url order by bi.is_primary desc nulls last, bi.sort_order asc nulls last)
       from public.business_images bi
       where bi.business_id = i.id),
      array[]::text[]
    ) as uploaded_images_agg,
    row_number() over (order by i.slot) as final_rank
  from interleaved i
  order by i.slot
  limit p_limit
)

select
  w.id,
  w.name,
  w.description,
  w.primary_subcategory_slug::text                as category,
  w.primary_category_slug::text                   as interest_id,
  w.primary_subcategory_slug::text                as sub_interest_id,
  w.location,
  w.address,
  w.phone,
  w.email,
  w.website,
  w.image_url,
  w.verified,
  w.price_range,
  w.badge,
  w.slug,
  w.lat                                           as latitude,
  w.lng                                           as longitude,
  w.created_at,
  w.updated_at,
  w.total_reviews,
  w.average_rating,
  w.percentiles,
  w.uploaded_images_agg                           as uploaded_images,
  w.final_score                                   as personalization_score,
  w.final_rank::integer                           as diversity_rank,
  w.source
from with_images w
order by w.final_rank;
$$;

comment on function public.recommend_for_you_unified(text[], text[], text[], text[], double precision, double precision, integer, text) is
'Unified For You recommender. Excludes hidden and system/placeholder businesses (is_hidden=true, is_system=true, name=''Sayso System''). Scores: preference affinity (0/15/25) + Bayesian quality (0-20) + freshness (0-10) + new-business boost (0/4/8) + verified +3 + image +2 + seeded rand (0-2). Bucket interleaving: 65% preference, 20% new (<30d), 15% cold-start. SQL dealbreakers: trustworthiness (exempt if <30d old), value-for-money, expensive. SECURITY DEFINER bypasses RLS.';

grant execute on function public.recommend_for_you_unified(text[], text[], text[], text[], double precision, double precision, integer, text)
  to authenticated;
grant execute on function public.recommend_for_you_unified(text[], text[], text[], text[], double precision, double precision, integer, text)
  to anon;
