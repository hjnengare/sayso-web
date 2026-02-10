-- Fix supermarket chain businesses that were misclassified (e.g. cinemas/miscellaneous).
-- Note: current canonical taxonomy has no dedicated grocery subcategory slug, so
-- these are mapped to the closest existing food subcategory: fast-food.

begin;

with targets as (
  select b.id
  from public.businesses b
  where
    -- Explicit chains called out
    lower(coalesce(b.name, '')) ~* '\m(checkers|kwik[[:space:]-]*spar)\M'
    or (
      -- SPAR records only when we have grocery/supermarket evidence
      lower(coalesce(b.name, '')) ~* '\mspar\M'
      and (
        -- category_raw is optional across environments; read it safely from row JSON
        lower(coalesce(to_jsonb(b)->>'category_raw', '')) ~* '\m(supermarket|grocery)\M'
        or lower(coalesce(b.description, '')) ~* '\m(supermarket|grocery)\M'
        or lower(coalesce(b.website, '')) like '%spar.%'
      )
    )
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
