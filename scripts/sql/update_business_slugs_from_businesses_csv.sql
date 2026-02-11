-- Generated from src/app/data/businesses.csv
-- Updates ONLY primary_category_slug and primary_subcategory_slug
begin;

with csv_slug_map(name, location, address, primary_category_slug, primary_subcategory_slug) as (
  values
    ('Pigalle', 'Green Point', '57a Somerset Road, Green Point, Cape Town, South Africa, 8060', 'food-drink', 'restaurants'),
    ('Beluga', 'V&A Waterfront', '1st Floor, Cruise Terminal, Duncan Rd, Victoria & Alfred Waterfront, Cape Town', 'food-drink', 'restaurants'),
    ('Karibu Restaurant', 'V&A Waterfront', 'Shop 156, The Wharf Centre, V&A Waterfront, Victoria Wharf, Cape Town Central 8002, South Africa', 'food-drink', 'restaurants'),
    ('Mozambik V&A Waterfront', 'V&A Waterfront', 'Shop 8, Quay 5, V & A Waterfront, Dock Rd, Waterfront, Cape Town, 8002', 'food-drink', 'restaurants'),
    ('Cafe Caprice', 'Camps Bay', '37 Victoria Rd, Camps Bay, Cape Town', 'food-drink', 'restaurants'),
    ('The Gin Bar', 'City Centre', '64a Wale Street, Cape Town', 'food-drink', 'bars'),
    ('Fable Cocktail Bar', 'City Centre', 'Corner Bree & Wale Street, Cape Town', 'food-drink', 'bars'),
    ('The Drinkery', 'City Centre', '100 Shortmarket Street Mezzanine Level, Cape Town City Centre, Cape Town', 'food-drink', 'bars'),
    ('Skybar Cape Town', 'De Waterkant', '49 Napier Street, Cape Town, South Africa, 8001', 'food-drink', 'bars'),
    ('Publik Wine Bar', 'Tamboerskloof', '11D Kloofnek Road, Tamboerskloof', 'food-drink', 'bars'),
    ('Mop Hair Salon', 'City Centre', '127 Bree Street, Cape Town, South Africa, 8000', 'beauty-wellness', 'salons'),
    ('Scar Hair', 'City Centre', '133 Bree Street, Cape Town, South Africa', 'beauty-wellness', 'salons'),
    ('Ierephaan Hair Salon', 'City Centre', '74 Bree Street, Cape Town, South Africa, 8001', 'beauty-wellness', 'salons'),
    ('Spoilt Hair Salon', 'Gardens', '1st Fl. Lifestyle Centre, 50 Kloof St., Gardens, Cape Town', 'beauty-wellness', 'salons'),
    ('SYZYGY Hair Design', 'City Centre', '79 Loop St, Cape Town City Centre, Cape Town, 8000, South Africa', 'beauty-wellness', 'salons'),
    ('Excentric on Kloof', 'Gardens', '39 Kloof Street, Gardens, Cape Town', 'beauty-wellness', 'salons'),
    ('The Glam Bar', 'Green Point', 'Unit 2, Winston Place, 65 Main Road, Green Point, Cape Town, 8005', 'beauty-wellness', 'salons'),
    ('Blessing Beauty Salon', 'City Centre', '106 Adderley Street, Cape Town City Centre, Cape Town, 8000, South Africa', 'beauty-wellness', 'salons'),
    ('Mama Demba Hair Salon & Beauty Spa', 'City Centre', 'Market House, 15 Shortmarket St, Cape Town City Centre, Cape Town, 8001, South Africa', 'beauty-wellness', 'salons'),
    ('The Studio Barbershop', 'Observatory', '319 Main Road, Observatory, Cape Town', 'beauty-wellness', 'salons'),
    ('Sleek Barbershop Cape Town', 'Bo-Kaap', '40 Dorp Street, Bo Kaap, Cape Town, 8000', 'beauty-wellness', 'salons'),
    ('Yogis Barbershop', 'City Centre', '103 Buitengracht Street, Cape Town, South Africa', 'beauty-wellness', 'salons'),
    ('Barnet Fair Barber Shop Sea Point', 'Sea Point', 'Shop 2, The Odeon, 20 Regent Road, Sea Point, 8001', 'beauty-wellness', 'salons'),
    ('Hermanos Barber Shop Loop Street', 'City Centre', '174 Loop Street, Cape Town', 'beauty-wellness', 'salons'),
    ('Billy''s Barbershop', 'City Centre', '4 Bree Street, Portside Building, Shop 4, 8001, Cape Town', 'beauty-wellness', 'salons'),
    ('Psycho Barber', 'City Centre', '45 Shortmarket St, Cape Town City Centre, Cape Town, 8001', 'beauty-wellness', 'salons'),
    ('Legends Barbershop Cape Town', 'City Centre', '297 Long Street, Cape Town, 8000', 'beauty-wellness', 'salons'),
    ('Barbarossa Lounge Cape Town', 'City Centre', '24 Hans Strijdom Ave, Shop C4, Cape Town City Centre, 8000', 'beauty-wellness', 'salons'),
    ('Virgin Active Cape Town Foreshore', 'City Centre', '17 Rua Bartholomeu Dias Plain, Cape Town City Centre, Cape Town, 8000', 'beauty-wellness', 'gyms'),
    ('Zone Fitness Cape Quarter', 'De Waterkant', 'Cape Quarter, The Square, Corner of Somerset and Napier St, De Waterkant, Cape Town', 'beauty-wellness', 'gyms'),
    ('Horizen Gym Sea Point', 'Sea Point', '126 Main Rd, Sea Point, Cape Town', 'beauty-wellness', 'gyms'),
    ('Skoon Laundromats', 'City Centre', '4 Bree Street, Portside Towers, Cape Town, City Centre, 8001', 'professional-services', 'miscellaneous'),
    ('I Love My Laundry Buitengracht', 'City Centre', '59 Buitengracht Street, Cape Town', 'professional-services', 'miscellaneous'),
    ('Wsh Laundry & Dry Cleaning Cape Town CBD', 'City Centre', 'Shop No 6a, Icon Building, Corner Lower Long and Hands Strijdom, Cape Town', 'professional-services', 'miscellaneous'),
    ('The Launderers Kloof Street', 'Gardens', 'Shop 2B Lifestyle on Kloof, 50 Kloof Road, Gardens, Cape Town', 'professional-services', 'miscellaneous'),
    ('What The Fluff Laundromat', 'V&A Waterfront', 'P3 Level Unit 002, Portwoods Parking Garage, Portwoods Precinct, V&A Waterfront, 8001', 'professional-services', 'miscellaneous'),
    ('Neovision Optometrist Palmyra Junction', 'Claremont', 'Shop 13/14, Palmyra Junction, 9 Palmyra Road, Claremont', 'professional-services', 'miscellaneous'),
    ('Optique Optometrists Cape Town', 'Foreshore', 'Shop 10b, Foreshore Building, 2a Riebeek St, Foreshore, Cape Town, 8001', 'professional-services', 'miscellaneous'),
    ('Spec-Savers St Georges Mall', 'City Centre', 'Shop 2 Allianz House, 52 St Georges Mall Corner Castle And St Georges Street, Cape Town City Centre, Cape Town', 'professional-services', 'miscellaneous'),
    ('The Saben Spectacle Co.', 'City Centre', '22 Bree Street, Cape Town', 'professional-services', 'miscellaneous'),
    ('One&Only Cape Town', 'V&A Waterfront', '', 'travel', 'accommodation'),
    ('InterContinental Table Bay Cape Town', 'V&A Waterfront', 'Quay 6 Victoria and Alfred Waterfront, Cape Town, 8001, South Africa', 'travel', 'accommodation'),
    ('Mount Nelson, A Belmond Hotel, Cape Town', 'Gardens', '76 Orange Street, Gardens, Cape Town, 8001 South Africa', 'travel', 'accommodation'),
    ('The Silo Hotel', 'Cape Town', '', 'travel', 'accommodation'),
    ('Pepperclub Hotel', 'City Centre', '167 Loop St, Cape Town City Centre, Cape Town, 8005', 'travel', 'accommodation'),
    ('Dorp Hotel', 'City Centre', '273 Longmarket St, Schotsche Kloof, Cape Town', 'travel', 'accommodation'),
    ('Cape Town International Airport', 'Matroosfontein', 'Cape Town International Airport, Matroosfontein, Cape Town', 'travel', 'transport'),
    ('AVIS Car Rental Cape Town Airport', 'Matroosfontein', 'Cape Town International Airport, Matroosfontein, Cape Town', 'travel', 'transport'),
    ('Cavendish Square', 'Claremont', '1 Dreyer St, Claremont, Cape Town', 'shopping-lifestyle', 'miscellaneous'),
    ('Let''s Go Bowling', 'Claremont', 'Stadium on Main, Main Road, Claremont, Cape Town', 'experiences-entertainment', 'sports-recreation'),
    ('Scratch Patch V&A Waterfront', 'V&A Waterfront', 'Dock Road, V&A Waterfront, Cape Town', 'experiences-entertainment', 'sports-recreation')
),
subcategory_alias_map(old_slug, new_slug) as (
  values
    ('restaurant','restaurants'),
    ('cafe','cafes'),
    ('bar','bars'),
    ('salon','salons'),
    ('gym','gyms'),
    ('spa','spas'),
    ('museum','museums'),
    ('gallery','galleries'),
    ('theatre','theaters'),
    ('theater','theaters'),
    ('concert','concerts'),
    ('cinema','cinemas'),
    ('bookstore','books'),
    ('airport','airports'),
    ('train-station','train-stations'),
    ('bus-station','bus-stations'),
    ('car-rental','car-rental-businesses'),
    ('campervan-rental','campervan-rentals'),
    ('shuttle-service','shuttle-services'),
    ('chauffeur-service','chauffeur-services'),
    ('travel-service','travel-services'),
    ('tour-guide','tour-guides'),
    ('travel-agency','travel-agencies'),
    ('luggage-shop','luggage-shops'),
    ('travel-insurance-provider','travel-insurance-providers')
),
category_alias_map(old_slug, new_slug) as (
  values
    ('food_and_drink','food-drink'),
    ('food & drink','food-drink'),
    ('beauty_and_wellness','beauty-wellness'),
    ('beauty & wellness','beauty-wellness'),
    ('professional_services','professional-services'),
    ('professional services','professional-services'),
    ('outdoors_and_adventure','outdoors-adventure'),
    ('outdoors & adventure','outdoors-adventure'),
    ('experiences_and_entertainment','experiences-entertainment'),
    ('experiences & entertainment','experiences-entertainment'),
    ('arts_and_culture','arts-culture'),
    ('arts & culture','arts-culture'),
    ('family_and_pets','family-pets'),
    ('family & pets','family-pets'),
    ('shopping_and_lifestyle','shopping-lifestyle'),
    ('shopping & lifestyle','shopping-lifestyle')
),
resolved as (
  select
    lower(trim(s.name)) as name_key,
    lower(trim(coalesce(s.location, ''))) as location_key,
    lower(trim(coalesce(s.address, ''))) as address_key,
    coalesce(sa.new_slug, lower(trim(s.primary_subcategory_slug))) as sub_slug,
    coalesce(ca.new_slug, lower(trim(s.primary_category_slug))) as cat_slug
  from csv_slug_map s
  left join subcategory_alias_map sa
    on lower(trim(s.primary_subcategory_slug)) = sa.old_slug
  left join category_alias_map ca
    on lower(trim(s.primary_category_slug)) = ca.old_slug
)
update public.businesses b
set
  primary_subcategory_slug = r.sub_slug,
  primary_category_slug = r.cat_slug,
  updated_at = now()
from resolved r
where lower(trim(b.name)) = r.name_key
  and lower(trim(coalesce(b.location, ''))) = r.location_key
  and lower(trim(coalesce(b.address, ''))) = r.address_key
  and (
    b.primary_subcategory_slug is distinct from r.sub_slug
    or b.primary_category_slug is distinct from r.cat_slug
  );

commit;
