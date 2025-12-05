-- ============================================
-- UPDATE Business PNG Placeholders by Category
-- ============================================
-- This query updates the image_url field with the appropriate PNG placeholder
-- based on the business category
-- Only updates businesses that don't have a custom uploaded image
-- ============================================

UPDATE businesses
SET 
  image_url = CASE
    -- Food & Drink (matching exact mapping file)
    WHEN category = 'restaurants' THEN '/png/004-dinner.png'
    WHEN category = 'restaurant' THEN '/png/001-restaurant.png'
    WHEN category = 'cafes' OR category = 'coffee' OR category = 'coffee-shop' THEN '/png/002-coffee-cup.png'
    WHEN category = 'bars' THEN '/png/007-beer-tap.png'
    WHEN category = 'cocktail-bar' THEN '/png/003-cocktail.png'
    WHEN category = 'wine-bar' THEN '/png/008-wine-bottle.png'
    WHEN category = 'fast-food' THEN '/png/031-fast-food.png'
    WHEN category = 'fine-dining' THEN '/png/001-restaurant.png'
    WHEN category = 'bakery' THEN '/png/006-bakery.png'
    WHEN category = 'food-truck' THEN '/png/005-food-truck.png'
    WHEN category = 'grocery' THEN '/png/029-grocery-basket.png'
    WHEN category = 'market-stall' THEN '/png/030-stall.png'
    
    -- Beauty & Wellness
    WHEN category = 'gyms' THEN '/png/014-dumbbell.png'
    WHEN category = 'spas' THEN '/png/010-spa.png'
    WHEN category = 'salons' THEN '/png/009-salon.png'
    WHEN category = 'wellness' OR category = 'wellness-center' THEN '/png/013-body-massage.png'
    WHEN category = 'yoga' THEN '/png/015-yoga.png'
    WHEN category = 'pilates' THEN '/png/016-pilates.png'
    WHEN category = 'martial-arts' THEN '/png/017-taekwondo.png'
    WHEN category = 'barber' THEN '/png/012-barber-pole.png'
    WHEN category = 'nail-salons' THEN '/png/011-nail-polish.png'
    
    -- Professional Services
    WHEN category = 'education-learning' OR category = 'Education & Learning' OR LOWER(category) LIKE '%education%' OR LOWER(category) LIKE '%learning%' THEN '/png/044-student.png'
    WHEN category = 'transport-travel' THEN '/png/045-transportation.png'
    WHEN category = 'finance-insurance' THEN '/png/046-insurance.png'
    WHEN category = 'plumbers' THEN '/png/047-plunger.png'
    WHEN category = 'electricians' THEN '/png/049-broken-cable.png'
    WHEN category = 'legal-services' THEN '/png/050-balance.png'
    WHEN category = 'handyman' THEN '/png/048-handyman.png'
    WHEN category = 'laundry' THEN '/png/052-washing-machine.png'
    WHEN category = 'pest-control' THEN '/png/053-insecticide.png'
    WHEN category = 'workshop' THEN '/png/021-workshop.png'
    
    -- Outdoors & Adventure
    WHEN category = 'hiking' THEN '/png/054-sign.png'
    WHEN category = 'cycling' THEN '/png/033-sport.png'
    WHEN category = 'water-sports' THEN '/png/032-swim.png'
    WHEN category = 'camping' THEN '/png/036-summer.png'
    WHEN category = 'skydiving' THEN '/png/034-skydive.png'
    WHEN category = 'tour-guide' THEN '/png/035-tour-guide.png'
    
    -- Experiences & Entertainment
    WHEN category = 'events-festivals' THEN '/png/022-party-people.png'
    WHEN category = 'sports-recreation' THEN '/png/033-sport.png'
    WHEN category = 'nightlife' THEN '/png/041-dj.png'
    WHEN category = 'comedy-clubs' THEN '/png/042-mime.png'
    WHEN category = 'cinemas' THEN '/png/056-ticket.png'
    WHEN category = 'tickets' THEN '/png/056-ticket.png'
    
    -- Arts & Culture
    WHEN category = 'museums' THEN '/png/018-museum.png'
    WHEN category = 'galleries' THEN '/png/019-art-gallery.png'
    WHEN category = 'theaters' THEN '/png/020-theatre.png'
    WHEN category = 'concerts' THEN '/png/040-stage.png'
    
    -- Family & Pets
    WHEN category = 'family-activities' OR category = 'childcare' THEN '/png/055-home.png'
    WHEN category = 'pet-services' THEN '/png/038-pet.png'
    WHEN category = 'veterinarians' THEN '/png/037-veterinarian.png'
    WHEN category = 'dogs' THEN '/png/039-dogs.png'
    
    -- Shopping & Lifestyle
    WHEN category = 'fashion' THEN '/png/024-boutique.png'
    WHEN category = 'electronics' OR category = 'electronics-store' OR category = 'electronics-shops' OR category = 'electronics-and-gadgets' OR category = 'gadgets' OR category = 'tech' OR category = 'technology' OR category = 'digital' OR category = 'digital-services' OR category = 'phone-repair' OR category = 'computer-repair' THEN '/png/digitalization.png'
    WHEN category = 'home-decor' THEN '/png/026-house-decoration.png'
    WHEN category = 'books' OR category = 'bookstore' THEN '/png/025-open-book.png'
    WHEN category = 'gifts' THEN '/png/027-gift.png'
    WHEN category = 'value' THEN '/png/028-value.png'
    WHEN category = 'shopping-cart' THEN '/png/shopping-cart.png'
    
    -- Top-level interest categories (fallbacks)
    WHEN category = 'food-drink' THEN '/png/004-dinner.png'
    WHEN category = 'beauty-wellness' THEN '/png/010-spa.png'
    WHEN category = 'professional-services' THEN '/png/046-insurance.png'
    WHEN category = 'outdoors-adventure' THEN '/png/036-summer.png'
    WHEN category = 'experiences-entertainment' THEN '/png/022-party-people.png'
    WHEN category = 'arts-culture' THEN '/png/018-museum.png'
    WHEN category = 'family-pets' THEN '/png/055-home.png'
    WHEN category = 'shopping-lifestyle' THEN '/png/023-shopping-bag.png'
    
    -- Generic/Default
    WHEN category = 'Business' OR category = 'business' OR category = 'trade' OR category = 'business-other' OR category IS NULL OR category = '' THEN '/png/business-and-trade.png'
    
    ELSE image_url -- Keep existing image if category doesn't match
  END,
  updated_at = NOW()
