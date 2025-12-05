-- ============================================
-- UPDATE Businesses by Keywords in Names
-- ============================================
-- This query UPDATES businesses based on keywords found in their NAMES
-- Maps keywords to their corresponding categories/interests
-- Prioritizes education keywords to avoid misclassifying schools
-- ============================================

UPDATE businesses
SET 
  category = CASE
    -- Food & Drink
    WHEN LOWER(name) LIKE '%restaurant%' OR LOWER(name) LIKE '%resto%' OR LOWER(name) LIKE '%bistro%' OR LOWER(name) LIKE '%eatery%' OR LOWER(name) LIKE '%dining%' THEN 'restaurants'
    WHEN LOWER(name) LIKE '%cafe%' OR LOWER(name) LIKE '%coffee%' OR LOWER(name) LIKE '%espresso%' OR LOWER(name) LIKE '%latte%' OR LOWER(name) LIKE '%cappuccino%' OR LOWER(name) LIKE '%coffee shop%' THEN 'cafes'
    WHEN LOWER(name) LIKE '%bar%' OR LOWER(name) LIKE '%pub%' OR LOWER(name) LIKE '%tavern%' OR LOWER(name) LIKE '%cocktail%' OR LOWER(name) LIKE '%wine bar%' OR LOWER(name) LIKE '%brewery%' OR LOWER(name) LIKE '%drinks%' THEN 'bars'
    WHEN LOWER(name) LIKE '%fast food%' OR LOWER(name) LIKE '%fastfood%' OR LOWER(name) LIKE '%burger%' OR LOWER(name) LIKE '%pizza%' OR LOWER(name) LIKE '%takeaway%' OR LOWER(name) LIKE '%take-out%' OR LOWER(name) LIKE '%take away%' THEN 'fast-food'
    WHEN LOWER(name) LIKE '%fine dining%' OR LOWER(name) LIKE '%gourmet%' OR LOWER(name) LIKE '%michelin%' OR LOWER(name) LIKE '%upscale%' THEN 'fine-dining'
    WHEN LOWER(name) LIKE '%bakery%' OR LOWER(name) LIKE '%baker%' OR LOWER(name) LIKE '%patisserie%' OR LOWER(name) LIKE '%bread%' OR LOWER(name) LIKE '%pastry%' THEN 'bakery'
    WHEN LOWER(name) LIKE '%food truck%' OR LOWER(name) LIKE '%foodtruck%' OR LOWER(name) LIKE '%mobile food%' THEN 'food-truck'
    WHEN LOWER(name) LIKE '%grocery%' OR LOWER(name) LIKE '%supermarket%' OR LOWER(name) LIKE '%market%' OR LOWER(name) LIKE '%grocery store%' THEN 'grocery'
    
    -- Beauty & Wellness
    WHEN LOWER(name) LIKE '%gym%' OR LOWER(name) LIKE '%fitness%' OR LOWER(name) LIKE '%crossfit%' OR LOWER(name) LIKE '%training%' OR LOWER(name) LIKE '%workout%' OR LOWER(name) LIKE '%exercise%' OR LOWER(name) LIKE '%fitness center%' THEN 'gyms'
    WHEN LOWER(name) LIKE '%spa%' OR LOWER(name) LIKE '%massage%' OR LOWER(name) LIKE '%wellness center%' OR LOWER(name) LIKE '%wellness centre%' OR LOWER(name) LIKE '%relaxation%' OR LOWER(name) LIKE '%therapy%' THEN 'spas'
    WHEN LOWER(name) LIKE '%salon%' OR LOWER(name) LIKE '%hairdresser%' OR LOWER(name) LIKE '%hair salon%' OR LOWER(name) LIKE '%haircut%' OR LOWER(name) LIKE '%hair styling%' OR LOWER(name) LIKE '%hair cut%' THEN 'salons'
    WHEN LOWER(name) LIKE '%wellness%' OR LOWER(name) LIKE '%health center%' OR LOWER(name) LIKE '%health centre%' OR LOWER(name) LIKE '%health and wellness%' THEN 'wellness'
    WHEN LOWER(name) LIKE '%yoga%' OR LOWER(name) LIKE '%yogi%' OR LOWER(name) LIKE '%yoga class%' THEN 'yoga'
    WHEN LOWER(name) LIKE '%pilates%' OR LOWER(name) LIKE '%pilates class%' THEN 'pilates'
    WHEN LOWER(name) LIKE '%martial arts%' OR LOWER(name) LIKE '%karate%' OR LOWER(name) LIKE '%taekwondo%' OR LOWER(name) LIKE '%judo%' OR LOWER(name) LIKE '%martial art%' THEN 'martial-arts'
    WHEN LOWER(name) LIKE '%barber%' OR LOWER(name) LIKE '%barbershop%' OR LOWER(name) LIKE '%men%27s haircut%' OR LOWER(name) LIKE '%mens haircut%' THEN 'barber'
    WHEN LOWER(name) LIKE '%nail%' OR LOWER(name) LIKE '%manicure%' OR LOWER(name) LIKE '%pedicure%' OR LOWER(name) LIKE '%nail salon%' THEN 'nail-salons'
    
    -- Professional Services
    -- Education keywords MUST come before transport to avoid misclassifying schools
    -- If name has "primary", "secondary", or "educational" it's a school
    WHEN LOWER(name) LIKE '%primary%' OR LOWER(name) LIKE '%secondary%' OR LOWER(name) LIKE '%educational%' THEN 'education-learning'
    WHEN LOWER(name) LIKE '%school%' OR LOWER(name) LIKE '%skool%' OR LOWER(name) LIKE '%academy%' OR LOWER(name) LIKE '%college%' OR LOWER(name) LIKE '%university%' OR LOWER(name) LIKE '%institute%' OR LOWER(name) LIKE '%learning center%' OR LOWER(name) LIKE '%learning centre%' OR LOWER(name) LIKE '%tutoring%' OR LOWER(name) LIKE '%tuition%' OR LOWER(name) LIKE '%educare%' OR LOWER(name) LIKE '%educare centre%' OR LOWER(name) LIKE '%educare center%' OR LOWER(name) LIKE '%primary school%' OR LOWER(name) LIKE '%secondary school%' OR LOWER(name) LIKE '%high school%' OR LOWER(name) LIKE '%elementary%' OR LOWER(name) LIKE '%pre-school%' OR LOWER(name) LIKE '%preschool%' THEN 'education-learning'
    WHEN LOWER(name) LIKE '%taxi%' OR LOWER(name) LIKE '%uber%' OR (LOWER(name) LIKE '%transport%' AND LOWER(name) NOT LIKE '%school%' AND LOWER(name) NOT LIKE '%education%') OR (LOWER(name) LIKE '%travel%' AND LOWER(name) NOT LIKE '%school%' AND LOWER(name) NOT LIKE '%education%') OR LOWER(name) LIKE '%bus company%' OR LOWER(name) LIKE '%car rental%' OR LOWER(name) LIKE '%bicycle rental%' OR (LOWER(name) LIKE '%cycle%' AND LOWER(name) NOT LIKE '%school%' AND LOWER(name) NOT LIKE '%education%') OR LOWER(name) LIKE '%ride share%' OR LOWER(name) LIKE '%rideshare%' THEN 'transport-travel'
    WHEN LOWER(name) LIKE '%bank%' OR LOWER(name) LIKE '%atm%' OR LOWER(name) LIKE '%finance%' OR LOWER(name) LIKE '%insurance%' OR LOWER(name) LIKE '%financial%' OR LOWER(name) LIKE '%credit union%' OR LOWER(name) LIKE '%banking%' OR LOWER(name) LIKE '%loan%' THEN 'finance-insurance'
    WHEN LOWER(name) LIKE '%plumber%' OR LOWER(name) LIKE '%plumbing%' OR LOWER(name) LIKE '%pipe%' OR LOWER(name) LIKE '%drain%' THEN 'plumbers'
    WHEN LOWER(name) LIKE '%electrician%' OR LOWER(name) LIKE '%electrical%' OR LOWER(name) LIKE '%electric%' OR LOWER(name) LIKE '%wiring%' THEN 'electricians'
    WHEN LOWER(name) LIKE '%legal%' OR LOWER(name) LIKE '%lawyer%' OR LOWER(name) LIKE '%attorney%' OR LOWER(name) LIKE '%law firm%' OR LOWER(name) LIKE '%solicitor%' OR LOWER(name) LIKE '%legal services%' THEN 'legal-services'
    WHEN LOWER(name) LIKE '%handyman%' OR LOWER(name) LIKE '%handy man%' OR LOWER(name) LIKE '%maintenance%' OR LOWER(name) LIKE '%repair service%' THEN 'handyman'
    WHEN LOWER(name) LIKE '%laundry%' OR LOWER(name) LIKE '%dry clean%' OR LOWER(name) LIKE '%dryclean%' OR LOWER(name) LIKE '%dry cleaning%' OR LOWER(name) LIKE '%washing%' THEN 'laundry'
    WHEN LOWER(name) LIKE '%pest control%' OR LOWER(name) LIKE '%pestcontrol%' OR LOWER(name) LIKE '%exterminator%' OR LOWER(name) LIKE '%pest management%' THEN 'pest-control'
    WHEN LOWER(name) LIKE '%workshop%' OR LOWER(name) LIKE '%repair%' OR LOWER(name) LIKE '%auto repair%' OR LOWER(name) LIKE '%car repair%' THEN 'workshop'
    
    -- Outdoors & Adventure
    WHEN LOWER(name) LIKE '%hiking%' OR LOWER(name) LIKE '%hike%' OR LOWER(name) LIKE '%trail%' OR LOWER(name) LIKE '%mountain%' THEN 'hiking'
    WHEN LOWER(name) LIKE '%cycling%' OR LOWER(name) LIKE '%bike%' OR LOWER(name) LIKE '%bicycle%' OR LOWER(name) LIKE '%cycling club%' OR LOWER(name) LIKE '%bike shop%' THEN 'cycling'
    WHEN LOWER(name) LIKE '%water sport%' OR LOWER(name) LIKE '%watersport%' OR LOWER(name) LIKE '%surfing%' OR LOWER(name) LIKE '%diving%' OR LOWER(name) LIKE '%swimming%' OR LOWER(name) LIKE '%kayak%' OR LOWER(name) LIKE '%paddle%' OR LOWER(name) LIKE '%water sports%' THEN 'water-sports'
    WHEN LOWER(name) LIKE '%camping%' OR LOWER(name) LIKE '%camp%' OR LOWER(name) LIKE '%outdoor%' OR LOWER(name) LIKE '%outdoor activity%' THEN 'camping'
    WHEN LOWER(name) LIKE '%skydive%' OR LOWER(name) LIKE '%sky dive%' OR LOWER(name) LIKE '%parachute%' THEN 'skydiving'
    WHEN LOWER(name) LIKE '%tour guide%' OR LOWER(name) LIKE '%tourguide%' OR LOWER(name) LIKE '%tours%' OR LOWER(name) LIKE '%tour%' OR LOWER(name) LIKE '%guided tour%' OR LOWER(name) LIKE '%sightseeing%' THEN 'tour-guide'
    
    -- Experiences & Entertainment
    WHEN LOWER(name) LIKE '%event%' OR LOWER(name) LIKE '%festival%' OR LOWER(name) LIKE '%party%' OR LOWER(name) LIKE '%celebration%' OR LOWER(name) LIKE '%venue%' THEN 'events-festivals'
    WHEN LOWER(name) LIKE '%sport%' OR LOWER(name) LIKE '%recreation%' OR LOWER(name) LIKE '%stadium%' OR LOWER(name) LIKE '%arena%' OR LOWER(name) LIKE '%sports%' OR LOWER(name) LIKE '%athletic%' THEN 'sports-recreation'
    WHEN LOWER(name) LIKE '%nightlife%' OR LOWER(name) LIKE '%night club%' OR LOWER(name) LIKE '%nightclub%' OR LOWER(name) LIKE '%club%' OR LOWER(name) LIKE '%disco%' OR LOWER(name) LIKE '%dance%' OR LOWER(name) LIKE '%dancing%' THEN 'nightlife'
    WHEN LOWER(name) LIKE '%comedy%' OR LOWER(name) LIKE '%comic%' OR LOWER(name) LIKE '%stand-up%' OR LOWER(name) LIKE '%standup%' THEN 'comedy-clubs'
    WHEN LOWER(name) LIKE '%cinema%' OR LOWER(name) LIKE '%movie%' OR LOWER(name) LIKE '%theater%' OR LOWER(name) LIKE '%theatre%' OR LOWER(name) LIKE '%film%' OR LOWER(name) LIKE '%movies%' OR LOWER(name) LIKE '%cinema%' THEN 'cinemas'
    
    -- Arts & Culture
    WHEN LOWER(name) LIKE '%museum%' OR LOWER(name) LIKE '%gallery%' OR LOWER(name) LIKE '%art gallery%' OR LOWER(name) LIKE '%exhibition%' OR LOWER(name) LIKE '%art museum%' THEN 'museums'
    WHEN LOWER(name) LIKE '%gallery%' OR LOWER(name) LIKE '%art%' OR LOWER(name) LIKE '%exhibition%' OR LOWER(name) LIKE '%artwork%' OR LOWER(name) LIKE '%painting%' THEN 'galleries'
    WHEN LOWER(name) LIKE '%theater%' OR LOWER(name) LIKE '%theatre%' OR LOWER(name) LIKE '%playhouse%' OR LOWER(name) LIKE '%drama%' OR LOWER(name) LIKE '%amphitheatre%' OR LOWER(name) LIKE '%play%' OR LOWER(name) LIKE '%performance%' THEN 'theaters'
    WHEN LOWER(name) LIKE '%concert%' OR LOWER(name) LIKE '%music%' OR LOWER(name) LIKE '%orchestra%' OR LOWER(name) LIKE '%symphony%' OR LOWER(name) LIKE '%live music%' OR LOWER(name) LIKE '%musical%' THEN 'concerts'
    
    -- Family & Pets
    WHEN LOWER(name) LIKE '%family%' OR LOWER(name) LIKE '%kids%' OR LOWER(name) LIKE '%children%' OR LOWER(name) LIKE '%playground%' OR LOWER(name) LIKE '%play center%' OR LOWER(name) LIKE '%play centre%' OR LOWER(name) LIKE '%toddler%' OR LOWER(name) LIKE '%homestead%' OR LOWER(name) LIKE '%family friendly%' THEN 'family-activities'
    WHEN LOWER(name) LIKE '%pet%' OR LOWER(name) LIKE '%dog%' OR LOWER(name) LIKE '%cat%' OR LOWER(name) LIKE '%animal%' OR LOWER(name) LIKE '%pet shop%' OR LOWER(name) LIKE '%petshop%' OR LOWER(name) LIKE '%pet store%' THEN 'pet-services'
    WHEN LOWER(name) LIKE '%childcare%' OR LOWER(name) LIKE '%child care%' OR LOWER(name) LIKE '%daycare%' OR LOWER(name) LIKE '%day care%' OR LOWER(name) LIKE '%nursery%' OR LOWER(name) LIKE '%babysit%' OR LOWER(name) LIKE '%babysitting%' THEN 'childcare'
    WHEN LOWER(name) LIKE '%veterinarian%' OR LOWER(name) LIKE '%vet%' OR LOWER(name) LIKE '%veterinary%' OR LOWER(name) LIKE '%animal hospital%' OR LOWER(name) LIKE '%animal care%' THEN 'veterinarians'
    
    -- Shopping & Lifestyle
    WHEN LOWER(name) LIKE '%fashion%' OR LOWER(name) LIKE '%clothing%' OR LOWER(name) LIKE '%apparel%' OR LOWER(name) LIKE '%boutique%' OR LOWER(name) LIKE '%wardrobe%' OR LOWER(name) LIKE '%jewelry%' OR LOWER(name) LIKE '%jewellery%' OR LOWER(name) LIKE '%accessories%' OR LOWER(name) LIKE '%fashion store%' THEN 'fashion'
    WHEN LOWER(name) LIKE '%electronic%' OR LOWER(name) LIKE '%tech%' OR LOWER(name) LIKE '%computer%' OR LOWER(name) LIKE '%phone%' OR LOWER(name) LIKE '%mobile%' OR LOWER(name) LIKE '%technology%' OR LOWER(name) LIKE '%electronics store%' THEN 'electronics'
    WHEN LOWER(name) LIKE '%home decor%' OR LOWER(name) LIKE '%homedecor%' OR LOWER(name) LIKE '%furniture%' OR LOWER(name) LIKE '%interior%' OR LOWER(name) LIKE '%home%' OR LOWER(name) LIKE '%decor%' OR LOWER(name) LIKE '%home furnishings%' THEN 'home-decor'
    WHEN LOWER(name) LIKE '%book%' OR LOWER(name) LIKE '%library%' OR LOWER(name) LIKE '%media%' OR LOWER(name) LIKE '%magazine%' OR LOWER(name) LIKE '%bookstore%' OR LOWER(name) LIKE '%books%' THEN 'books'
    
    ELSE category -- Keep existing category if no match
  END,
  updated_at = NOW()
