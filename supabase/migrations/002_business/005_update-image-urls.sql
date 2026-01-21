-- Update business image_url based on category
-- This script maps business categories to the correct PNG placeholder images
-- Run this in your Supabase SQL Editor

-- First, let's create a function to get the image URL based on category
CREATE OR REPLACE FUNCTION get_category_image_url(category_name TEXT, business_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  subcategory TEXT;
  png_file TEXT;
  name_lower TEXT;
BEGIN
  -- Normalize category name
  category_name := TRIM(category_name);
  
  -- Use business name hints for better categorization
  IF business_name IS NOT NULL THEN
    name_lower := LOWER(business_name);
    
    -- Telecom/Electronics hints
    IF name_lower LIKE '%cell%' OR name_lower LIKE '%mobile%' OR 
       name_lower LIKE '%vodacom%' OR name_lower LIKE '%mtn%' OR 
       name_lower LIKE '%telkom%' OR name_lower LIKE '%telecom%' OR
       name_lower LIKE '%phone%' OR name_lower LIKE '%cellular%' THEN
      subcategory := 'electronics';
      png_file := '023-shopping-bag.png';
      RETURN '/png/' || png_file;
    END IF;
    
    -- Restaurant/Food hints
    IF name_lower LIKE '%restaurant%' OR name_lower LIKE '%cafe%' OR 
       name_lower LIKE '%bistro%' OR name_lower LIKE '%diner%' OR
       name_lower LIKE '%pizza%' OR name_lower LIKE '%burger%' OR
       name_lower LIKE '%food%' OR name_lower LIKE '%kitchen%' THEN
      subcategory := 'restaurants';
      png_file := '001-restaurant.png';
      RETURN '/png/' || png_file;
    END IF;
    
    -- Clothing/Fashion hints
    IF name_lower LIKE '%boutique%' OR name_lower LIKE '%fashion%' OR
       name_lower LIKE '%clothing%' OR name_lower LIKE '%apparel%' THEN
      subcategory := 'fashion';
      png_file := '024-boutique.png';
      RETURN '/png/' || png_file;
    END IF;
    
    -- Fitness/Gym hints
    IF name_lower LIKE '%gym%' OR name_lower LIKE '%fitness%' OR
       name_lower LIKE '%health%' OR name_lower LIKE '%wellness%' THEN
      subcategory := 'gyms';
      png_file := '014-dumbbell.png';
      RETURN '/png/' || png_file;
    END IF;
  END IF;
  
  -- Map category to subcategory
  CASE category_name
    -- Food & Drink
    WHEN 'Restaurant' THEN subcategory := 'restaurants';
    WHEN 'Fast Food' THEN subcategory := 'fast-food';
    WHEN 'Coffee Shop' THEN subcategory := 'cafes';
    WHEN 'Bar' THEN subcategory := 'bars';
    WHEN 'Bakery' THEN subcategory := 'restaurants';
    WHEN 'Ice Cream' THEN subcategory := 'fast-food';
    WHEN 'Supermarket' THEN subcategory := 'fast-food';
    WHEN 'Grocery' THEN subcategory := 'fast-food';
    
    -- Beauty & Wellness
    WHEN 'Salon' THEN subcategory := 'salons';
    WHEN 'Wellness' THEN subcategory := 'wellness';
    WHEN 'Fitness' THEN subcategory := 'gyms';
    WHEN 'Spa' THEN subcategory := 'spas';
    
    -- Professional Services
    WHEN 'Bank' THEN subcategory := 'finance-insurance';
    WHEN 'ATM' THEN subcategory := 'finance-insurance';
    WHEN 'Pharmacy' THEN subcategory := 'finance-insurance';
    WHEN 'Dental' THEN subcategory := 'education-learning';
    WHEN 'Veterinary' THEN subcategory := 'veterinarians';
    WHEN 'Clinic' THEN subcategory := 'education-learning';
    WHEN 'Hospital' THEN subcategory := 'education-learning';
    
    -- Arts & Culture
    WHEN 'Museum' THEN subcategory := 'museums';
    WHEN 'Art Gallery' THEN subcategory := 'galleries';
    WHEN 'Theater' THEN subcategory := 'theaters';
    WHEN 'Cinema' THEN subcategory := 'theaters';
    WHEN 'Music Venue' THEN subcategory := 'concerts';
    WHEN 'Nightclub' THEN subcategory := 'nightlife';
    WHEN 'Bookstore' THEN subcategory := 'books';
    
    -- Shopping & Lifestyle
    WHEN 'Clothing' THEN subcategory := 'fashion';
    WHEN 'Jewelry' THEN subcategory := 'fashion';
    WHEN 'Florist' THEN subcategory := 'home-decor';
    
    -- Electronics & Telecom
    WHEN 'Electronics' THEN subcategory := 'electronics';
    
    -- Outdoors & Adventure
    WHEN 'Park' THEN subcategory := 'hiking';
    WHEN 'Zoo' THEN subcategory := 'family-activities';
    WHEN 'Aquarium' THEN subcategory := 'family-activities';
    WHEN 'Attraction' THEN subcategory := 'events-festivals';
    WHEN 'Gas Station' THEN subcategory := 'transport-travel';
    WHEN 'Parking' THEN subcategory := 'transport-travel';
    WHEN 'Hotel' THEN subcategory := 'transport-travel';
    WHEN 'Hostel' THEN subcategory := 'transport-travel';
    
    -- Default fallback
    ELSE subcategory := 'electronics';
  END CASE;
  
  -- Map subcategory to PNG file
  CASE subcategory
    -- Food & Drink
    WHEN 'restaurants' THEN png_file := '001-restaurant.png';
    WHEN 'cafes' THEN png_file := '002-coffee-cup.png';
    WHEN 'bars' THEN png_file := '003-cocktail.png';
    WHEN 'fast-food' THEN png_file := '031-fast-food.png';
    WHEN 'fine-dining' THEN png_file := '004-dinner.png';
    
    -- Beauty & Wellness
    WHEN 'gyms' THEN png_file := '014-dumbbell.png';
    WHEN 'spas' THEN png_file := '010-spa.png';
    WHEN 'salons' THEN png_file := '009-salon.png';
    WHEN 'wellness' THEN png_file := '013-body-massage.png';
    WHEN 'nail-salons' THEN png_file := '011-nail-polish.png';
    
    -- Professional Services
    WHEN 'education-learning' THEN png_file := '044-student.png';
    WHEN 'transport-travel' THEN png_file := '045-transportation.png';
    WHEN 'finance-insurance' THEN png_file := '046-insurance.png';
    WHEN 'plumbers' THEN png_file := '047-plunger.png';
    WHEN 'electricians' THEN png_file := '049-broken-cable.png';
    WHEN 'legal-services' THEN png_file := '050-balance.png';
    
    -- Outdoors & Adventure
    WHEN 'hiking' THEN png_file := '034-skydive.png';
    WHEN 'cycling' THEN png_file := '033-sport.png';
    WHEN 'water-sports' THEN png_file := '032-swim.png';
    WHEN 'camping' THEN png_file := '036-summer.png';
    
    -- Entertainment & Experiences
    WHEN 'events-festivals' THEN png_file := '022-party-people.png';
    WHEN 'sports-recreation' THEN png_file := '033-sport.png';
    WHEN 'nightlife' THEN png_file := '041-dj.png';
    WHEN 'comedy-clubs' THEN png_file := '042-mime.png';
    
    -- Arts & Culture
    WHEN 'museums' THEN png_file := '018-museum.png';
    WHEN 'galleries' THEN png_file := '019-art-gallery.png';
    WHEN 'theaters' THEN png_file := '020-theatre.png';
    WHEN 'concerts' THEN png_file := '040-stage.png';
    
    -- Family & Pets
    WHEN 'family-activities' THEN png_file := '022-party-people.png';
    WHEN 'pet-services' THEN png_file := '038-pet.png';
    WHEN 'childcare' THEN png_file := '044-student.png';
    WHEN 'veterinarians' THEN png_file := '037-veterinarian.png';
    
    -- Shopping & Lifestyle
    WHEN 'fashion' THEN png_file := '024-boutique.png';
    WHEN 'electronics' THEN png_file := '023-shopping-bag.png';
    WHEN 'home-decor' THEN png_file := '026-house-decoration.png';
    WHEN 'books' THEN png_file := '025-open-book.png';
    
    -- Default fallback
    ELSE png_file := '023-shopping-bag.png';
  END CASE;
  
  RETURN '/png/' || png_file;
END;
$$ LANGUAGE plpgsql;

-- Now update all businesses with the correct image_url based on their category
UPDATE businesses
SET image_url = get_category_image_url(category, name)
WHERE image_url IS NULL 
   OR image_url LIKE '/png/%'  -- Only update PNG placeholders, not uploaded images
   OR image_url NOT LIKE 'http%';  -- Don't update external URLs

-- Optional: Show a summary of the update
SELECT 
  category,
  COUNT(*) as count,
  get_category_image_url(category, name) as image_url
FROM businesses
GROUP BY category, name
ORDER BY count DESC
LIMIT 20;

-- Clean up: Drop the function if you don't need it anymore
-- DROP FUNCTION IF EXISTS get_category_image_url(TEXT, TEXT);

