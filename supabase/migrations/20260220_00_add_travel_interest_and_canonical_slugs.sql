-- Add travel interest + canonical travel subcategory slugs when taxonomy tables exist.
-- Safe to run multiple times.

begin;

do $$
declare
  has_description boolean;
  has_icon boolean;
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'interests'
  ) then
    has_description := exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'interests'
        and column_name = 'description'
    );
    has_icon := exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'interests'
        and column_name = 'icon'
    );

    if has_description and has_icon then
      insert into public.interests (id, name, description, icon)
      values ('travel', 'Travel', 'Accommodation, transport, and travel services', 'airplane')
      on conflict (id) do update
      set
        name = excluded.name,
        description = coalesce(public.interests.description, excluded.description),
        icon = coalesce(public.interests.icon, excluded.icon);
    elsif has_description then
      insert into public.interests (id, name, description)
      values ('travel', 'Travel', 'Accommodation, transport, and travel services')
      on conflict (id) do update
      set
        name = excluded.name,
        description = coalesce(public.interests.description, excluded.description);
    elsif has_icon then
      insert into public.interests (id, name, icon)
      values ('travel', 'Travel', 'airplane')
      on conflict (id) do update
      set
        name = excluded.name,
        icon = coalesce(public.interests.icon, excluded.icon);
    else
      insert into public.interests (id, name)
      values ('travel', 'Travel')
      on conflict (id) do update
      set name = excluded.name;
    end if;
  end if;
end
$$;

do $$
declare
  has_interest_id boolean;
  has_category_slug boolean;
  has_label boolean;
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'canonical_subcategory_slugs'
  ) then
    has_interest_id := exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'canonical_subcategory_slugs'
        and column_name = 'interest_id'
    );
    has_category_slug := exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'canonical_subcategory_slugs'
        and column_name = 'category_slug'
    );
    has_label := exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'canonical_subcategory_slugs'
        and column_name = 'label'
    );

    if has_interest_id and has_label then
      insert into public.canonical_subcategory_slugs (slug, interest_id, label)
      values
        ('accommodation', 'travel', 'Accommodation'),
        ('transport', 'travel', 'Transport'),
        ('airports', 'travel', 'Airports'),
        ('train-stations', 'travel', 'Train Stations'),
        ('bus-stations', 'travel', 'Bus Stations'),
        ('car-rental-businesses', 'travel', 'Car Rental Businesses'),
        ('campervan-rentals', 'travel', 'Campervan Rentals'),
        ('shuttle-services', 'travel', 'Shuttle Services'),
        ('chauffeur-services', 'travel', 'Chauffeur Services'),
        ('travel-services', 'travel', 'Travel Services'),
        ('tour-guides', 'travel', 'Tour Guides'),
        ('travel-agencies', 'travel', 'Travel Agencies'),
        ('luggage-shops', 'travel', 'Luggage Shops'),
        ('travel-insurance-providers', 'travel', 'Travel Insurance Providers')
      on conflict (slug) do update
      set
        interest_id = excluded.interest_id,
        label = excluded.label;
    elsif has_category_slug and has_label then
      insert into public.canonical_subcategory_slugs (slug, category_slug, label)
      values
        ('accommodation', 'travel', 'Accommodation'),
        ('transport', 'travel', 'Transport'),
        ('airports', 'travel', 'Airports'),
        ('train-stations', 'travel', 'Train Stations'),
        ('bus-stations', 'travel', 'Bus Stations'),
        ('car-rental-businesses', 'travel', 'Car Rental Businesses'),
        ('campervan-rentals', 'travel', 'Campervan Rentals'),
        ('shuttle-services', 'travel', 'Shuttle Services'),
        ('chauffeur-services', 'travel', 'Chauffeur Services'),
        ('travel-services', 'travel', 'Travel Services'),
        ('tour-guides', 'travel', 'Tour Guides'),
        ('travel-agencies', 'travel', 'Travel Agencies'),
        ('luggage-shops', 'travel', 'Luggage Shops'),
        ('travel-insurance-providers', 'travel', 'Travel Insurance Providers')
      on conflict (slug) do update
      set
        category_slug = excluded.category_slug,
        label = excluded.label;
    elsif has_interest_id then
      insert into public.canonical_subcategory_slugs (slug, interest_id)
      values
        ('accommodation', 'travel'),
        ('transport', 'travel'),
        ('airports', 'travel'),
        ('train-stations', 'travel'),
        ('bus-stations', 'travel'),
        ('car-rental-businesses', 'travel'),
        ('campervan-rentals', 'travel'),
        ('shuttle-services', 'travel'),
        ('chauffeur-services', 'travel'),
        ('travel-services', 'travel'),
        ('tour-guides', 'travel'),
        ('travel-agencies', 'travel'),
        ('luggage-shops', 'travel'),
        ('travel-insurance-providers', 'travel')
      on conflict (slug) do update
      set interest_id = excluded.interest_id;
    elsif has_category_slug then
      insert into public.canonical_subcategory_slugs (slug, category_slug)
      values
        ('accommodation', 'travel'),
        ('transport', 'travel'),
        ('airports', 'travel'),
        ('train-stations', 'travel'),
        ('bus-stations', 'travel'),
        ('car-rental-businesses', 'travel'),
        ('campervan-rentals', 'travel'),
        ('shuttle-services', 'travel'),
        ('chauffeur-services', 'travel'),
        ('travel-services', 'travel'),
        ('tour-guides', 'travel'),
        ('travel-agencies', 'travel'),
        ('luggage-shops', 'travel'),
        ('travel-insurance-providers', 'travel')
      on conflict (slug) do update
      set category_slug = excluded.category_slug;
    elsif has_label then
      insert into public.canonical_subcategory_slugs (slug, label)
      values
        ('accommodation', 'Accommodation'),
        ('transport', 'Transport'),
        ('airports', 'Airports'),
        ('train-stations', 'Train Stations'),
        ('bus-stations', 'Bus Stations'),
        ('car-rental-businesses', 'Car Rental Businesses'),
        ('campervan-rentals', 'Campervan Rentals'),
        ('shuttle-services', 'Shuttle Services'),
        ('chauffeur-services', 'Chauffeur Services'),
        ('travel-services', 'Travel Services'),
        ('tour-guides', 'Tour Guides'),
        ('travel-agencies', 'Travel Agencies'),
        ('luggage-shops', 'Luggage Shops'),
        ('travel-insurance-providers', 'Travel Insurance Providers')
      on conflict (slug) do update
      set label = excluded.label;
    else
      insert into public.canonical_subcategory_slugs (slug)
      values
        ('accommodation'),
        ('transport'),
        ('airports'),
        ('train-stations'),
        ('bus-stations'),
        ('car-rental-businesses'),
        ('campervan-rentals'),
        ('shuttle-services'),
        ('chauffeur-services'),
        ('travel-services'),
        ('tour-guides'),
        ('travel-agencies'),
        ('luggage-shops'),
        ('travel-insurance-providers')
      on conflict (slug) do nothing;
    end if;
  end if;
end
$$;

commit;
