-- Backfill better taxonomy slugs for rows currently in miscellaneous based on strong keywords.
-- Safety:
-- - Only updates rows currently marked miscellaneous (category or subcategory).
-- - Picks the highest-priority matching rule per row.

begin;

with rules(priority, pattern, sub_slug, cat_slug) as (
  values
    -- Education
    (10, '\m(high[[:space:]]+school|primary[[:space:]]+school|secondary[[:space:]]+school|college|academy|university|kindergarten|preschool|educare|daycare|childcare|tuition|tutoring|institute|polytechnic|tvet)\M', 'education-learning', 'professional-services'),

    -- Health / pet
    (20, '\m(vet|veterinary)\M', 'veterinarians', 'family-pets'),
    (21, '\m(pet[[:space:]]+shop|pet[[:space:]]+groom|pet[[:space:]]+care)\M', 'pet-services', 'family-pets'),

    -- Food and drink
    (30, '\m(kfc|mcdonalds?|burger[[:space:]]+king|wimpy|steers|nando''?s|spur)\M', 'fast-food', 'food-drink'),
    (31, '\m(cafe|coffee|espresso|roastery|juice[[:space:]]+bar)\M', 'cafes', 'food-drink'),
    (32, '\m(pub|bar|taproom|brewery|cocktail)\M', 'bars', 'food-drink'),
    (33, '\m(restaurant|eatery|bistro|trattoria|ristorante|pizzeria|grill)\M', 'restaurants', 'food-drink'),

    -- Culture / entertainment
    (40, '\m(museum)\M', 'museums', 'arts-culture'),
    (41, '\m(gallery)\M', 'galleries', 'arts-culture'),
    (42, '\m(theatre|theater|playhouse|artscape)\M', 'theaters', 'arts-culture'),
    (43, '\m(cinema|movie[[:space:]]+theatre|movie[[:space:]]+theater)\M', 'cinemas', 'experiences-entertainment'),
    (44, '\m(comedy|stand[[:space:]]*up)\M', 'comedy-clubs', 'experiences-entertainment'),
    (45, '\m(nightclub|lounge|dance[[:space:]]+club)\M', 'nightlife', 'experiences-entertainment'),
    (46, '\m(concert|live[[:space:]]+music)\M', 'concerts', 'arts-culture'),
    (47, '\m(event|festival|expo|convention)\M', 'events-festivals', 'experiences-entertainment'),

    -- Outdoors / recreation
    (50, '\m(trail|hike|hiking|peak|mountain|beacon|hill)\M', 'hiking', 'outdoors-adventure'),
    (51, '\m(beach|surf|promenade|harbour|harbor|lighthouse|marina)\M', 'water-sports', 'outdoors-adventure'),
    (52, '\m(stadium|rugby|sports[[:space:]]+club|sports[[:space:]]+center|sports[[:space:]]+centre)\M', 'sports-recreation', 'experiences-entertainment'),
    (53, '\m(park|playground|family)\M', 'family-activities', 'family-pets'),

    -- Beauty / wellness
    (60, '\m(gym|fitness)\M', 'gyms', 'beauty-wellness'),
    (61, '\m(spa|massage)\M', 'spas', 'beauty-wellness'),
    (62, '\m(salon|barber|nail[[:space:]]+salon)\M', 'salons', 'beauty-wellness'),

    -- Professional / travel / shopping
    (69, '\m(travel[[:space:]-]*insurance)\M', 'travel-insurance-providers', 'travel'),
    (70, '\m(bank|insurance|financial)\M', 'finance-insurance', 'professional-services'),
    (71, '\m(attorney|lawyer|legal|advocate)\M', 'legal-services', 'professional-services'),
    (72, '\m(airport|aerodrome|airfield)\M', 'airports', 'travel'),
    (73, '\m(train[[:space:]-]*station|railway[[:space:]-]*station)\M', 'train-stations', 'travel'),
    (74, '\m(bus[[:space:]-]*(station|terminal)|taxi[[:space:]-]*rank)\M', 'bus-stations', 'travel'),
    (75, '\m(car[[:space:]-]*(rental|hire)|rent[[:space:]-]*a[[:space:]-]*car|avis|hertz|europcar|budget)\M', 'car-rental-businesses', 'travel'),
    (76, '\m(campervan|motorhome)\M', 'campervan-rentals', 'travel'),
    (77, '\m(shuttle)\M', 'shuttle-services', 'travel'),
    (78, '\m(chauffeur)\M', 'chauffeur-services', 'travel'),
    (79, '\m(tour[[:space:]-]*guide)\M', 'tour-guides', 'travel'),
    (80, '\m(travel[[:space:]-]*agency)\M', 'travel-agencies', 'travel'),
    (81, '\m(travel[[:space:]-]*service|tour[[:space:]-]*operator)\M', 'travel-services', 'travel'),
    (82, '\m(hotel|hostel|lodge|guest[[:space:]-]*house|guesthouse|accommodation)\M', 'accommodation', 'travel'),
    (83, '\m(luggage|suitcase|travel[[:space:]-]*bag)\M', 'luggage-shops', 'travel'),
    (90, '\m(fashion|boutique|clothing|apparel)\M', 'fashion', 'shopping-lifestyle'),
    (91, '\m(electronic|battery|computer|mobile[[:space:]]+phone|cellphone)\M', 'electronics', 'shopping-lifestyle'),
    (92, '\m(bookshop|bookstore|books)\M', 'books', 'shopping-lifestyle'),
    (93, '\m(furniture|decor|interior|homeware)\M', 'home-decor', 'shopping-lifestyle')
),
ranked_matches as (
  select
    b.id,
    r.sub_slug,
    r.cat_slug,
    row_number() over (partition by b.id order by r.priority asc) as rn
  from public.businesses b
  join rules r
    on lower(coalesce(b.name, '') || ' ' || coalesce(b.description, '')) ~* r.pattern
  join public.canonical_subcategory_slugs c
    on c.slug = r.sub_slug
  where
    lower(coalesce(b.primary_subcategory_slug, '')) = 'miscellaneous'
    or lower(coalesce(b.primary_category_slug, '')) = 'miscellaneous'
),
best_match as (
  select id, sub_slug, cat_slug
  from ranked_matches
  where rn = 1
)
update public.businesses b
set
  primary_subcategory_slug = m.sub_slug,
  primary_category_slug = m.cat_slug,
  updated_at = now()
from best_match m
where b.id = m.id
  and (
    b.primary_subcategory_slug is distinct from m.sub_slug
    or b.primary_category_slug is distinct from m.cat_slug
  );

commit;