WHERE 
  -- Only update businesses that:
  -- 1. Don't have a custom uploaded image (uploaded_image is NULL or empty)
  -- 2. Have a category that matches our mapping
  -- 3. Either have no image_url or have a PNG placeholder that should be updated
  (
    uploaded_image IS NULL OR uploaded_image = ''
  )
  AND (
    category IN (
      'restaurants', 'restaurant', 'cafes', 'coffee', 'coffee-shop',
      'bars', 'cocktail-bar', 'wine-bar', 'fast-food', 'Fast Food', 'fine-dining',
      'bakery', 'food-truck', 'grocery', 'market-stall',
      'gyms', 'spas', 'salons', 'wellness', 'wellness-center',
      'yoga', 'pilates', 'martial-arts', 'barber', 'nail-salons',
      'education-learning', 'Education & Learning', 'transport-travel', 'finance-insurance',
      'plumbers', 'electricians', 'legal-services', 'handyman',
      'laundry', 'pest-control', 'workshop',
      'hiking', 'cycling', 'water-sports', 'camping', 'skydiving', 'tour-guide',
      'events-festivals', 'sports-recreation', 'nightlife', 'comedy-clubs', 'cinemas', 'tickets',
      'museums', 'galleries', 'theaters', 'concerts',
      'family-activities', 'pet-services', 'childcare', 'veterinarians', 'dogs',
      'fashion', 'electronics', 'electronics-store', 'electronics-shops',
      'electronics-and-gadgets', 'gadgets', 'tech', 'technology', 'digital',
      'digital-services', 'phone-repair', 'computer-repair',
      'home-decor', 'books', 'bookstore', 'gifts', 'value', 'shopping-cart',
      'food-drink', 'beauty-wellness', 'professional-services',
      'outdoors-adventure', 'experiences-entertainment', 'arts-culture',
      'family-pets', 'shopping-lifestyle',
      'Business', 'business', 'trade', 'business-other'
    )
    OR category IS NULL
    OR category = ''
  )
  AND (
    -- Update if image_url is NULL, empty, or is already a PNG placeholder
    image_url IS NULL 
    OR image_url = ''
    OR image_url LIKE '/png/%'
    OR image_url LIKE '%/png/%'
  );

-- ============================================
-- Alternative: Update only businesses with NULL or empty image_url
-- ============================================
-- Uncomment below if you want to be more conservative and only update
-- businesses that have no image at all

