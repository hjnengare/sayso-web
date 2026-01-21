-- Auto-assign business image URLs based on category
-- This trigger automatically assigns the correct PNG placeholder image
-- when a business is inserted or updated, based on its category and name

-- Function to get subcategory from category
CREATE OR REPLACE FUNCTION get_subcategory_from_category(category_name TEXT, business_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  name_lower TEXT;
BEGIN
  -- Use business name hints for better categorization
  IF business_name IS NOT NULL THEN
    name_lower := LOWER(business_name);
    
    -- Telecom/Electronics hints
    IF name_lower LIKE '%cell%' OR name_lower LIKE '%mobile%' OR 
       name_lower LIKE '%vodacom%' OR name_lower LIKE '%mtn%' OR 
       name_lower LIKE '%telkom%' OR name_lower LIKE '%telecom%' OR
       name_lower LIKE '%phone%' OR name_lower LIKE '%cellular%' THEN
      RETURN 'electronics';
    END IF;
    
    -- Restaurant/Food hints
    IF name_lower LIKE '%restaurant%' OR name_lower LIKE '%cafe%' OR 
       name_lower LIKE '%bistro%' OR name_lower LIKE '%diner%' OR
       name_lower LIKE '%pizza%' OR name_lower LIKE '%burger%' OR
       name_lower LIKE '%food%' OR name_lower LIKE '%kitchen%' THEN
      RETURN 'restaurants';
    END IF;
    
    -- Clothing/Fashion hints
    IF name_lower LIKE '%boutique%' OR name_lower LIKE '%fashion%' OR
       name_lower LIKE '%clothing%' OR name_lower LIKE '%apparel%' THEN
      RETURN 'fashion';
    END IF;
    
    -- Fitness/Gym hints
    IF name_lower LIKE '%gym%' OR name_lower LIKE '%fitness%' OR
       name_lower LIKE '%health%' OR name_lower LIKE '%wellness%' THEN
      RETURN 'gyms';
    END IF;
  END IF;
  
  -- Map category to subcategory
  CASE TRIM(category_name)
    -- Food & Drink
    WHEN 'Restaurant' THEN RETURN 'restaurants';
    WHEN 'Fast Food' THEN RETURN 'fast-food';
    WHEN 'Coffee Shop' THEN RETURN 'cafes';
    WHEN 'Bar' THEN RETURN 'bars';
    WHEN 'Bakery' THEN RETURN 'restaurants';
    WHEN 'Ice Cream' THEN RETURN 'fast-food';
    WHEN 'Supermarket' THEN RETURN 'fast-food';
    WHEN 'Grocery' THEN RETURN 'fast-food';
    
    -- Beauty & Wellness
    WHEN 'Salon' THEN RETURN 'salons';
    WHEN 'Wellness' THEN RETURN 'wellness';
    WHEN 'Fitness' THEN RETURN 'gyms';
    WHEN 'Spa' THEN RETURN 'spas';
    
    -- Professional Services
    WHEN 'Bank' THEN RETURN 'finance-insurance';
    WHEN 'ATM' THEN RETURN 'finance-insurance';
    WHEN 'Pharmacy' THEN RETURN 'finance-insurance';
    WHEN 'Dental' THEN RETURN 'education-learning';
    WHEN 'Veterinary' THEN RETURN 'veterinarians';
    WHEN 'Clinic' THEN RETURN 'education-learning';
    WHEN 'Hospital' THEN RETURN 'education-learning';
    
    -- Arts & Culture
    WHEN 'Museum' THEN RETURN 'museums';
    WHEN 'Art Gallery' THEN RETURN 'galleries';
    WHEN 'Theater' THEN RETURN 'theaters';
    WHEN 'Cinema' THEN RETURN 'theaters';
    WHEN 'Music Venue' THEN RETURN 'concerts';
    WHEN 'Nightclub' THEN RETURN 'nightlife';
    WHEN 'Bookstore' THEN RETURN 'books';
    
    -- Shopping & Lifestyle
    WHEN 'Clothing' THEN RETURN 'fashion';
    WHEN 'Jewelry' THEN RETURN 'fashion';
    WHEN 'Florist' THEN RETURN 'home-decor';
    
    -- Electronics & Telecom
    WHEN 'Electronics' THEN RETURN 'electronics';
    
    -- Outdoors & Adventure
    WHEN 'Park' THEN RETURN 'hiking';
    WHEN 'Zoo' THEN RETURN 'family-activities';
    WHEN 'Aquarium' THEN RETURN 'family-activities';
    WHEN 'Attraction' THEN RETURN 'events-festivals';
    WHEN 'Gas Station' THEN RETURN 'transport-travel';
    WHEN 'Parking' THEN RETURN 'transport-travel';
    WHEN 'Hotel' THEN RETURN 'transport-travel';
    WHEN 'Hostel' THEN RETURN 'transport-travel';
    
    -- Default fallback to shopping bag for unclear categories
    ELSE RETURN 'electronics';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get PNG file from subcategory
CREATE OR REPLACE FUNCTION get_png_from_subcategory(subcategory_name TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE subcategory_name
    -- Food & Drink
    WHEN 'restaurants' THEN RETURN '001-restaurant.png';
    WHEN 'cafes' THEN RETURN '002-coffee-cup.png';
    WHEN 'bars' THEN RETURN '003-cocktail.png';
    WHEN 'fast-food' THEN RETURN '031-fast-food.png';
    WHEN 'fine-dining' THEN RETURN '004-dinner.png';
    
    -- Beauty & Wellness
    WHEN 'gyms' THEN RETURN '014-dumbbell.png';
    WHEN 'spas' THEN RETURN '010-spa.png';
    WHEN 'salons' THEN RETURN '009-salon.png';
    WHEN 'wellness' THEN RETURN '013-body-massage.png';
    WHEN 'nail-salons' THEN RETURN '011-nail-polish.png';
    
    -- Professional Services
    WHEN 'education-learning' THEN RETURN '044-student.png';
    WHEN 'transport-travel' THEN RETURN '045-transportation.png';
    WHEN 'finance-insurance' THEN RETURN '046-insurance.png';
    WHEN 'plumbers' THEN RETURN '047-plunger.png';
    WHEN 'electricians' THEN RETURN '049-broken-cable.png';
    WHEN 'legal-services' THEN RETURN '050-balance.png';
    
    -- Outdoors & Adventure
    WHEN 'hiking' THEN RETURN '034-skydive.png';
    WHEN 'cycling' THEN RETURN '033-sport.png';
    WHEN 'water-sports' THEN RETURN '032-swim.png';
    WHEN 'camping' THEN RETURN '036-summer.png';
    
    -- Entertainment & Experiences
    WHEN 'events-festivals' THEN RETURN '022-party-people.png';
    WHEN 'sports-recreation' THEN RETURN '033-sport.png';
    WHEN 'nightlife' THEN RETURN '041-dj.png';
    WHEN 'comedy-clubs' THEN RETURN '042-mime.png';
    
    -- Arts & Culture
    WHEN 'museums' THEN RETURN '018-museum.png';
    WHEN 'galleries' THEN RETURN '019-art-gallery.png';
    WHEN 'theaters' THEN RETURN '020-theatre.png';
    WHEN 'concerts' THEN RETURN '040-stage.png';
    
    -- Family & Pets
    WHEN 'family-activities' THEN RETURN '022-party-people.png';
    WHEN 'pet-services' THEN RETURN '038-pet.png';
    WHEN 'childcare' THEN RETURN '044-student.png';
    WHEN 'veterinarians' THEN RETURN '037-veterinarian.png';
    
    -- Shopping & Lifestyle
    WHEN 'fashion' THEN RETURN '024-boutique.png';
    WHEN 'electronics' THEN RETURN '023-shopping-bag.png';
    WHEN 'home-decor' THEN RETURN '026-house-decoration.png';
    WHEN 'books' THEN RETURN '025-open-book.png';
    
    -- Default fallback to shopping bag for unclear categories
    ELSE RETURN '023-shopping-bag.png';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically assign image_url based on category
CREATE OR REPLACE FUNCTION auto_assign_business_image()
RETURNS TRIGGER AS $$
DECLARE
  subcategory TEXT;
  png_file TEXT;
  image_url_value TEXT;
BEGIN
  -- Only assign image_url if:
  -- 1. image_url is NULL, OR
  -- 2. image_url is a PNG placeholder (starts with '/png/'), OR
  -- 3. image_url is empty string
  -- Don't overwrite uploaded images or external URLs
  
  IF NEW.image_url IS NULL OR 
     NEW.image_url = '' OR
     (NEW.image_url LIKE '/png/%' AND NEW.image_url NOT LIKE 'http%') THEN
    
    -- Get subcategory from category and name
    subcategory := get_subcategory_from_category(NEW.category, NEW.name);
    
    -- Get PNG file from subcategory
    png_file := get_png_from_subcategory(subcategory);
    
    -- Set image_url
    image_url_value := '/png/' || png_file;
    NEW.image_url := image_url_value;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign image_url on insert or update
DROP TRIGGER IF EXISTS auto_assign_business_image_trigger ON businesses;
CREATE TRIGGER auto_assign_business_image_trigger
  BEFORE INSERT OR UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_business_image();

-- Update existing businesses that don't have a clear image_url
-- This is a one-time update for existing data
UPDATE businesses
SET image_url = '/png/' || get_png_from_subcategory(
  get_subcategory_from_category(category, name)
)
WHERE image_url IS NULL 
   OR image_url = ''
   OR (image_url LIKE '/png/%' AND image_url NOT LIKE 'http%');

