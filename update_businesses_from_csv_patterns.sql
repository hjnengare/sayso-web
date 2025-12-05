-- ============================================
-- UPDATE Businesses Based on CSV Patterns
-- ============================================
-- This query uses BOTH name and description fields to categorize businesses
-- Based on actual patterns found in the businesses_rows.csv file
-- Prioritizes name keywords first, then description keywords
-- ============================================

UPDATE businesses
SET 
  category = CASE
    -- EDUCATION & LEARNING (MUST come first to avoid conflicts)
    -- Check name first, then description
    -- If name has "primary", "secondary", or "educational" it's a school
    WHEN LOWER(name) LIKE '%primary%' OR LOWER(name) LIKE '%secondary%' OR LOWER(name) LIKE '%educational%' THEN 'education-learning'
    WHEN LOWER(name) LIKE '%school%' OR LOWER(name) LIKE '%skool%' OR LOWER(name) LIKE '%laerskool%' OR LOWER(name) LIKE '%academy%' OR LOWER(name) LIKE '%college%' OR LOWER(name) LIKE '%university%' OR LOWER(name) LIKE '%institute%' OR LOWER(name) LIKE '%educare%' OR LOWER(name) LIKE '%educare centre%' OR LOWER(name) LIKE '%educare center%' OR LOWER(name) LIKE '%primary school%' OR LOWER(name) LIKE '%secondary school%' OR LOWER(name) LIKE '%high school%' OR LOWER(name) LIKE '%pre school%' OR LOWER(name) LIKE '%pre-school%' OR LOWER(name) LIKE '%elementary%' OR LOWER(name) LIKE '%junior school%' OR LOWER(name) LIKE '%learning%' OR LOWER(name) LIKE '%therapy cent%' THEN 'education-learning'
    WHEN (LOWER(description) LIKE '%school%' OR LOWER(description) LIKE '%educare%' OR LOWER(description) LIKE '%education%' OR LOWER(description) LIKE '%learning%' OR LOWER(description) LIKE '%teaching%' OR LOWER(description) LIKE '%primary school%' OR LOWER(description) LIKE '%secondary school%') AND LOWER(name) NOT LIKE '%transport%' AND LOWER(name) NOT LIKE '%travel%' THEN 'education-learning'
    
    -- FOOD & DRINK
    WHEN LOWER(name) LIKE '%restaurant%' OR LOWER(name) LIKE '%resto%' OR LOWER(name) LIKE '%bistro%' OR LOWER(name) LIKE '%eatery%' OR LOWER(name) LIKE '%cafe%' OR LOWER(name) LIKE '%coffee%' OR LOWER(name) LIKE '%bar%' OR LOWER(name) LIKE '%pub%' OR LOWER(name) LIKE '%fast food%' OR LOWER(name) LIKE '%burger%' OR LOWER(name) LIKE '%pizza%' OR LOWER(name) LIKE '%bakery%' OR LOWER(name) LIKE '%food%' THEN 
      CASE
        WHEN LOWER(name) LIKE '%restaurant%' OR LOWER(name) LIKE '%resto%' OR LOWER(name) LIKE '%bistro%' OR LOWER(name) LIKE '%eatery%' THEN 'restaurants'
        WHEN LOWER(name) LIKE '%cafe%' OR LOWER(name) LIKE '%coffee%' OR LOWER(name) LIKE '%espresso%' OR LOWER(name) LIKE '%latte%' OR LOWER(name) LIKE '%cappuccino%' THEN 'cafes'
        WHEN LOWER(name) LIKE '%bar%' OR LOWER(name) LIKE '%pub%' OR LOWER(name) LIKE '%tavern%' OR LOWER(name) LIKE '%cocktail%' OR LOWER(name) LIKE '%brewery%' OR LOWER(name) LIKE '%shebeen%' THEN 'bars'
        WHEN LOWER(name) LIKE '%fast food%' OR LOWER(name) LIKE '%fastfood%' OR LOWER(name) LIKE '%burger%' OR LOWER(name) LIKE '%pizza%' OR LOWER(name) LIKE '%takeaway%' OR LOWER(name) LIKE '%kfc%' OR LOWER(name) LIKE '%steers%' OR LOWER(name) LIKE '%nyama%' THEN 'fast-food'
        WHEN LOWER(name) LIKE '%fine dining%' OR LOWER(name) LIKE '%gourmet%' OR LOWER(name) LIKE '%michelin%' THEN 'fine-dining'
        WHEN LOWER(name) LIKE '%bakery%' OR LOWER(name) LIKE '%baker%' OR LOWER(name) LIKE '%patisserie%' THEN 'bakery'
        WHEN LOWER(name) LIKE '%food truck%' OR LOWER(name) LIKE '%foodtruck%' THEN 'food-truck'
        WHEN LOWER(name) LIKE '%grocery%' OR LOWER(name) LIKE '%supermarket%' OR LOWER(name) LIKE '%market%' THEN 'grocery'
        ELSE 'restaurants'
      END
    WHEN LOWER(description) LIKE '%restaurant located%' OR LOWER(description) LIKE '%restaurant%' THEN 'restaurants'
    WHEN LOWER(description) LIKE '%coffee shop located%' OR LOWER(description) LIKE '%coffee shop%' OR LOWER(description) LIKE '%cafe%' THEN 'cafes'
    WHEN LOWER(description) LIKE '%bar located%' OR LOWER(description) LIKE '%pub%' THEN 'bars'
    WHEN LOWER(description) LIKE '%fast food located%' OR LOWER(description) LIKE '%fast food%' THEN 'fast-food'
    
    -- BEAUTY & WELLNESS
    WHEN LOWER(name) LIKE '%salon%' OR LOWER(name) LIKE '%hairdresser%' OR LOWER(name) LIKE '%barber%' OR LOWER(name) LIKE '%spa%' OR LOWER(name) LIKE '%massage%' OR LOWER(name) LIKE '%gym%' OR LOWER(name) LIKE '%fitness%' OR LOWER(name) LIKE '%yoga%' OR LOWER(name) LIKE '%nail%' OR LOWER(name) LIKE '%wellness%' THEN
      CASE
        WHEN LOWER(name) LIKE '%gym%' OR LOWER(name) LIKE '%fitness%' OR LOWER(name) LIKE '%crossfit%' OR LOWER(name) LIKE '%training%' OR LOWER(name) LIKE '%workout%' THEN 'gyms'
        WHEN LOWER(name) LIKE '%spa%' OR LOWER(name) LIKE '%massage%' OR LOWER(name) LIKE '%wellness center%' OR LOWER(name) LIKE '%wellness centre%' THEN 'spas'
        WHEN LOWER(name) LIKE '%salon%' OR LOWER(name) LIKE '%hairdresser%' OR LOWER(name) LIKE '%hair salon%' OR LOWER(name) LIKE '%haircut%' THEN 'salons'
        WHEN LOWER(name) LIKE '%barber%' OR LOWER(name) LIKE '%barbershop%' THEN 'barber'
        WHEN LOWER(name) LIKE '%nail%' OR LOWER(name) LIKE '%manicure%' OR LOWER(name) LIKE '%pedicure%' THEN 'nail-salons'
        WHEN LOWER(name) LIKE '%yoga%' OR LOWER(name) LIKE '%yogi%' THEN 'yoga'
        WHEN LOWER(name) LIKE '%pilates%' THEN 'pilates'
        WHEN LOWER(name) LIKE '%martial arts%' OR LOWER(name) LIKE '%karate%' OR LOWER(name) LIKE '%taekwondo%' OR LOWER(name) LIKE '%judo%' THEN 'martial-arts'
        ELSE 'salons'
      END
    WHEN LOWER(description) LIKE '%salon located%' OR LOWER(description) LIKE '%salon%' THEN 'salons'
    WHEN LOWER(description) LIKE '%spa%' OR LOWER(description) LIKE '%massage%' THEN 'spas'
    WHEN LOWER(description) LIKE '%gym%' OR LOWER(description) LIKE '%fitness%' THEN 'gyms'
    
    -- PROFESSIONAL SERVICES
    WHEN LOWER(name) LIKE '%bank%' OR LOWER(name) LIKE '%finance%' OR LOWER(name) LIKE '%insurance%' OR LOWER(name) LIKE '%plumber%' OR LOWER(name) LIKE '%electrician%' OR LOWER(name) LIKE '%legal%' OR LOWER(name) LIKE '%lawyer%' OR LOWER(name) LIKE '%handyman%' OR LOWER(name) LIKE '%laundry%' OR LOWER(name) LIKE '%pest control%' OR LOWER(name) LIKE '%workshop%' THEN
      CASE
        WHEN LOWER(name) LIKE '%bank%' OR LOWER(name) LIKE '%atm%' OR LOWER(name) LIKE '%finance%' OR LOWER(name) LIKE '%insurance%' OR LOWER(name) LIKE '%financial%' OR LOWER(name) LIKE '%credit union%' OR LOWER(name) LIKE '%capitec%' THEN 'finance-insurance'
        WHEN LOWER(name) LIKE '%plumber%' OR LOWER(name) LIKE '%plumbing%' THEN 'plumbers'
        WHEN LOWER(name) LIKE '%electrician%' OR LOWER(name) LIKE '%electrical%' OR LOWER(name) LIKE '%electric%' THEN 'electricians'
        WHEN LOWER(name) LIKE '%legal%' OR LOWER(name) LIKE '%lawyer%' OR LOWER(name) LIKE '%attorney%' OR LOWER(name) LIKE '%law firm%' OR LOWER(name) LIKE '%solicitor%' THEN 'legal-services'
        WHEN LOWER(name) LIKE '%handyman%' OR LOWER(name) LIKE '%handy man%' THEN 'handyman'
        WHEN LOWER(name) LIKE '%laundry%' OR LOWER(name) LIKE '%dry clean%' OR LOWER(name) LIKE '%dryclean%' THEN 'laundry'
        WHEN LOWER(name) LIKE '%pest control%' OR LOWER(name) LIKE '%pestcontrol%' OR LOWER(name) LIKE '%exterminator%' THEN 'pest-control'
        WHEN LOWER(name) LIKE '%workshop%' OR LOWER(name) LIKE '%repair%' THEN 'workshop'
        ELSE 'professional-services'
      END
    WHEN LOWER(description) LIKE '%bank located%' OR LOWER(description) LIKE '%bank%' THEN 'finance-insurance'
    WHEN LOWER(description) LIKE '%plumber%' OR LOWER(description) LIKE '%plumbing%' THEN 'plumbers'
    WHEN LOWER(description) LIKE '%electrician%' OR LOWER(description) LIKE '%electrical%' THEN 'electricians'
    
    -- TRANSPORT & TRAVEL (only if NOT a school)
    WHEN (LOWER(name) LIKE '%taxi%' OR LOWER(name) LIKE '%uber%' OR LOWER(name) LIKE '%transport%' OR LOWER(name) LIKE '%travel%' OR LOWER(name) LIKE '%bus company%' OR LOWER(name) LIKE '%car rental%' OR LOWER(name) LIKE '%bicycle rental%' OR (LOWER(name) LIKE '%cycle%' AND LOWER(name) NOT LIKE '%school%' AND LOWER(name) NOT LIKE '%education%')) AND LOWER(name) NOT LIKE '%school%' AND LOWER(name) NOT LIKE '%educare%' AND LOWER(name) NOT LIKE '%education%' THEN 'transport-travel'
    WHEN LOWER(description) LIKE '%transport%' AND LOWER(name) NOT LIKE '%school%' AND LOWER(name) NOT LIKE '%educare%' AND LOWER(name) NOT LIKE '%education%' THEN 'transport-travel'
    
    -- ARTS & CULTURE
    WHEN LOWER(name) LIKE '%theater%' OR LOWER(name) LIKE '%theatre%' OR LOWER(name) LIKE '%amphitheatre%' OR LOWER(name) LIKE '%museum%' OR LOWER(name) LIKE '%gallery%' OR LOWER(name) LIKE '%concert%' OR LOWER(name) LIKE '%cinema%' OR LOWER(name) LIKE '%movie%' OR LOWER(name) LIKE '%film%' OR LOWER(name) LIKE '%ster-kinekor%' OR LOWER(name) LIKE '%kinekor%' THEN
      CASE
        WHEN LOWER(name) LIKE '%museum%' OR LOWER(name) LIKE '%gallery%' OR LOWER(name) LIKE '%art gallery%' THEN 'museums'
        WHEN LOWER(name) LIKE '%gallery%' OR LOWER(name) LIKE '%art%' OR LOWER(name) LIKE '%exhibition%' THEN 'galleries'
        WHEN LOWER(name) LIKE '%theater%' OR LOWER(name) LIKE '%theatre%' OR LOWER(name) LIKE '%playhouse%' OR LOWER(name) LIKE '%drama%' OR LOWER(name) LIKE '%amphitheatre%' THEN 'theaters'
        WHEN LOWER(name) LIKE '%concert%' OR LOWER(name) LIKE '%music%' OR LOWER(name) LIKE '%orchestra%' OR LOWER(name) LIKE '%symphony%' THEN 'concerts'
        WHEN LOWER(name) LIKE '%cinema%' OR LOWER(name) LIKE '%movie%' OR LOWER(name) LIKE '%film%' OR LOWER(name) LIKE '%ster-kinekor%' OR LOWER(name) LIKE '%kinekor%' THEN 'cinemas'
        ELSE 'theaters'
      END
    WHEN LOWER(description) LIKE '%theater located%' OR LOWER(description) LIKE '%theatre%' OR LOWER(description) LIKE '%cinema located%' OR LOWER(description) LIKE '%cinema%' THEN 'theaters'
    WHEN LOWER(description) LIKE '%museum%' OR LOWER(description) LIKE '%gallery%' THEN 'museums'
    
    -- FAMILY & PETS
    WHEN LOWER(name) LIKE '%veterinarian%' OR LOWER(name) LIKE '%vet%' OR LOWER(name) LIKE '%veterinary%' OR LOWER(name) LIKE '%animal hospital%' OR LOWER(name) LIKE '%citivet%' THEN 'veterinarians'
    WHEN LOWER(name) LIKE '%pet%' OR LOWER(name) LIKE '%dog%' OR LOWER(name) LIKE '%cat%' OR LOWER(name) LIKE '%animal%' OR LOWER(name) LIKE '%pet shop%' OR LOWER(name) LIKE '%petshop%' OR LOWER(name) LIKE '%zoo%' OR LOWER(name) LIKE '%birds%' THEN 'pet-services'
    WHEN LOWER(name) LIKE '%family%' OR LOWER(name) LIKE '%kids%' OR LOWER(name) LIKE '%children%' OR LOWER(name) LIKE '%playground%' OR LOWER(name) LIKE '%toddler%' OR LOWER(name) LIKE '%homestead%' OR LOWER(name) LIKE '%child%' OR LOWER(name) LIKE '%youth%' THEN
      CASE
        WHEN LOWER(name) LIKE '%childcare%' OR LOWER(name) LIKE '%child care%' OR LOWER(name) LIKE '%daycare%' OR LOWER(name) LIKE '%day care%' OR LOWER(name) LIKE '%nursery%' OR LOWER(name) LIKE '%babysit%' THEN 'childcare'
        WHEN LOWER(name) LIKE '%veterinarian%' OR LOWER(name) LIKE '%vet%' OR LOWER(name) LIKE '%veterinary%' OR LOWER(name) LIKE '%animal hospital%' THEN 'veterinarians'
        ELSE 'family-activities'
      END
    WHEN LOWER(description) LIKE '%veterinary located%' OR LOWER(description) LIKE '%veterinary%' OR LOWER(description) LIKE '%vet%' THEN 'veterinarians'
    WHEN LOWER(description) LIKE '%zoo located%' OR LOWER(description) LIKE '%zoo%' THEN 'family-activities'
    
    -- SHOPPING & LIFESTYLE
    WHEN LOWER(name) LIKE '%jewelry%' OR LOWER(name) LIKE '%jewellery%' OR LOWER(name) LIKE '%diamond%' OR LOWER(name) LIKE '%fashion%' OR LOWER(name) LIKE '%clothing%' OR LOWER(name) LIKE '%boutique%' OR LOWER(name) LIKE '%fashion%' THEN 'fashion'
    WHEN LOWER(name) LIKE '%electronic%' OR LOWER(name) LIKE '%tech%' OR LOWER(name) LIKE '%computer%' OR LOWER(name) LIKE '%phone%' OR LOWER(name) LIKE '%mobile%' THEN 'electronics'
    WHEN LOWER(name) LIKE '%book%' OR LOWER(name) LIKE '%library%' OR LOWER(name) LIKE '%bookstore%' OR LOWER(name) LIKE '%pna%' THEN 'books'
    WHEN LOWER(name) LIKE '%home%' OR LOWER(name) LIKE '%furniture%' OR LOWER(name) LIKE '%interior%' OR LOWER(name) LIKE '%decor%' OR LOWER(name) LIKE '%living space%' THEN 'home-decor'
    WHEN LOWER(description) LIKE '%bookstore located%' OR LOWER(description) LIKE '%bookstore%' OR LOWER(description) LIKE '%library%' THEN 'books'
    WHEN LOWER(description) LIKE '%jewelry located%' OR LOWER(description) LIKE '%jewelry%' OR LOWER(description) LIKE '%jewellery%' THEN 'fashion'
    
    -- OUTDOORS & ADVENTURE
    WHEN LOWER(name) LIKE '%hiking%' OR LOWER(name) LIKE '%hike%' OR LOWER(name) LIKE '%trail%' OR LOWER(name) LIKE '%mountain%' THEN 'hiking'
    WHEN LOWER(name) LIKE '%cycling%' OR (LOWER(name) LIKE '%cycle%' AND LOWER(name) NOT LIKE '%school%' AND LOWER(name) NOT LIKE '%education%') OR LOWER(name) LIKE '%bike%' OR LOWER(name) LIKE '%bicycle%' OR LOWER(name) LIKE '%up cycles%' OR LOWER(name) LIKE '%upcycles%' THEN 'cycling'
    WHEN LOWER(name) LIKE '%water sport%' OR LOWER(name) LIKE '%watersport%' OR LOWER(name) LIKE '%surfing%' OR LOWER(name) LIKE '%diving%' OR LOWER(name) LIKE '%swimming%' OR LOWER(name) LIKE '%kayak%' OR LOWER(name) LIKE '%paddle%' THEN 'water-sports'
    WHEN LOWER(name) LIKE '%camping%' OR LOWER(name) LIKE '%camp%' OR LOWER(name) LIKE '%outdoor%' THEN 'camping'
    WHEN LOWER(name) LIKE '%skydive%' OR LOWER(name) LIKE '%sky dive%' THEN 'skydiving'
    WHEN LOWER(name) LIKE '%tour guide%' OR LOWER(name) LIKE '%tourguide%' OR LOWER(name) LIKE '%tours%' OR LOWER(name) LIKE '%tour%' THEN 'tour-guide'
    
    -- EXPERIENCES & ENTERTAINMENT
    WHEN LOWER(name) LIKE '%event%' OR LOWER(name) LIKE '%festival%' OR LOWER(name) LIKE '%party%' OR LOWER(name) LIKE '%venue%' THEN 'events-festivals'
    WHEN LOWER(name) LIKE '%sport%' OR LOWER(name) LIKE '%recreation%' OR LOWER(name) LIKE '%stadium%' OR LOWER(name) LIKE '%arena%' THEN 'sports-recreation'
    WHEN LOWER(name) LIKE '%nightlife%' OR LOWER(name) LIKE '%night club%' OR LOWER(name) LIKE '%nightclub%' OR LOWER(name) LIKE '%club%' OR LOWER(name) LIKE '%disco%' THEN 'nightlife'
    WHEN LOWER(name) LIKE '%comedy%' OR LOWER(name) LIKE '%comic%' THEN 'comedy-clubs'
    
    -- COMMUNITY HALLS (could be events or family activities)
    WHEN LOWER(name) LIKE '%community hall%' OR LOWER(name) LIKE '%hall%' THEN 'events-festivals'
    
    ELSE category -- Keep existing category if no match
  END,
  updated_at = NOW()
