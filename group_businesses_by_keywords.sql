-- ============================================
-- UPDATE Businesses by Keywords in Names
-- ============================================
-- This query UPDATES businesses based on keywords found in their names
-- Maps keywords to their corresponding categories/interests
-- ============================================

UPDATE businesses
SET 
  category = CASE
    -- Food & Drink
    WHEN LOWER(name) LIKE '%restaurant%' OR LOWER(name) LIKE '%resto%' OR LOWER(name) LIKE '%bistro%' OR LOWER(name) LIKE '%eatery%' THEN 'restaurants'
    WHEN LOWER(name) LIKE '%cafe%' OR LOWER(name) LIKE '%coffee%' OR LOWER(name) LIKE '%espresso%' OR LOWER(name) LIKE '%latte%' OR LOWER(name) LIKE '%cappuccino%' THEN 'cafes'
    WHEN LOWER(name) LIKE '%bar%' OR LOWER(name) LIKE '%pub%' OR LOWER(name) LIKE '%tavern%' OR LOWER(name) LIKE '%cocktail%' OR LOWER(name) LIKE '%wine bar%' OR LOWER(name) LIKE '%brewery%' THEN 'bars'
    WHEN LOWER(name) LIKE '%fast food%' OR LOWER(name) LIKE '%fastfood%' OR LOWER(name) LIKE '%burger%' OR LOWER(name) LIKE '%pizza%' OR LOWER(name) LIKE '%takeaway%' OR LOWER(name) LIKE '%take-out%' THEN 'fast-food'
    WHEN LOWER(name) LIKE '%fine dining%' OR LOWER(name) LIKE '%gourmet%' OR LOWER(name) LIKE '%michelin%' THEN 'fine-dining'
    WHEN LOWER(name) LIKE '%bakery%' OR LOWER(name) LIKE '%baker%' OR LOWER(name) LIKE '%patisserie%' THEN 'bakery'
    WHEN LOWER(name) LIKE '%food truck%' OR LOWER(name) LIKE '%foodtruck%' THEN 'food-truck'
    WHEN LOWER(name) LIKE '%grocery%' OR LOWER(name) LIKE '%supermarket%' OR LOWER(name) LIKE '%market%' THEN 'grocery'
    
    -- Beauty & Wellness
    WHEN LOWER(name) LIKE '%gym%' OR LOWER(name) LIKE '%fitness%' OR LOWER(name) LIKE '%crossfit%' OR LOWER(name) LIKE '%training%' OR LOWER(name) LIKE '%workout%' THEN 'gyms'
    WHEN LOWER(name) LIKE '%spa%' OR LOWER(name) LIKE '%massage%' OR LOWER(name) LIKE '%wellness center%' OR LOWER(name) LIKE '%wellness centre%' THEN 'spas'
    WHEN LOWER(name) LIKE '%salon%' OR LOWER(name) LIKE '%hairdresser%' OR LOWER(name) LIKE '%hair salon%' OR LOWER(name) LIKE '%haircut%' THEN 'salons'
    WHEN LOWER(name) LIKE '%wellness%' OR LOWER(name) LIKE '%health center%' OR LOWER(name) LIKE '%health centre%' THEN 'wellness'
    WHEN LOWER(name) LIKE '%yoga%' OR LOWER(name) LIKE '%yogi%' THEN 'yoga'
    WHEN LOWER(name) LIKE '%pilates%' THEN 'pilates'
    WHEN LOWER(name) LIKE '%martial arts%' OR LOWER(name) LIKE '%karate%' OR LOWER(name) LIKE '%taekwondo%' OR LOWER(name) LIKE '%judo%' THEN 'martial-arts'
    WHEN LOWER(name) LIKE '%barber%' OR LOWER(name) LIKE '%barbershop%' THEN 'barber'
    WHEN LOWER(name) LIKE '%nail%' OR LOWER(name) LIKE '%manicure%' OR LOWER(name) LIKE '%pedicure%' THEN 'nail-salons'
    
    -- Professional Services
    -- If name has "primary", "secondary", or "educational" it's a school
    WHEN LOWER(name) LIKE '%primary%' OR LOWER(name) LIKE '%secondary%' OR LOWER(name) LIKE '%educational%' THEN 'education-learning'
    WHEN LOWER(name) LIKE '%school%' OR LOWER(name) LIKE '%skool%' OR LOWER(name) LIKE '%academy%' OR LOWER(name) LIKE '%college%' OR LOWER(name) LIKE '%university%' OR LOWER(name) LIKE '%institute%' OR LOWER(name) LIKE '%learning center%' OR LOWER(name) LIKE '%learning centre%' OR LOWER(name) LIKE '%tutoring%' OR LOWER(name) LIKE '%tuition%' OR LOWER(name) LIKE '%educare%' OR LOWER(name) LIKE '%educare centre%' OR LOWER(name) LIKE '%educare center%' THEN 'education-learning'
    WHEN LOWER(name) LIKE '%taxi%' OR LOWER(name) LIKE '%uber%' OR LOWER(name) LIKE '%transport%' OR LOWER(name) LIKE '%travel%' OR LOWER(name) LIKE '%bus%' OR LOWER(name) LIKE '%car rental%' OR LOWER(name) LIKE '%bicycle rental%' OR LOWER(name) LIKE '%cycle%' THEN 'transport-travel'
    WHEN LOWER(name) LIKE '%bank%' OR LOWER(name) LIKE '%atm%' OR LOWER(name) LIKE '%finance%' OR LOWER(name) LIKE '%insurance%' OR LOWER(name) LIKE '%financial%' OR LOWER(name) LIKE '%credit union%' THEN 'finance-insurance'
    WHEN LOWER(name) LIKE '%plumber%' OR LOWER(name) LIKE '%plumbing%' THEN 'plumbers'
    WHEN LOWER(name) LIKE '%electrician%' OR LOWER(name) LIKE '%electrical%' OR LOWER(name) LIKE '%electric%' THEN 'electricians'
    WHEN LOWER(name) LIKE '%legal%' OR LOWER(name) LIKE '%lawyer%' OR LOWER(name) LIKE '%attorney%' OR LOWER(name) LIKE '%law firm%' OR LOWER(name) LIKE '%solicitor%' THEN 'legal-services'
    WHEN LOWER(name) LIKE '%handyman%' OR LOWER(name) LIKE '%handy man%' THEN 'handyman'
    WHEN LOWER(name) LIKE '%laundry%' OR LOWER(name) LIKE '%dry clean%' OR LOWER(name) LIKE '%dryclean%' THEN 'laundry'
    WHEN LOWER(name) LIKE '%pest control%' OR LOWER(name) LIKE '%pestcontrol%' OR LOWER(name) LIKE '%exterminator%' THEN 'pest-control'
    WHEN LOWER(name) LIKE '%workshop%' OR LOWER(name) LIKE '%repair%' THEN 'workshop'
    
    -- Outdoors & Adventure
    WHEN LOWER(name) LIKE '%hiking%' OR LOWER(name) LIKE '%hike%' OR LOWER(name) LIKE '%trail%' THEN 'hiking'
    WHEN LOWER(name) LIKE '%cycling%' OR LOWER(name) LIKE '%bike%' OR LOWER(name) LIKE '%bicycle%' OR LOWER(name) LIKE '%cycling club%' THEN 'cycling'
    WHEN LOWER(name) LIKE '%water sport%' OR LOWER(name) LIKE '%watersport%' OR LOWER(name) LIKE '%surfing%' OR LOWER(name) LIKE '%diving%' OR LOWER(name) LIKE '%swimming%' OR LOWER(name) LIKE '%kayak%' OR LOWER(name) LIKE '%paddle%' THEN 'water-sports'
    WHEN LOWER(name) LIKE '%camping%' OR LOWER(name) LIKE '%camp%' OR LOWER(name) LIKE '%outdoor%' THEN 'camping'
    WHEN LOWER(name) LIKE '%skydive%' OR LOWER(name) LIKE '%sky dive%' THEN 'skydiving'
    WHEN LOWER(name) LIKE '%tour guide%' OR LOWER(name) LIKE '%tourguide%' OR LOWER(name) LIKE '%tours%' OR LOWER(name) LIKE '%tour%' THEN 'tour-guide'
    
    -- Experiences & Entertainment
    WHEN LOWER(name) LIKE '%event%' OR LOWER(name) LIKE '%festival%' OR LOWER(name) LIKE '%party%' THEN 'events-festivals'
    WHEN LOWER(name) LIKE '%sport%' OR LOWER(name) LIKE '%recreation%' OR LOWER(name) LIKE '%stadium%' OR LOWER(name) LIKE '%arena%' THEN 'sports-recreation'
    WHEN LOWER(name) LIKE '%nightlife%' OR LOWER(name) LIKE '%night club%' OR LOWER(name) LIKE '%nightclub%' OR LOWER(name) LIKE '%club%' OR LOWER(name) LIKE '%disco%' THEN 'nightlife'
    WHEN LOWER(name) LIKE '%comedy%' OR LOWER(name) LIKE '%comic%' THEN 'comedy-clubs'
    WHEN LOWER(name) LIKE '%cinema%' OR LOWER(name) LIKE '%movie%' OR LOWER(name) LIKE '%theater%' OR LOWER(name) LIKE '%theatre%' OR LOWER(name) LIKE '%film%' THEN 'cinemas'
    
    -- Arts & Culture
    WHEN LOWER(name) LIKE '%museum%' OR LOWER(name) LIKE '%gallery%' OR LOWER(name) LIKE '%art gallery%' THEN 'museums'
    WHEN LOWER(name) LIKE '%gallery%' OR LOWER(name) LIKE '%art%' OR LOWER(name) LIKE '%exhibition%' THEN 'galleries'
    WHEN LOWER(name) LIKE '%theater%' OR LOWER(name) LIKE '%theatre%' OR LOWER(name) LIKE '%playhouse%' OR LOWER(name) LIKE '%drama%' OR LOWER(name) LIKE '%amphitheatre%' THEN 'theaters'
    WHEN LOWER(name) LIKE '%concert%' OR LOWER(name) LIKE '%music%' OR LOWER(name) LIKE '%orchestra%' OR LOWER(name) LIKE '%symphony%' THEN 'concerts'
    
    -- Family & Pets
    WHEN LOWER(name) LIKE '%family%' OR LOWER(name) LIKE '%kids%' OR LOWER(name) LIKE '%children%' OR LOWER(name) LIKE '%playground%' OR LOWER(name) LIKE '%play center%' OR LOWER(name) LIKE '%play centre%' OR LOWER(name) LIKE '%toddler%' OR LOWER(name) LIKE '%homestead%' THEN 'family-activities'
    WHEN LOWER(name) LIKE '%pet%' OR LOWER(name) LIKE '%dog%' OR LOWER(name) LIKE '%cat%' OR LOWER(name) LIKE '%animal%' OR LOWER(name) LIKE '%pet shop%' OR LOWER(name) LIKE '%petshop%' THEN 'pet-services'
    WHEN LOWER(name) LIKE '%childcare%' OR LOWER(name) LIKE '%child care%' OR LOWER(name) LIKE '%daycare%' OR LOWER(name) LIKE '%day care%' OR LOWER(name) LIKE '%nursery%' OR LOWER(name) LIKE '%babysit%' THEN 'childcare'
    WHEN LOWER(name) LIKE '%veterinarian%' OR LOWER(name) LIKE '%vet%' OR LOWER(name) LIKE '%veterinary%' OR LOWER(name) LIKE '%animal hospital%' THEN 'veterinarians'
    
    -- Shopping & Lifestyle
    WHEN LOWER(name) LIKE '%fashion%' OR LOWER(name) LIKE '%clothing%' OR LOWER(name) LIKE '%apparel%' OR LOWER(name) LIKE '%boutique%' OR LOWER(name) LIKE '%wardrobe%' OR LOWER(name) LIKE '%jewelry%' OR LOWER(name) LIKE '%jewellery%' THEN 'fashion'
    WHEN LOWER(name) LIKE '%electronic%' OR LOWER(name) LIKE '%tech%' OR LOWER(name) LIKE '%computer%' OR LOWER(name) LIKE '%phone%' OR LOWER(name) LIKE '%mobile%' THEN 'electronics'
    WHEN LOWER(name) LIKE '%home decor%' OR LOWER(name) LIKE '%homedecor%' OR LOWER(name) LIKE '%furniture%' OR LOWER(name) LIKE '%interior%' OR LOWER(name) LIKE '%home%' OR LOWER(name) LIKE '%decor%' THEN 'home-decor'
    WHEN LOWER(name) LIKE '%book%' OR LOWER(name) LIKE '%library%' OR LOWER(name) LIKE '%media%' OR LOWER(name) LIKE '%magazine%' THEN 'books'
    
    ELSE category -- Keep existing category if no match
  END,
  updated_at = NOW()
