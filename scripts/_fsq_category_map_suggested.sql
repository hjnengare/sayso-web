-- generated_at: 2026-02-06T11:59:33.169Z

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e2931735', 'Art Gallery', 'galleries', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1ed941735', 'Spa', 'spas', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d110951735', 'Hair Salon', 'salons', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d16d941735', 'Café', 'cafes', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d103951735', 'Clothing Store', 'fashion', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d16e941735', 'Fast Food Restaurant', 'fast-food', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d10a951735', 'Bank', 'finance-insurance', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d11f941735', 'Night Club', 'nightlife', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d175941735', 'Gym and Studio', 'gyms', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1f8941735', 'Furniture and Home Store', 'home-decor', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d114951735', 'Bookstore', 'books', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d137941735', 'Theater', 'theaters', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4f04afc02fb6e1c99f3db0bc', 'Mobile Phone Store', 'electronics', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e0931735', 'Coffee Shop', 'cafes', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d122951735', 'Electronics Store', 'electronics', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d176941735', 'Gym', 'gyms', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d11b941735', 'Pub', 'bars', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d159941735', 'Hiking Trail', 'hiking', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d155941735', 'Gastropub', 'bars', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4f04aa0c2fb6e1c99f3db0b8', 'Nail Salon', 'nail-salons', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d17f941735', 'Movie Theater', 'cinemas', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d190941735', 'History Museum', 'museums', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d100951735', 'Pet Supplies Store', 'pet-services', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d18e941735', 'Comedy Club', 'comedy-clubs', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1ef941735', 'Rental Car Location', 'transport-travel', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d181941735', 'Museum', 'museums', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d110941735', 'Italian Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4f04b08c2fb6e1c99f3db0bd', 'Travel Agency', 'transport-travel', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d15e941735', 'Swimming Pool', 'water-sports', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4d4b7105d754a06374d81259', 'Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('5453de49498eade8af355881', 'Business Service', 'miscellaneous', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4d954af4a243a5684765b473', 'Veterinarian', 'veterinarians', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('56aa371be4b08b9a8d573517', 'Business Center', 'miscellaneous', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d16c941735', 'Burger Joint', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d116941735', 'Bar', 'nightlife', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1a7941735', 'College Library', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d12f941735', 'Library', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d11e941735', 'Cocktail Bar', 'bars', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d13d941735', 'High School', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4f04b25d2fb6e1c99f3db0c0', 'Travel Lounge', 'transport-travel', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4e4c9077bd41f78e849722f9', 'Bike Rental', 'cycling', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1c8941735', 'African Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1fa931735', 'Hotel', 'spas', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d102941735', 'Yoga Studio', 'wellness', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d124941735', 'Office', 'miscellaneous', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1f1941735', 'Board Store', 'water-sports', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('5032792091d4c4b30a586d5c', 'Concert Hall', 'concerts', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d102951735', 'Fashion Accessories Store', 'fashion', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d111941735', 'Japanese Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d10f941735', 'Indian Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d10a941735', 'Ethiopian Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1cc941735', 'Steakhouse', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1ce941735', 'Seafood Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b47', 'Boxing Gym', 'gyms', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('58daa1558bbb0b01f18ec1f1', 'Insurance Agency', 'finance-insurance', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e3941735', 'Surf Spot', 'water-sports', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4deefb944765f83613cdba6e', 'Historic and Protected Site', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d171941735', 'Event Space', 'events-festivals', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4f4532974b9074f6e4fb0104', 'Daycare', 'childcare', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1b1941735', 'College Bookstore', 'books', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4def73e84765ae376e57713a', 'Portuguese Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d10c941735', 'French Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1d2941735', 'Sushi Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1ca941735', 'Pizzeria', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4eb1d4d54b900d56c88a45fc', 'Mountain', 'hiking', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4f4533804b9074f6e4fb0105', 'Elementary School', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('5f2c43a65b4c177b9a6dcc62', 'Blood Bank', 'finance-insurance', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4e39a956bd410d7aed40cbc3', 'Tennis Court', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('5032897c91d4c4b30a586d69', 'Pet Service', 'pet-services', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d108951735', 'Women''s Store', 'fashion', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1db931735', 'Tapas Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d146941735', 'Deli', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1c1941735', 'Mexican Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d123941735', 'Wine Bar', 'nightlife', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1d5941735', 'Hotel Bar', 'bars', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b3c', 'Massage Clinic', 'spas', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b7a48', 'Language School', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4f4533814b9074f6e4fb0107', 'Nursery School', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1b3941735', 'Medical School', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1ae941735', 'University', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4d4b7105d754a06372d81259', 'College and University', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1f2941735', 'Sporting Goods Retail', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d115951735', 'Bicycle Store', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d174941735', 'Coworking Space', 'miscellaneous', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d11d941735', 'Sports Bar', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d18f941735', 'Art Museum', 'museums', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d135941735', 'Indie Theater', 'theaters', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d107951735', 'Shoe Store', 'fashion', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d111951735', 'Jewelry Store', 'fashion', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d157941735', 'New American Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d10e941735', 'Greek Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('50327c8591d4c4b30a586d5d', 'Brewery', 'bars', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d163941735', 'Park', 'wellness', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e2941735', 'Beach', 'water-sports', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d198941735', 'College Academic Building', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b3f', 'Law Office', 'legal-services', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1f8931735', 'Bed and Breakfast', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4d954b06a243a5684965b473', 'Apartment or Condo', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4f4528bc4b90abdf24c9de85', 'Sports and Recreation', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b7a33', 'Social Club', 'nightlife', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d105951735', 'Children''s Clothing Store', 'fashion', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4eb1bdf03b7b55596b4a7491', 'Camera Store', 'electronics', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d12a951735', 'Train', 'miscellaneous', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d16a941735', 'Bakery', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b79f1', 'Bistro', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1d8941735', 'Gay Bar', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b7a02', 'Belgian Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1c0941735', 'Mediterranean Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1ee931735', 'Hostel', 'books', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d119941735', 'Hookah Bar', 'nightlife', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d121941735', 'Lounge', 'bars', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b7a06', 'Irish Pub', 'bars', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d117941735', 'Beer Garden', 'bars', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d129941735', 'City Hall', 'concerts', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d101941735', 'Martial Arts Dojo', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b7a2e', 'Sports Club', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d132951735', 'Hotel Pool', 'spas', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('54541900498ea6ccd0202697', 'Health and Beauty Service', 'salons', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4d1cf8421a97d635ce361c31', 'Tanning Salon', 'salons', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('50be8ee891d4fa8dcc7199a7', 'Market', 'concerts', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b7a21', 'National Park', 'hiking', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d165941735', 'Scenic Lookout', 'hiking', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('58daa1558bbb0b01f18ec200', 'Culinary School', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d13b941735', 'Education', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b7a42', 'Driving School', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1a0941735', 'College Classroom', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d130941735', 'Structure', 'finance-insurance', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b56', 'ATM', 'finance-insurance', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('5bae9231bedf3950379f89cd', 'Hill', 'hiking', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('63be6904847c3692a84b9bf9', 'Surf Store', 'water-sports', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('5744ccdfe4b0c0459246b4dc', 'Shopping Plaza', 'concerts', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1fd941735', 'Shopping Mall', 'pet-services', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d184941735', 'Stadium', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e6941735', 'Golf Course', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e9931735', 'Rock Club', 'nightlife', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b7a35', 'Club House', 'nightlife', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e0941735', 'Harbor or Marina', 'comedy-clubs', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d17e941735', 'Indie Movie Theater', 'cinemas', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('56aa371be4b08b9a8d573523', 'Film Studio', 'cinemas', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d191941735', 'Science Museum', 'museums', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('50aaa49e4b90af0d42d5de11', 'Castle', 'galleries', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1ac941735', 'College Theater', 'theaters', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d136941735', 'Opera House', 'theaters', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1f7941735', 'Flea Market', 'concerts', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1ff931735', 'Convention Center', 'concerts', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e7941735', 'Playground', 'family-activities', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d10b951735', 'Video Games Store', 'electronics', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b30', 'Used Bookstore', 'books', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d179941735', 'Bagel Shop', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1df931735', 'BBQ Joint', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d120951735', 'Food Court', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1d3941735', 'Vegan and Vegetarian Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1f5931735', 'Dim Sum Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d143941735', 'Breakfast Spot', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d142941735', 'Asian Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d14a941735', 'Vietnamese Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4f04af1f2fb6e1c99f3db0bb', 'Turkish Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d10d941735', 'German Restaurant', 'restaurants', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('5e18993feee47d000759b256', 'Coffee Roaster', 'cafes', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d122941735', 'Whisky Bar', 'cafes', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d112941735', 'Juice Bar', 'cafes', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e8931735', 'Piano Bar', 'bars', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1c5941735', 'Sandwich Spot', 'fast-food', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4d4ae6fc7a7b7dea34424761', 'Fried Chicken Joint', 'fast-food', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d115941735', 'Middle Eastern Restaurant', 'fast-food', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1cb941735', 'Food Truck', 'fast-food', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1a1941735', 'College Cafeteria', 'fast-food', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1c3941735', 'Moroccan Restaurant', 'fast-food', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d118951735', 'Grocery Store', 'fast-food', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4edd64a0c7ddd24ca188df1a', 'Fish and Chips Shop', 'fast-food', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d145941735', 'Chinese Restaurant', 'fast-food', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d105941735', 'Gym Pool', 'gyms', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b48', 'Gymnastics Center', 'gyms', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1c9941735', 'Ice Cream Parlor', 'wellness', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4fceea171983d5d06c3e9823', 'Aquarium', 'wellness', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1fa941735', 'Farmers Market', 'wellness', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1ad941735', 'Trade School', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4f04b10d2fb6e1c99f3db0be', 'Music School', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b7a46', 'Private School', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('554a5e17498efabeda6cc559', 'Photography Studio', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('56aa371ce4b08b9a8d573570', 'Adult Education', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1ab941735', 'Student Center', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d197941735', 'College Administrative Building', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d199941735', 'College Arts Building', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d126941735', 'Government Building', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1dc931735', 'Tea Room', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4d4b7105d754a06375d81259', 'Business and Professional Services', 'education-learning', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d113951735', 'Fuel Station', 'finance-insurance', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4d4b7105d754a06378d81259', 'Retail', 'finance-insurance', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('545419b1498ea6ccd0202f58', 'Home Service', 'electricians', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b50', 'Cable Car', 'hiking', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('56aa371be4b08b9a8d57355e', 'Bike Trail', 'hiking', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4f2a25ac4b909258e854f55f', 'Neighborhood', 'hiking', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d12f951735', 'Resort', 'water-sports', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d118941735', 'Dive Bar', 'water-sports', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d162941735', 'Other Great Outdoors', 'water-sports', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1f0941735', 'Internet Cafe', 'water-sports', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e4941735', 'Campground', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d19f941735', 'College Technology Building', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1fe931735', 'Bus Station', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b21', 'Stationery Store', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d116951735', 'Antique Store', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d15f941735', 'Field', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('503288ae91d4c4b30a586d67', 'Afghan Restaurant', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('56aa371be4b08b9a8d573552', 'Rental Service', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e5941735', 'Dog Park', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b22', 'Outdoor Supply Store', 'camping', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('5267e4d9e4b0ec79466e48d1', 'Music Festival', 'events-festivals', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d107941735', 'Argentinian Restaurant', 'events-festivals', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('5267e4d9e4b0ec79466e48c8', 'Other Event', 'events-festivals', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b7a26', 'Recreation Center', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d134941735', 'Dance Studio', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d167941735', 'Skate Park', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4cce455aebf7b749d5e191f5', 'Soccer Field', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1b4941735', 'College Stadium', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('56aa371be4b08b9a8d573556', 'Rugby Stadium', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d103941735', 'Home (private)', 'sports-recreation', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d120941735', 'Karaoke Bar', 'nightlife', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1d6941735', 'Strip Club', 'nightlife', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e5931735', 'Music Venue', 'nightlife', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b79ef', 'Country Dance Club', 'nightlife', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52e81612bcbc57f1066b79ec', 'Salsa Club', 'nightlife', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1f2931735', 'Performing Arts Venue', 'comedy-clubs', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d192941735', 'Planetarium', 'museums', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1e7931735', 'Jazz and Blues Venue', 'concerts', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b3d', 'Pop-Up Store', 'family-activities', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d132941735', 'Church', 'family-activities', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1f9931735', 'Road', 'family-activities', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d177941735', 'Doctor''s Office', 'family-activities', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d178941735', 'Dentist', 'family-activities', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('63be6904847c3692a84b9bbe', 'Healthcare Clinic', 'family-activities', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d104941735', 'Medical Center', 'family-activities', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b32', 'Baby Store', 'family-activities', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b57', 'Employment Agency', 'family-activities', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d1f4941735', 'Design Studio', 'fashion', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4d954afda243a5684865b473', 'Eyecare Store', 'fashion', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d104951735', 'Boutique', 'fashion', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d101951735', 'Vintage and Thrift Store', 'fashion', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d106951735', 'Men''s Store', 'fashion', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4eb1bdde3b7b55596b4a7490', 'Photography Lab', 'electronics', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b45', 'Organic Grocery', 'home-decor', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('63be6904847c3692a84b9bf2', 'Housewares Store', 'home-decor', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d121951735', 'Office Supply Store', 'books', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4f4530164b9074f6e4fb00ff', 'Tourist Information and Service', 'books', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d149941735', 'Thai Restaurant', 'books', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b36', 'IT Service', 'miscellaneous', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('4bf58dd8d48988d127941735', 'Meeting Room', 'miscellaneous', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('52f2ab2ebcbc57f1066b8b28', 'Print Store', 'miscellaneous', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();

insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)
values ('63be6904847c3692a84b9b58', 'Home Improvement Service', 'miscellaneous', now())
on conflict (fsq_category_id) do update set
  fsq_category_name = excluded.fsq_category_name,
  sayso_subcategory_slug = excluded.sayso_subcategory_slug,
  updated_at = now();