WHERE 
  -- Only update businesses that have name or description
  (name IS NOT NULL AND name != '')
  AND (
    -- Match keywords in name
    LOWER(name) LIKE '%primary%' OR LOWER(name) LIKE '%secondary%' OR LOWER(name) LIKE '%educational%' OR
    LOWER(name) LIKE '%school%' OR LOWER(name) LIKE '%skool%' OR LOWER(name) LIKE '%laerskool%' OR LOWER(name) LIKE '%academy%' OR LOWER(name) LIKE '%college%' OR LOWER(name) LIKE '%university%' OR LOWER(name) LIKE '%institute%' OR LOWER(name) LIKE '%educare%' OR LOWER(name) LIKE '%primary school%' OR LOWER(name) LIKE '%secondary school%' OR LOWER(name) LIKE '%high school%' OR LOWER(name) LIKE '%pre school%' OR LOWER(name) LIKE '%pre-school%' OR LOWER(name) LIKE '%elementary%' OR LOWER(name) LIKE '%junior school%' OR LOWER(name) LIKE '%learning%' OR LOWER(name) LIKE '%therapy cent%' OR
    LOWER(name) LIKE '%restaurant%' OR LOWER(name) LIKE '%resto%' OR LOWER(name) LIKE '%bistro%' OR LOWER(name) LIKE '%eatery%' OR LOWER(name) LIKE '%cafe%' OR LOWER(name) LIKE '%coffee%' OR LOWER(name) LIKE '%bar%' OR LOWER(name) LIKE '%pub%' OR LOWER(name) LIKE '%fast food%' OR LOWER(name) LIKE '%burger%' OR LOWER(name) LIKE '%pizza%' OR LOWER(name) LIKE '%bakery%' OR LOWER(name) LIKE '%food%' OR LOWER(name) LIKE '%kfc%' OR LOWER(name) LIKE '%steers%' OR LOWER(name) LIKE '%nyama%' OR LOWER(name) LIKE '%shebeen%' OR
    LOWER(name) LIKE '%salon%' OR LOWER(name) LIKE '%hairdresser%' OR LOWER(name) LIKE '%barber%' OR LOWER(name) LIKE '%spa%' OR LOWER(name) LIKE '%massage%' OR LOWER(name) LIKE '%gym%' OR LOWER(name) LIKE '%fitness%' OR LOWER(name) LIKE '%yoga%' OR LOWER(name) LIKE '%nail%' OR LOWER(name) LIKE '%wellness%' OR
    LOWER(name) LIKE '%bank%' OR LOWER(name) LIKE '%finance%' OR LOWER(name) LIKE '%insurance%' OR LOWER(name) LIKE '%plumber%' OR LOWER(name) LIKE '%electrician%' OR LOWER(name) LIKE '%legal%' OR LOWER(name) LIKE '%lawyer%' OR LOWER(name) LIKE '%handyman%' OR LOWER(name) LIKE '%laundry%' OR LOWER(name) LIKE '%pest control%' OR LOWER(name) LIKE '%workshop%' OR LOWER(name) LIKE '%capitec%' OR
    (LOWER(name) LIKE '%taxi%' OR LOWER(name) LIKE '%uber%' OR LOWER(name) LIKE '%transport%' OR LOWER(name) LIKE '%travel%' OR (LOWER(name) LIKE '%cycle%' AND LOWER(name) NOT LIKE '%school%' AND LOWER(name) NOT LIKE '%education%')) AND LOWER(name) NOT LIKE '%school%' AND LOWER(name) NOT LIKE '%educare%' AND LOWER(name) NOT LIKE '%education%' OR
    LOWER(name) LIKE '%theater%' OR LOWER(name) LIKE '%theatre%' OR LOWER(name) LIKE '%amphitheatre%' OR LOWER(name) LIKE '%museum%' OR LOWER(name) LIKE '%gallery%' OR LOWER(name) LIKE '%concert%' OR LOWER(name) LIKE '%cinema%' OR LOWER(name) LIKE '%movie%' OR LOWER(name) LIKE '%film%' OR LOWER(name) LIKE '%ster-kinekor%' OR LOWER(name) LIKE '%kinekor%' OR
    LOWER(name) LIKE '%veterinarian%' OR LOWER(name) LIKE '%vet%' OR LOWER(name) LIKE '%veterinary%' OR LOWER(name) LIKE '%animal hospital%' OR LOWER(name) LIKE '%citivet%' OR LOWER(name) LIKE '%pet%' OR LOWER(name) LIKE '%dog%' OR LOWER(name) LIKE '%cat%' OR LOWER(name) LIKE '%animal%' OR LOWER(name) LIKE '%zoo%' OR LOWER(name) LIKE '%birds%' OR
    LOWER(name) LIKE '%family%' OR LOWER(name) LIKE '%kids%' OR LOWER(name) LIKE '%children%' OR LOWER(name) LIKE '%playground%' OR LOWER(name) LIKE '%toddler%' OR LOWER(name) LIKE '%homestead%' OR LOWER(name) LIKE '%child%' OR LOWER(name) LIKE '%youth%' OR
    LOWER(name) LIKE '%jewelry%' OR LOWER(name) LIKE '%jewellery%' OR LOWER(name) LIKE '%diamond%' OR LOWER(name) LIKE '%fashion%' OR LOWER(name) LIKE '%clothing%' OR LOWER(name) LIKE '%boutique%' OR
    LOWER(name) LIKE '%electronic%' OR LOWER(name) LIKE '%tech%' OR LOWER(name) LIKE '%computer%' OR LOWER(name) LIKE '%phone%' OR LOWER(name) LIKE '%mobile%' OR
    LOWER(name) LIKE '%book%' OR LOWER(name) LIKE '%library%' OR LOWER(name) LIKE '%bookstore%' OR LOWER(name) LIKE '%pna%' OR
    LOWER(name) LIKE '%home%' OR LOWER(name) LIKE '%furniture%' OR LOWER(name) LIKE '%interior%' OR LOWER(name) LIKE '%decor%' OR LOWER(name) LIKE '%living space%' OR
    LOWER(name) LIKE '%hiking%' OR LOWER(name) LIKE '%hike%' OR LOWER(name) LIKE '%trail%' OR LOWER(name) LIKE '%mountain%' OR
    LOWER(name) LIKE '%cycling%' OR (LOWER(name) LIKE '%cycle%' AND LOWER(name) NOT LIKE '%school%' AND LOWER(name) NOT LIKE '%education%') OR LOWER(name) LIKE '%bike%' OR LOWER(name) LIKE '%bicycle%' OR LOWER(name) LIKE '%up cycles%' OR LOWER(name) LIKE '%upcycles%' OR
    LOWER(name) LIKE '%water sport%' OR LOWER(name) LIKE '%watersport%' OR LOWER(name) LIKE '%surfing%' OR LOWER(name) LIKE '%diving%' OR LOWER(name) LIKE '%swimming%' OR LOWER(name) LIKE '%kayak%' OR LOWER(name) LIKE '%paddle%' OR
    LOWER(name) LIKE '%camping%' OR LOWER(name) LIKE '%camp%' OR LOWER(name) LIKE '%outdoor%' OR
    LOWER(name) LIKE '%skydive%' OR LOWER(name) LIKE '%sky dive%' OR
    LOWER(name) LIKE '%tour guide%' OR LOWER(name) LIKE '%tourguide%' OR LOWER(name) LIKE '%tours%' OR LOWER(name) LIKE '%tour%' OR
    LOWER(name) LIKE '%event%' OR LOWER(name) LIKE '%festival%' OR LOWER(name) LIKE '%party%' OR LOWER(name) LIKE '%venue%' OR
    LOWER(name) LIKE '%sport%' OR LOWER(name) LIKE '%recreation%' OR LOWER(name) LIKE '%stadium%' OR LOWER(name) LIKE '%arena%' OR
    LOWER(name) LIKE '%nightlife%' OR LOWER(name) LIKE '%night club%' OR LOWER(name) LIKE '%nightclub%' OR LOWER(name) LIKE '%club%' OR LOWER(name) LIKE '%disco%' OR
    LOWER(name) LIKE '%comedy%' OR LOWER(name) LIKE '%comic%' OR
    LOWER(name) LIKE '%community hall%' OR LOWER(name) LIKE '%hall%' OR
    -- Match keywords in description
    LOWER(description) LIKE '%restaurant located%' OR LOWER(description) LIKE '%coffee shop located%' OR LOWER(description) LIKE '%bar located%' OR LOWER(description) LIKE '%fast food located%' OR
    LOWER(description) LIKE '%salon located%' OR LOWER(description) LIKE '%spa%' OR LOWER(description) LIKE '%gym%' OR LOWER(description) LIKE '%fitness%' OR
    LOWER(description) LIKE '%bank located%' OR LOWER(description) LIKE '%plumber%' OR LOWER(description) LIKE '%electrician%' OR
    LOWER(description) LIKE '%theater located%' OR LOWER(description) LIKE '%theatre%' OR LOWER(description) LIKE '%cinema located%' OR LOWER(description) LIKE '%cinema%' OR LOWER(description) LIKE '%museum%' OR LOWER(description) LIKE '%gallery%' OR
    LOWER(description) LIKE '%veterinary located%' OR LOWER(description) LIKE '%veterinary%' OR LOWER(description) LIKE '%vet%' OR LOWER(description) LIKE '%zoo located%' OR LOWER(description) LIKE '%zoo%' OR
    LOWER(description) LIKE '%bookstore located%' OR LOWER(description) LIKE '%bookstore%' OR LOWER(description) LIKE '%library%' OR
    LOWER(description) LIKE '%jewelry located%' OR LOWER(description) LIKE '%jewelry%' OR LOWER(description) LIKE '%jewellery%' OR
    (LOWER(description) LIKE '%school%' OR LOWER(description) LIKE '%educare%' OR LOWER(description) LIKE '%education%' OR LOWER(description) LIKE '%learning%' OR LOWER(description) LIKE '%teaching%' OR LOWER(description) LIKE '%primary school%' OR LOWER(description) LIKE '%secondary school%') AND LOWER(name) NOT LIKE '%transport%' AND LOWER(name) NOT LIKE '%travel%'
  );