WHERE 
  -- Only update if we have a keyword match
  (
    LOWER(name) LIKE '%restaurant%' OR LOWER(name) LIKE '%resto%' OR LOWER(name) LIKE '%bistro%' OR LOWER(name) LIKE '%eatery%' OR
    LOWER(name) LIKE '%cafe%' OR LOWER(name) LIKE '%coffee%' OR LOWER(name) LIKE '%espresso%' OR LOWER(name) LIKE '%latte%' OR LOWER(name) LIKE '%cappuccino%' OR
    LOWER(name) LIKE '%bar%' OR LOWER(name) LIKE '%pub%' OR LOWER(name) LIKE '%tavern%' OR LOWER(name) LIKE '%cocktail%' OR LOWER(name) LIKE '%wine bar%' OR LOWER(name) LIKE '%brewery%' OR
    LOWER(name) LIKE '%fast food%' OR LOWER(name) LIKE '%fastfood%' OR LOWER(name) LIKE '%burger%' OR LOWER(name) LIKE '%pizza%' OR LOWER(name) LIKE '%takeaway%' OR LOWER(name) LIKE '%take-out%' OR
    LOWER(name) LIKE '%fine dining%' OR LOWER(name) LIKE '%gourmet%' OR LOWER(name) LIKE '%michelin%' OR
    LOWER(name) LIKE '%bakery%' OR LOWER(name) LIKE '%baker%' OR LOWER(name) LIKE '%patisserie%' OR
    LOWER(name) LIKE '%food truck%' OR LOWER(name) LIKE '%foodtruck%' OR
    LOWER(name) LIKE '%grocery%' OR LOWER(name) LIKE '%supermarket%' OR LOWER(name) LIKE '%market%' OR
    LOWER(name) LIKE '%gym%' OR LOWER(name) LIKE '%fitness%' OR LOWER(name) LIKE '%crossfit%' OR LOWER(name) LIKE '%training%' OR LOWER(name) LIKE '%workout%' OR
    LOWER(name) LIKE '%spa%' OR LOWER(name) LIKE '%massage%' OR LOWER(name) LIKE '%wellness center%' OR LOWER(name) LIKE '%wellness centre%' OR
    LOWER(name) LIKE '%salon%' OR LOWER(name) LIKE '%hairdresser%' OR LOWER(name) LIKE '%hair salon%' OR LOWER(name) LIKE '%haircut%' OR
    LOWER(name) LIKE '%wellness%' OR LOWER(name) LIKE '%health center%' OR LOWER(name) LIKE '%health centre%' OR
    LOWER(name) LIKE '%yoga%' OR LOWER(name) LIKE '%yogi%' OR
    LOWER(name) LIKE '%pilates%' OR
    LOWER(name) LIKE '%martial arts%' OR LOWER(name) LIKE '%karate%' OR LOWER(name) LIKE '%taekwondo%' OR LOWER(name) LIKE '%judo%' OR
    LOWER(name) LIKE '%barber%' OR LOWER(name) LIKE '%barbershop%' OR
    LOWER(name) LIKE '%nail%' OR LOWER(name) LIKE '%manicure%' OR LOWER(name) LIKE '%pedicure%' OR
    LOWER(name) LIKE '%primary%' OR LOWER(name) LIKE '%secondary%' OR LOWER(name) LIKE '%educational%' OR
    LOWER(name) LIKE '%school%' OR LOWER(name) LIKE '%skool%' OR LOWER(name) LIKE '%academy%' OR LOWER(name) LIKE '%college%' OR LOWER(name) LIKE '%university%' OR LOWER(name) LIKE '%institute%' OR LOWER(name) LIKE '%learning center%' OR LOWER(name) LIKE '%learning centre%' OR LOWER(name) LIKE '%tutoring%' OR LOWER(name) LIKE '%tuition%' OR LOWER(name) LIKE '%educare%' OR LOWER(name) LIKE '%educare centre%' OR LOWER(name) LIKE '%educare center%' OR
    LOWER(name) LIKE '%taxi%' OR LOWER(name) LIKE '%uber%' OR LOWER(name) LIKE '%transport%' OR LOWER(name) LIKE '%travel%' OR LOWER(name) LIKE '%bus%' OR LOWER(name) LIKE '%car rental%' OR LOWER(name) LIKE '%bicycle rental%' OR LOWER(name) LIKE '%cycle%' OR
    LOWER(name) LIKE '%bank%' OR LOWER(name) LIKE '%atm%' OR LOWER(name) LIKE '%finance%' OR LOWER(name) LIKE '%insurance%' OR LOWER(name) LIKE '%financial%' OR LOWER(name) LIKE '%credit union%' OR
    LOWER(name) LIKE '%plumber%' OR LOWER(name) LIKE '%plumbing%' OR
    LOWER(name) LIKE '%electrician%' OR LOWER(name) LIKE '%electrical%' OR LOWER(name) LIKE '%electric%' OR
    LOWER(name) LIKE '%legal%' OR LOWER(name) LIKE '%lawyer%' OR LOWER(name) LIKE '%attorney%' OR LOWER(name) LIKE '%law firm%' OR LOWER(name) LIKE '%solicitor%' OR
    LOWER(name) LIKE '%handyman%' OR LOWER(name) LIKE '%handy man%' OR
    LOWER(name) LIKE '%laundry%' OR LOWER(name) LIKE '%dry clean%' OR LOWER(name) LIKE '%dryclean%' OR
    LOWER(name) LIKE '%pest control%' OR LOWER(name) LIKE '%pestcontrol%' OR LOWER(name) LIKE '%exterminator%' OR
    LOWER(name) LIKE '%workshop%' OR LOWER(name) LIKE '%repair%' OR
    LOWER(name) LIKE '%hiking%' OR LOWER(name) LIKE '%hike%' OR LOWER(name) LIKE '%trail%' OR
    LOWER(name) LIKE '%cycling%' OR LOWER(name) LIKE '%bike%' OR LOWER(name) LIKE '%bicycle%' OR LOWER(name) LIKE '%cycling club%' OR
    LOWER(name) LIKE '%water sport%' OR LOWER(name) LIKE '%watersport%' OR LOWER(name) LIKE '%surfing%' OR LOWER(name) LIKE '%diving%' OR LOWER(name) LIKE '%swimming%' OR LOWER(name) LIKE '%kayak%' OR LOWER(name) LIKE '%paddle%' OR
    LOWER(name) LIKE '%camping%' OR LOWER(name) LIKE '%camp%' OR LOWER(name) LIKE '%outdoor%' OR
    LOWER(name) LIKE '%skydive%' OR LOWER(name) LIKE '%sky dive%' OR
    LOWER(name) LIKE '%tour guide%' OR LOWER(name) LIKE '%tourguide%' OR LOWER(name) LIKE '%tours%' OR LOWER(name) LIKE '%tour%' OR
    LOWER(name) LIKE '%event%' OR LOWER(name) LIKE '%festival%' OR LOWER(name) LIKE '%party%' OR
    LOWER(name) LIKE '%sport%' OR LOWER(name) LIKE '%recreation%' OR LOWER(name) LIKE '%stadium%' OR LOWER(name) LIKE '%arena%' OR
    LOWER(name) LIKE '%nightlife%' OR LOWER(name) LIKE '%night club%' OR LOWER(name) LIKE '%nightclub%' OR LOWER(name) LIKE '%club%' OR LOWER(name) LIKE '%disco%' OR
    LOWER(name) LIKE '%comedy%' OR LOWER(name) LIKE '%comic%' OR
    LOWER(name) LIKE '%cinema%' OR LOWER(name) LIKE '%movie%' OR LOWER(name) LIKE '%theater%' OR LOWER(name) LIKE '%theatre%' OR LOWER(name) LIKE '%film%' OR
    LOWER(name) LIKE '%museum%' OR LOWER(name) LIKE '%gallery%' OR LOWER(name) LIKE '%art gallery%' OR
    LOWER(name) LIKE '%art%' OR LOWER(name) LIKE '%exhibition%' OR
    LOWER(name) LIKE '%playhouse%' OR LOWER(name) LIKE '%drama%' OR
    LOWER(name) LIKE '%concert%' OR LOWER(name) LIKE '%music%' OR LOWER(name) LIKE '%orchestra%' OR LOWER(name) LIKE '%symphony%' OR
    LOWER(name) LIKE '%family%' OR LOWER(name) LIKE '%kids%' OR LOWER(name) LIKE '%children%' OR LOWER(name) LIKE '%playground%' OR LOWER(name) LIKE '%play center%' OR LOWER(name) LIKE '%play centre%' OR LOWER(name) LIKE '%toddler%' OR LOWER(name) LIKE '%homestead%' OR
    LOWER(name) LIKE '%pet%' OR LOWER(name) LIKE '%dog%' OR LOWER(name) LIKE '%cat%' OR LOWER(name) LIKE '%animal%' OR LOWER(name) LIKE '%pet shop%' OR LOWER(name) LIKE '%petshop%' OR
    LOWER(name) LIKE '%childcare%' OR LOWER(name) LIKE '%child care%' OR LOWER(name) LIKE '%daycare%' OR LOWER(name) LIKE '%day care%' OR LOWER(name) LIKE '%nursery%' OR LOWER(name) LIKE '%babysit%' OR
    LOWER(name) LIKE '%veterinarian%' OR LOWER(name) LIKE '%vet%' OR LOWER(name) LIKE '%veterinary%' OR LOWER(name) LIKE '%animal hospital%' OR
    LOWER(name) LIKE '%fashion%' OR LOWER(name) LIKE '%clothing%' OR LOWER(name) LIKE '%apparel%' OR LOWER(name) LIKE '%boutique%' OR LOWER(name) LIKE '%wardrobe%' OR LOWER(name) LIKE '%jewelry%' OR LOWER(name) LIKE '%jewellery%' OR
    LOWER(name) LIKE '%electronic%' OR LOWER(name) LIKE '%tech%' OR LOWER(name) LIKE '%computer%' OR LOWER(name) LIKE '%phone%' OR LOWER(name) LIKE '%mobile%' OR
    LOWER(name) LIKE '%home decor%' OR LOWER(name) LIKE '%homedecor%' OR LOWER(name) LIKE '%furniture%' OR LOWER(name) LIKE '%interior%' OR LOWER(name) LIKE '%home%' OR LOWER(name) LIKE '%decor%' OR
    LOWER(name) LIKE '%book%' OR LOWER(name) LIKE '%library%' OR LOWER(name) LIKE '%media%' OR LOWER(name) LIKE '%magazine%'
  );
