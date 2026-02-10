-- Keep taxonomy columns consistent:
-- primary_category_slug should always match the parent category of primary_subcategory_slug.

begin;

with mapping(sub_slug, cat_slug) as (
  values
    ('restaurants', 'food-drink'),
    ('cafes', 'food-drink'),
    ('bars', 'food-drink'),
    ('fast-food', 'food-drink'),
    ('fine-dining', 'food-drink'),

    ('gyms', 'beauty-wellness'),
    ('spas', 'beauty-wellness'),
    ('salons', 'beauty-wellness'),
    ('wellness', 'beauty-wellness'),
    ('nail-salons', 'beauty-wellness'),

    ('education-learning', 'professional-services'),
    ('transport-travel', 'professional-services'),
    ('finance-insurance', 'professional-services'),
    ('plumbers', 'professional-services'),
    ('electricians', 'professional-services'),
    ('legal-services', 'professional-services'),

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
    ('travel-insurance-providers', 'travel'),

    ('hiking', 'outdoors-adventure'),
    ('cycling', 'outdoors-adventure'),
    ('water-sports', 'outdoors-adventure'),
    ('camping', 'outdoors-adventure'),

    ('events-festivals', 'experiences-entertainment'),
    ('sports-recreation', 'experiences-entertainment'),
    ('nightlife', 'experiences-entertainment'),
    ('comedy-clubs', 'experiences-entertainment'),
    ('cinemas', 'experiences-entertainment'),

    ('museums', 'arts-culture'),
    ('galleries', 'arts-culture'),
    ('theaters', 'arts-culture'),
    ('concerts', 'arts-culture'),

    ('family-activities', 'family-pets'),
    ('pet-services', 'family-pets'),
    ('childcare', 'family-pets'),
    ('veterinarians', 'family-pets'),

    ('fashion', 'shopping-lifestyle'),
    ('electronics', 'shopping-lifestyle'),
    ('home-decor', 'shopping-lifestyle'),
    ('books', 'shopping-lifestyle'),

    ('miscellaneous', 'miscellaneous')
)
update public.businesses b
set
  primary_category_slug = m.cat_slug,
  updated_at = now()
from mapping m
where lower(coalesce(b.primary_subcategory_slug, '')) = m.sub_slug
  and b.primary_category_slug is distinct from m.cat_slug;

commit;
