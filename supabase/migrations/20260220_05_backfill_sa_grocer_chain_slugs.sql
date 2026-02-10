-- Backfill South African grocer chains into the current canonical taxonomy.
-- There is no dedicated "grocery/supermarket" subcategory slug in the current app taxonomy,
-- so these are mapped to the closest supported slug: fast-food (food-drink).
--
-- Safety:
-- - Explicitly fixes known misclassified IDs provided by QA/user.
-- - For broader chain matching, requires either grocery signals or trusted chain domains.

begin;

with explicit_ids(id) as (
  values
    ('28a9c6f0-9719-4925-8c17-adad4bf3dfcc'::uuid), -- Checkers
    ('c663a08b-17a4-4a08-b367-166213a310a7'::uuid), -- KwikSpar
    ('18e662cf-cf69-4456-8dff-1ac2a66adc3d'::uuid), -- Spar
    ('f3400d25-96f2-487c-82b4-596da3073abe'::uuid), -- SPAR
    ('8a5e2e6a-7a89-4588-ac9c-aa532e0ef2d6'::uuid), -- SPAR
    ('0e456471-68d5-49cd-859a-aed06d3e6d12'::uuid), -- SPAR
    ('cde5ece1-b727-4e60-93cb-acafe67fdf27'::uuid)  -- SPAR
),
chain_targets as (
  select b.id
  from public.businesses b
  where
    lower(coalesce(b.name, '')) ~* '\m(checkers([[:space:]]+hyper)?|shoprite|u[[:space:]-]*save|usave|pick[[:space:]]*n[[:space:]]*pay|kwik[[:space:]-]*spar|super[[:space:]-]*spar|spar|food[[:space:]]*lover''?s([[:space:]]*market)?|boxer|ok[[:space:]]*foods?|woolworths([[:space:]]+food)?)\M'
    and (
      -- category_raw is optional across environments; read it safely from row JSON
      lower(coalesce(to_jsonb(b)->>'category_raw', '')) ~* '\m(grocery|supermarket|hypermarket|food[[:space:]]+store|convenience[[:space:]]+store)\M'
      or lower(coalesce(b.description, '')) ~* '\m(grocery|supermarket|hypermarket|food[[:space:]]+store|convenience[[:space:]]+store)\M'
      or lower(coalesce(b.website, '')) like any (array[
        '%checkers.co.za%',
        '%shoprite.co.za%',
        '%usave.co.za%',
        '%pnp.co.za%',
        '%spar.co.za%',
        '%foodloversmarket.co.za%',
        '%boxer.co.za%',
        '%okfoods.co.za%',
        '%woolworths.co.za%'
      ])
      or lower(coalesce(b.name, '')) ~* '\m(kwik[[:space:]-]*spar|super[[:space:]-]*spar|woolworths[[:space:]]+food)\M'
    )
),
targets as (
  select id from explicit_ids
  union
  select id from chain_targets
)
update public.businesses b
set
  primary_subcategory_slug = 'fast-food',
  primary_category_slug = 'food-drink',
  primary_subcategory_label = 'Fast Food',
  updated_at = now()
from targets t
where b.id = t.id
  and (
    b.primary_subcategory_slug is distinct from 'fast-food'
    or b.primary_category_slug is distinct from 'food-drink'
    or b.primary_subcategory_label is distinct from 'Fast Food'
  );

commit;
