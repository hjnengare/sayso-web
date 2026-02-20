-- Update Travel taxonomy to three subcategories: accommodation, transport, travel-services.
-- Maps legacy Travel slugs to the closest new canonical slug for backward compatibility.

begin;

-- Mapping table: legacy -> new canonical (includes self-maps for new slugs to simplify label updates).
create temporary table travel_slug_map (
  old_slug text primary key,
  new_slug text not null,
  new_label text not null
);

insert into travel_slug_map (old_slug, new_slug, new_label)
values
  ('accommodation', 'accommodation', 'Accommodation'),
  ('transport', 'transport', 'Transport'),
  ('travel-services', 'travel-services', 'Travel Services'),
  ('airports', 'transport', 'Transport'),
  ('train-stations', 'transport', 'Transport'),
  ('bus-stations', 'transport', 'Transport'),
  ('car-rental-businesses', 'transport', 'Transport'),
  ('campervan-rentals', 'transport', 'Transport'),
  ('shuttle-services', 'transport', 'Transport'),
  ('chauffeur-services', 'transport', 'Transport'),
  ('tour-guides', 'travel-services', 'Travel Services'),
  ('travel-agencies', 'travel-services', 'Travel Services'),
  ('luggage-shops', 'travel-services', 'Travel Services'),
  ('travel-insurance-providers', 'travel-services', 'Travel Services');

-- 1) Update slug columns to the new canonical set wherever legacy values are stored.
do $$
declare
  rec record;
begin
  for rec in
    select table_schema, table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name in ('primary_subcategory_slug', 'sub_interest_id', 'category', 'primary_category_slug')
  loop
    execute format(
      'update %I.%I t
       set %I = m.new_slug
       from travel_slug_map m
       where lower(coalesce(t.%I, '''')) = m.old_slug
         and t.%I is distinct from m.new_slug;',
      rec.table_schema, rec.table_name, rec.column_name, rec.column_name, rec.column_name
    );
  end loop;
end $$;

-- Ensure businesses.primary_category_slug stays aligned with Travel after remap.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'businesses' and column_name = 'primary_category_slug'
  ) then
    update public.businesses b
    set primary_category_slug = 'travel'
    where lower(coalesce(b.primary_subcategory_slug, '')) in ('accommodation', 'transport', 'travel-services');
  end if;
end $$;

-- 2) Refresh labels where legacy slugs were present or labels are missing.
update public.businesses b
set primary_subcategory_label = m.new_label
from travel_slug_map m
where lower(coalesce(b.primary_subcategory_slug, '')) = m.new_slug
  and (b.primary_subcategory_label is null or b.primary_subcategory_label = '' or lower(b.primary_subcategory_label) in (
    'airports','train stations','bus stations','car rental businesses','campervan rentals','shuttle services','chauffeur services','tour guides','travel agencies','luggage shops','travel insurance providers'
  ));

-- 3) Canonical subcategory table: keep only the three Travel slugs and drop deprecated ones.
do $$
declare
  has_interest_id boolean;
  has_category_slug boolean;
  has_label boolean;
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'canonical_subcategory_slugs'
  ) then
    select
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='canonical_subcategory_slugs' and column_name='interest_id'),
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='canonical_subcategory_slugs' and column_name='category_slug'),
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='canonical_subcategory_slugs' and column_name='label')
    into has_interest_id, has_category_slug, has_label;

    delete from public.canonical_subcategory_slugs
    where slug in (
      'airports','train-stations','bus-stations','car-rental-businesses','campervan-rentals',
      'shuttle-services','chauffeur-services','tour-guides','travel-agencies','luggage-shops',
      'travel-insurance-providers'
    );

    if has_interest_id and has_label then
      insert into public.canonical_subcategory_slugs (slug, interest_id, label)
      values
        ('accommodation', 'travel', 'Accommodation'),
        ('transport', 'travel', 'Transport'),
        ('travel-services', 'travel', 'Travel Services')
      on conflict (slug) do update
      set interest_id = excluded.interest_id,
          label = excluded.label;
    elsif has_category_slug and has_label then
      insert into public.canonical_subcategory_slugs (slug, category_slug, label)
      values
        ('accommodation', 'travel', 'Accommodation'),
        ('transport', 'travel', 'Transport'),
        ('travel-services', 'travel', 'Travel Services')
      on conflict (slug) do update
      set category_slug = excluded.category_slug,
          label = excluded.label;
    elsif has_interest_id then
      insert into public.canonical_subcategory_slugs (slug, interest_id)
      values
        ('accommodation', 'travel'),
        ('transport', 'travel'),
        ('travel-services', 'travel')
      on conflict (slug) do update
      set interest_id = excluded.interest_id;
    elsif has_category_slug then
      insert into public.canonical_subcategory_slugs (slug, category_slug)
      values
        ('accommodation', 'travel'),
        ('transport', 'travel'),
        ('travel-services', 'travel')
      on conflict (slug) do update
      set category_slug = excluded.category_slug;
    elsif has_label then
      insert into public.canonical_subcategory_slugs (slug, label)
      values
        ('accommodation', 'Accommodation'),
        ('transport', 'Transport'),
        ('travel-services', 'Travel Services')
      on conflict (slug) do update
      set label = excluded.label;
    else
      insert into public.canonical_subcategory_slugs (slug)
      values ('accommodation'), ('transport'), ('travel-services')
      on conflict (slug) do nothing;
    end if;
  end if;
end $$;

commit;
