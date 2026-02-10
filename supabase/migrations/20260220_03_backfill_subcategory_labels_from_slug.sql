-- Fill missing primary_subcategory_label from canonical slug labels.
-- Does not overwrite non-empty labels.

begin;

with labels(sub_slug, sub_label) as (
  values
    ('restaurants', 'Restaurants'),
    ('cafes', 'Cafes & Coffee'),
    ('bars', 'Bars & Pubs'),
    ('fast-food', 'Fast Food'),
    ('fine-dining', 'Fine Dining'),

    ('gyms', 'Gyms & Fitness'),
    ('spas', 'Spas'),
    ('salons', 'Hair Salons'),
    ('wellness', 'Wellness Centers'),
    ('nail-salons', 'Nail Salons'),

    ('education-learning', 'Education & Learning'),
    ('transport-travel', 'Transport & Travel'),
    ('finance-insurance', 'Finance & Insurance'),
    ('plumbers', 'Plumbers'),
    ('electricians', 'Electricians'),
    ('legal-services', 'Legal Services'),

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
    ('travel-insurance-providers', 'Travel Insurance Providers'),

    ('hiking', 'Hiking'),
    ('cycling', 'Cycling'),
    ('water-sports', 'Water Sports'),
    ('camping', 'Camping'),

    ('events-festivals', 'Events & Festivals'),
    ('sports-recreation', 'Sports & Recreation'),
    ('nightlife', 'Nightlife'),
    ('comedy-clubs', 'Comedy Clubs'),
    ('cinemas', 'Cinemas'),

    ('museums', 'Museums'),
    ('galleries', 'Art Galleries'),
    ('theaters', 'Theaters'),
    ('concerts', 'Concerts'),

    ('family-activities', 'Family Activities'),
    ('pet-services', 'Pet Services'),
    ('childcare', 'Childcare'),
    ('veterinarians', 'Veterinarians'),

    ('fashion', 'Fashion & Clothing'),
    ('electronics', 'Electronics'),
    ('home-decor', 'Home Decor'),
    ('books', 'Books & Media'),

    ('miscellaneous', 'Miscellaneous')
)
update public.businesses b
set
  primary_subcategory_label = l.sub_label,
  updated_at = now()
from labels l
where lower(coalesce(b.primary_subcategory_slug, '')) = l.sub_slug
  and (
    b.primary_subcategory_label is null
    or b.primary_subcategory_label = ''
  );

commit;