/*
UPDATE businesses
SET 
  image_url = CASE
    WHEN category = 'restaurants' OR category = 'restaurant' THEN '/png/001-restaurant.png'
    WHEN category = 'cafes' OR category = 'coffee' OR category = 'coffee-shop' THEN '/png/002-coffee-cup.png'
    WHEN category = 'bars' OR category = 'cocktail-bar' THEN '/png/007-beer-tap.png'
    WHEN category = 'wine-bar' THEN '/png/008-wine-bottle.png'
    WHEN category = 'fast-food' THEN '/png/031-fast-food.png'
    WHEN category = 'fine-dining' THEN '/png/001-restaurant.png'
    WHEN category = 'bakery' THEN '/png/006-bakery.png'
    WHEN category = 'food-truck' THEN '/png/005-food-truck.png'
    WHEN category = 'grocery' OR category = 'market-stall' THEN '/png/029-grocery-basket.png'
    WHEN category = 'gyms' THEN '/png/014-dumbbell.png'
    WHEN category = 'spas' THEN '/png/010-spa.png'
    WHEN category = 'salons' THEN '/png/009-salon.png'
    WHEN category = 'wellness' OR category = 'wellness-center' THEN '/png/013-body-massage.png'
    WHEN category = 'yoga' THEN '/png/015-yoga.png'
    WHEN category = 'pilates' THEN '/png/016-pilates.png'
    WHEN category = 'martial-arts' THEN '/png/017-taekwondo.png'
    WHEN category = 'barber' THEN '/png/012-barber-pole.png'
    WHEN category = 'nail-salons' THEN '/png/011-nail-polish.png'
    WHEN category = 'education-learning' THEN '/png/044-student.png'
    WHEN category = 'transport-travel' THEN '/png/045-transportation.png'
    WHEN category = 'finance-insurance' THEN '/png/046-insurance.png'
    WHEN category = 'plumbers' THEN '/png/047-plunger.png'
    WHEN category = 'electricians' THEN '/png/049-broken-cable.png'
    WHEN category = 'legal-services' THEN '/png/050-balance.png'
    WHEN category = 'handyman' THEN '/png/048-handyman.png'
    WHEN category = 'laundry' THEN '/png/052-washing-machine.png'
    WHEN category = 'pest-control' THEN '/png/053-insecticide.png'
    WHEN category = 'workshop' THEN '/png/021-workshop.png'
    WHEN category = 'hiking' THEN '/png/054-sign.png'
    WHEN category = 'cycling' THEN '/png/033-sport.png'
    WHEN category = 'water-sports' THEN '/png/032-swim.png'
    WHEN category = 'camping' THEN '/png/036-summer.png'
    WHEN category = 'skydiving' THEN '/png/034-skydive.png'
    WHEN category = 'tour-guide' THEN '/png/035-tour-guide.png'
    WHEN category = 'events-festivals' THEN '/png/022-party-people.png'
    WHEN category = 'sports-recreation' THEN '/png/033-sport.png'
    WHEN category = 'nightlife' THEN '/png/041-dj.png'
    WHEN category = 'comedy-clubs' THEN '/png/042-mime.png'
    WHEN category = 'cinemas' THEN '/png/056-ticket.png'
    WHEN category = 'museums' THEN '/png/018-museum.png'
    WHEN category = 'galleries' THEN '/png/019-art-gallery.png'
    WHEN category = 'theaters' THEN '/png/020-theatre.png'
    WHEN category = 'concerts' THEN '/png/040-stage.png'
    WHEN category = 'family-activities' OR category = 'childcare' THEN '/png/055-home.png'
    WHEN category = 'pet-services' THEN '/png/038-pet.png'
    WHEN category = 'veterinarians' THEN '/png/037-veterinarian.png'
    WHEN category = 'fashion' THEN '/png/024-boutique.png'
    WHEN category = 'electronics' OR category = 'electronics-store' OR category = 'electronics-shops' OR category = 'electronics-and-gadgets' OR category = 'gadgets' OR category = 'tech' OR category = 'technology' OR category = 'digital' OR category = 'digital-services' OR category = 'phone-repair' OR category = 'computer-repair' THEN '/png/digitalization.png'
    WHEN category = 'home-decor' THEN '/png/026-house-decoration.png'
    WHEN category = 'books' OR category = 'bookstore' THEN '/png/025-open-book.png'
    WHEN category = 'food-drink' THEN '/png/004-dinner.png'
    WHEN category = 'beauty-wellness' THEN '/png/010-spa.png'
    WHEN category = 'professional-services' THEN '/png/046-insurance.png'
    WHEN category = 'outdoors-adventure' THEN '/png/036-summer.png'
    WHEN category = 'experiences-entertainment' THEN '/png/022-party-people.png'
    WHEN category = 'arts-culture' THEN '/png/018-museum.png'
    WHEN category = 'family-pets' THEN '/png/055-home.png'
    WHEN category = 'shopping-lifestyle' THEN '/png/023-shopping-bag.png'
    WHEN category = 'Business' OR category = 'business' OR category = 'trade' OR category = 'business-other' OR category IS NULL OR category = '' THEN '/png/business-and-trade.png'
    ELSE '/png/business-and-trade.png'
  END,
  updated_at = NOW()
WHERE 
  (image_url IS NULL OR image_url = '')
  AND (uploaded_image IS NULL OR uploaded_image = '');
*/