WHERE 
  name IS NOT NULL 
  AND name != ''
  AND (
    -- Only update if we have a keyword match in name
    LOWER(name) LIKE '%restaurant%' OR LOWER(description) LIKE '%resto%' OR LOWER(description) LIKE '%bistro%' OR LOWER(description) LIKE '%eatery%' OR LOWER(description) LIKE '%dining%' OR
    LOWER(name) LIKE '%cafe%' OR LOWER(description) LIKE '%coffee%' OR LOWER(description) LIKE '%espresso%' OR LOWER(description) LIKE '%latte%' OR LOWER(description) LIKE '%cappuccino%' OR LOWER(description) LIKE '%coffee shop%' OR
    LOWER(name) LIKE '%bar%' OR LOWER(description) LIKE '%pub%' OR LOWER(description) LIKE '%tavern%' OR LOWER(description) LIKE '%cocktail%' OR LOWER(description) LIKE '%wine bar%' OR LOWER(description) LIKE '%brewery%' OR LOWER(description) LIKE '%drinks%' OR
    LOWER(name) LIKE '%fast food%' OR LOWER(description) LIKE '%fastfood%' OR LOWER(description) LIKE '%burger%' OR LOWER(description) LIKE '%pizza%' OR LOWER(description) LIKE '%takeaway%' OR LOWER(description) LIKE '%take-out%' OR LOWER(description) LIKE '%take away%' OR
    LOWER(name) LIKE '%fine dining%' OR LOWER(description) LIKE '%gourmet%' OR LOWER(description) LIKE '%michelin%' OR LOWER(description) LIKE '%upscale%' OR
    LOWER(name) LIKE '%bakery%' OR LOWER(description) LIKE '%baker%' OR LOWER(description) LIKE '%patisserie%' OR LOWER(description) LIKE '%bread%' OR LOWER(description) LIKE '%pastry%' OR
    LOWER(name) LIKE '%food truck%' OR LOWER(description) LIKE '%foodtruck%' OR LOWER(description) LIKE '%mobile food%' OR
    LOWER(name) LIKE '%grocery%' OR LOWER(description) LIKE '%supermarket%' OR LOWER(description) LIKE '%market%' OR LOWER(description) LIKE '%grocery store%' OR
    LOWER(name) LIKE '%gym%' OR LOWER(description) LIKE '%fitness%' OR LOWER(description) LIKE '%crossfit%' OR LOWER(description) LIKE '%training%' OR LOWER(description) LIKE '%workout%' OR LOWER(description) LIKE '%exercise%' OR LOWER(description) LIKE '%fitness center%' OR
    LOWER(name) LIKE '%spa%' OR LOWER(description) LIKE '%massage%' OR LOWER(description) LIKE '%wellness center%' OR LOWER(description) LIKE '%wellness centre%' OR LOWER(description) LIKE '%relaxation%' OR LOWER(description) LIKE '%therapy%' OR
    LOWER(name) LIKE '%salon%' OR LOWER(description) LIKE '%hairdresser%' OR LOWER(description) LIKE '%hair salon%' OR LOWER(description) LIKE '%haircut%' OR LOWER(description) LIKE '%hair styling%' OR LOWER(description) LIKE '%hair cut%' OR
    LOWER(name) LIKE '%wellness%' OR LOWER(description) LIKE '%health center%' OR LOWER(description) LIKE '%health centre%' OR LOWER(description) LIKE '%health and wellness%' OR
    LOWER(name) LIKE '%yoga%' OR LOWER(description) LIKE '%yogi%' OR LOWER(description) LIKE '%yoga class%' OR
    LOWER(name) LIKE '%pilates%' OR LOWER(description) LIKE '%pilates class%' OR
    LOWER(name) LIKE '%martial arts%' OR LOWER(description) LIKE '%karate%' OR LOWER(description) LIKE '%taekwondo%' OR LOWER(description) LIKE '%judo%' OR LOWER(description) LIKE '%martial art%' OR
    LOWER(name) LIKE '%barber%' OR LOWER(description) LIKE '%barbershop%' OR LOWER(description) LIKE '%men%27s haircut%' OR LOWER(description) LIKE '%mens haircut%' OR
    LOWER(name) LIKE '%nail%' OR LOWER(description) LIKE '%manicure%' OR LOWER(description) LIKE '%pedicure%' OR LOWER(description) LIKE '%nail salon%' OR
    LOWER(name) LIKE '%school%' OR LOWER(description) LIKE '%skool%' OR LOWER(description) LIKE '%academy%' OR LOWER(description) LIKE '%college%' OR LOWER(description) LIKE '%university%' OR LOWER(description) LIKE '%institute%' OR LOWER(description) LIKE '%learning center%' OR LOWER(description) LIKE '%learning centre%' OR LOWER(description) LIKE '%tutoring%' OR LOWER(description) LIKE '%tuition%' OR LOWER(description) LIKE '%educare%' OR LOWER(description) LIKE '%educare centre%' OR LOWER(description) LIKE '%educare center%' OR LOWER(description) LIKE '%education%' OR LOWER(description) LIKE '%teaching%' OR LOWER(description) LIKE '%primary school%' OR LOWER(description) LIKE '%secondary school%' OR
    LOWER(name) LIKE '%taxi%' OR LOWER(description) LIKE '%uber%' OR LOWER(description) LIKE '%transport%' OR LOWER(description) LIKE '%travel%' OR LOWER(description) LIKE '%bus%' OR LOWER(description) LIKE '%car rental%' OR LOWER(description) LIKE '%bicycle rental%' OR LOWER(description) LIKE '%cycle%' OR LOWER(description) LIKE '%transportation%' OR LOWER(description) LIKE '%ride%' OR
    LOWER(name) LIKE '%bank%' OR LOWER(description) LIKE '%atm%' OR LOWER(description) LIKE '%finance%' OR LOWER(description) LIKE '%insurance%' OR LOWER(description) LIKE '%financial%' OR LOWER(description) LIKE '%credit union%' OR LOWER(description) LIKE '%banking%' OR LOWER(description) LIKE '%loan%' OR
    LOWER(name) LIKE '%plumber%' OR LOWER(description) LIKE '%plumbing%' OR LOWER(description) LIKE '%pipe%' OR LOWER(description) LIKE '%drain%' OR
    LOWER(name) LIKE '%electrician%' OR LOWER(description) LIKE '%electrical%' OR LOWER(description) LIKE '%electric%' OR LOWER(description) LIKE '%wiring%' OR
    LOWER(name) LIKE '%legal%' OR LOWER(description) LIKE '%lawyer%' OR LOWER(description) LIKE '%attorney%' OR LOWER(description) LIKE '%law firm%' OR LOWER(description) LIKE '%solicitor%' OR LOWER(description) LIKE '%legal services%' OR
    LOWER(name) LIKE '%handyman%' OR LOWER(description) LIKE '%handy man%' OR LOWER(description) LIKE '%maintenance%' OR LOWER(description) LIKE '%repair service%' OR
    LOWER(name) LIKE '%laundry%' OR LOWER(description) LIKE '%dry clean%' OR LOWER(description) LIKE '%dryclean%' OR LOWER(description) LIKE '%dry cleaning%' OR LOWER(description) LIKE '%washing%' OR
    LOWER(name) LIKE '%pest control%' OR LOWER(description) LIKE '%pestcontrol%' OR LOWER(description) LIKE '%exterminator%' OR LOWER(description) LIKE '%pest management%' OR
    LOWER(name) LIKE '%workshop%' OR LOWER(description) LIKE '%repair%' OR LOWER(description) LIKE '%auto repair%' OR LOWER(description) LIKE '%car repair%' OR
    LOWER(name) LIKE '%hiking%' OR LOWER(description) LIKE '%hike%' OR LOWER(description) LIKE '%trail%' OR LOWER(description) LIKE '%mountain%' OR
    LOWER(name) LIKE '%cycling%' OR LOWER(description) LIKE '%bike%' OR LOWER(description) LIKE '%bicycle%' OR LOWER(description) LIKE '%cycling club%' OR LOWER(description) LIKE '%bike shop%' OR
    LOWER(name) LIKE '%water sport%' OR LOWER(description) LIKE '%watersport%' OR LOWER(description) LIKE '%surfing%' OR LOWER(description) LIKE '%diving%' OR LOWER(description) LIKE '%swimming%' OR LOWER(description) LIKE '%kayak%' OR LOWER(description) LIKE '%paddle%' OR LOWER(description) LIKE '%water sports%' OR
    LOWER(name) LIKE '%camping%' OR LOWER(description) LIKE '%camp%' OR LOWER(description) LIKE '%outdoor%' OR LOWER(description) LIKE '%outdoor activity%' OR
    LOWER(name) LIKE '%skydive%' OR LOWER(description) LIKE '%sky dive%' OR LOWER(description) LIKE '%parachute%' OR
    LOWER(name) LIKE '%tour guide%' OR LOWER(description) LIKE '%tourguide%' OR LOWER(description) LIKE '%tours%' OR LOWER(description) LIKE '%tour%' OR LOWER(description) LIKE '%guided tour%' OR LOWER(description) LIKE '%sightseeing%' OR
    LOWER(name) LIKE '%event%' OR LOWER(description) LIKE '%festival%' OR LOWER(description) LIKE '%party%' OR LOWER(description) LIKE '%celebration%' OR LOWER(description) LIKE '%venue%' OR
    LOWER(name) LIKE '%sport%' OR LOWER(description) LIKE '%recreation%' OR LOWER(description) LIKE '%stadium%' OR LOWER(description) LIKE '%arena%' OR LOWER(description) LIKE '%sports%' OR LOWER(description) LIKE '%athletic%' OR
    LOWER(name) LIKE '%nightlife%' OR LOWER(description) LIKE '%night club%' OR LOWER(description) LIKE '%nightclub%' OR LOWER(description) LIKE '%club%' OR LOWER(description) LIKE '%disco%' OR LOWER(description) LIKE '%dance%' OR LOWER(description) LIKE '%dancing%' OR
    LOWER(name) LIKE '%comedy%' OR LOWER(description) LIKE '%comic%' OR LOWER(description) LIKE '%stand-up%' OR LOWER(description) LIKE '%standup%' OR
    LOWER(name) LIKE '%cinema%' OR LOWER(description) LIKE '%movie%' OR LOWER(description) LIKE '%theater%' OR LOWER(description) LIKE '%theatre%' OR LOWER(description) LIKE '%film%' OR LOWER(description) LIKE '%movies%' OR
    LOWER(name) LIKE '%museum%' OR LOWER(description) LIKE '%gallery%' OR LOWER(description) LIKE '%art gallery%' OR LOWER(description) LIKE '%exhibition%' OR LOWER(description) LIKE '%art museum%' OR
    LOWER(name) LIKE '%art%' OR LOWER(description) LIKE '%artwork%' OR LOWER(description) LIKE '%painting%' OR
    LOWER(name) LIKE '%playhouse%' OR LOWER(description) LIKE '%drama%' OR LOWER(description) LIKE '%play%' OR LOWER(description) LIKE '%performance%' OR
    LOWER(name) LIKE '%concert%' OR LOWER(description) LIKE '%music%' OR LOWER(description) LIKE '%orchestra%' OR LOWER(description) LIKE '%symphony%' OR LOWER(description) LIKE '%live music%' OR LOWER(description) LIKE '%musical%' OR
    LOWER(name) LIKE '%family%' OR LOWER(description) LIKE '%kids%' OR LOWER(description) LIKE '%children%' OR LOWER(description) LIKE '%playground%' OR LOWER(description) LIKE '%play center%' OR LOWER(description) LIKE '%play centre%' OR LOWER(description) LIKE '%toddler%' OR LOWER(description) LIKE '%homestead%' OR LOWER(description) LIKE '%family friendly%' OR
    LOWER(name) LIKE '%pet%' OR LOWER(description) LIKE '%dog%' OR LOWER(description) LIKE '%cat%' OR LOWER(description) LIKE '%animal%' OR LOWER(description) LIKE '%pet shop%' OR LOWER(description) LIKE '%petshop%' OR LOWER(description) LIKE '%pet store%' OR
    LOWER(name) LIKE '%childcare%' OR LOWER(description) LIKE '%child care%' OR LOWER(description) LIKE '%daycare%' OR LOWER(description) LIKE '%day care%' OR LOWER(description) LIKE '%nursery%' OR LOWER(description) LIKE '%babysit%' OR LOWER(description) LIKE '%babysitting%' OR
    LOWER(name) LIKE '%veterinarian%' OR LOWER(description) LIKE '%vet%' OR LOWER(description) LIKE '%veterinary%' OR LOWER(description) LIKE '%animal hospital%' OR LOWER(description) LIKE '%animal care%' OR
    LOWER(name) LIKE '%fashion%' OR LOWER(description) LIKE '%clothing%' OR LOWER(description) LIKE '%apparel%' OR LOWER(description) LIKE '%boutique%' OR LOWER(description) LIKE '%wardrobe%' OR LOWER(description) LIKE '%jewelry%' OR LOWER(description) LIKE '%jewellery%' OR LOWER(description) LIKE '%accessories%' OR LOWER(description) LIKE '%fashion store%' OR
    LOWER(name) LIKE '%electronic%' OR LOWER(description) LIKE '%tech%' OR LOWER(description) LIKE '%computer%' OR LOWER(description) LIKE '%phone%' OR LOWER(description) LIKE '%mobile%' OR LOWER(description) LIKE '%technology%' OR LOWER(description) LIKE '%electronics store%' OR
    LOWER(name) LIKE '%home decor%' OR LOWER(description) LIKE '%homedecor%' OR LOWER(description) LIKE '%furniture%' OR LOWER(description) LIKE '%interior%' OR LOWER(description) LIKE '%home%' OR LOWER(description) LIKE '%decor%' OR LOWER(description) LIKE '%home furnishings%' OR
    LOWER(name) LIKE '%book%' OR LOWER(description) LIKE '%library%' OR LOWER(description) LIKE '%media%' OR LOWER(description) LIKE '%magazine%' OR LOWER(description) LIKE '%bookstore%' OR LOWER(description) LIKE '%books%'
  );

