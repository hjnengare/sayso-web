-- =============================================
-- UPDATE BADGES TO MATCH NEW SPEC (Badge names.pdf)
-- =============================================
-- This migration updates all badge names and descriptions
-- to match the latest Badge names.pdf specification

-- =============================================
-- A. CATEGORY EXPLORER BADGES
-- =============================================

-- Update "The Sampler" to "The Dabbler"
UPDATE public.badges SET
  name = 'The Dabbler',
  description = 'Review 1 business in at least 3 different categories'
WHERE id = 'explorer_sampler';

-- Update "The Explorer" to "Newbie Nomad"
UPDATE public.badges SET
  name = 'Newbie Nomad',
  description = 'Review 10 businesses across 5 categories'
WHERE id = 'explorer_explorer';

-- Update "Local Legend" to "Curiosity Captain"
UPDATE public.badges SET
  name = 'Curiosity Captain',
  description = 'Review 1 business in every category'
WHERE id = 'explorer_local_legend';

-- Update "World Wanderer" to "Variety Voyager"
UPDATE public.badges SET
  name = 'Variety Voyager',
  description = 'Review more than 1 business in every category'
WHERE id = 'explorer_world_wanderer';

-- Update "Full Spectrum" to "Full Circle"
UPDATE public.badges SET
  name = 'Full Circle',
  description = 'Review 50+ businesses across 8+ categories'
WHERE id = 'explorer_full_spectrum';

-- =============================================
-- B. FOOD & DRINK SPECIALIST
-- =============================================

-- "Taste Taster" → "Taste Tester"
UPDATE public.badges SET
  name = 'Taste Tester',
  description = '3 Food & Drink reviews'
WHERE id = 'food_taste_taster';

-- "Foodie Finder" → "Flavour Finder"
UPDATE public.badges SET
  name = 'Flavour Finder',
  description = '10 Food & Drink reviews'
WHERE id = 'food_foodie_finder';

-- "Foodie Boss" stays the same but ensure correct capitalization
UPDATE public.badges SET
  name = 'Foodie Boss',
  description = '25 Food & Drink reviews'
WHERE id = 'food_foodie_boss';

-- "Coffee Lover" → "Coffee Connoisseur"
UPDATE public.badges SET
  name = 'Coffee Connoisseur',
  description = '5 cafe reviews'
WHERE id = 'food_coffee_lover';

-- "Sweet Tooth Scout" → "Dessert Detective"
UPDATE public.badges SET
  name = 'Dessert Detective',
  description = '5 dessert reviews'
WHERE id = 'food_sweet_tooth';

-- "Brunch Enthusiast" stays the same
UPDATE public.badges SET
  name = 'Brunch Enthusiast',
  description = '5 brunch spots'
WHERE id = 'food_brunch_enthusiast';

-- =============================================
-- B. BEAUTY & WELLNESS SPECIALIST
-- =============================================

-- "Glow Seeker" → "Glow Getter"
UPDATE public.badges SET
  name = 'Glow Getter',
  description = '3 Beauty & Wellness reviews'
WHERE id = 'beauty_glow_seeker';

-- "Beauty Explorer" → "Selfcare Superstar"
UPDATE public.badges SET
  name = 'Selfcare Superstar',
  description = '10 Beauty & Wellness reviews'
WHERE id = 'beauty_beauty_explorer';

-- "Style Star" → "Beauty Boss"
UPDATE public.badges SET
  name = 'Beauty Boss',
  description = '25 Beauty & Wellness reviews'
WHERE id = 'beauty_style_star';

-- "Nail Enthusiast" → "Cuticle Queen"
UPDATE public.badges SET
  name = 'Cuticle Queen',
  description = '5 nail salon reviews'
WHERE id = 'beauty_nail_enthusiast';

-- "Style Whisperer" → "Mane Lover"
UPDATE public.badges SET
  name = 'Mane Lover',
  description = '5 hair salon reviews'
WHERE id = 'beauty_style_whisperer';

-- "Soft Life Guru" → "Serenity Seeker"
UPDATE public.badges SET
  name = 'Serenity Seeker',
  description = '5 spa/wellness spot reviews'
WHERE id = 'beauty_soft_life_guru';

-- =============================================
-- B. ARTS & CULTURE SPECIALIST
-- =============================================

-- "Culture Curious" → "Heritage Hunter"
UPDATE public.badges SET
  name = 'Heritage Hunter',
  description = '3 Arts & Culture reviews'
WHERE id = 'arts_culture_curious';

-- "Art Explorer" → "Local Lore Seeker"
UPDATE public.badges SET
  name = 'Local Lore Seeker',
  description = '10 Arts & Culture reviews'
WHERE id = 'arts_art_explorer';

-- "Culture Maven" → "Culture Master"
UPDATE public.badges SET
  name = 'Culture Master',
  description = '25 Arts & Culture reviews'
WHERE id = 'arts_culture_maven';

-- "Theatre Friend" → "Curtain Chaser"
UPDATE public.badges SET
  name = 'Curtain Chaser',
  description = '5 theatre reviews'
WHERE id = 'arts_theatre_friend';

-- "Gallery Goer" → "Canvas Collector"
UPDATE public.badges SET
  name = 'Canvas Collector',
  description = '5 gallery reviews'
WHERE id = 'arts_gallery_goer';

-- "Cinephile" stays the same
UPDATE public.badges SET
  name = 'Cinephile',
  description = '5 cinema reviews'
WHERE id = 'arts_cinephile';

-- =============================================
-- B. OUTDOORS & ADVENTURE SPECIALIST
-- =============================================

-- "Fresh Air Friend" → "Nature Nomad"
UPDATE public.badges SET
  name = 'Nature Nomad',
  description = '3 Outdoors & Adventure reviews'
WHERE id = 'outdoors_fresh_air_friend';

-- "Adventure Explorer" → "Thrill Seeker"
UPDATE public.badges SET
  name = 'Thrill Seeker',
  description = '10 Outdoors & Adventure reviews'
WHERE id = 'outdoors_adventure_explorer';

-- "Adventure Ace" → "Adventure Voyager"
UPDATE public.badges SET
  name = 'Adventure Voyager',
  description = '25 Outdoors & Adventure reviews'
WHERE id = 'outdoors_adventure_ace';

-- "Trail Tracker" → "Trail Tamer"
UPDATE public.badges SET
  name = 'Trail Tamer',
  description = '5 hiking trail reviews'
WHERE id = 'outdoors_trail_tracker';

-- "Beach Browser" → "Beach Bum"
UPDATE public.badges SET
  name = 'Beach Bum',
  description = '5 beach reviews'
WHERE id = 'outdoors_beach_browser';

-- "Nature Drifter" → "Botanical Buff"
UPDATE public.badges SET
  name = 'Botanical Buff',
  description = '5 parks/gardens reviews'
WHERE id = 'outdoors_nature_drifter';

-- "Thrill Finder" → "Daredevil"
UPDATE public.badges SET
  name = 'Daredevil',
  description = '3 extreme/adventure activities'
WHERE id = 'outdoors_thrill_finder';

-- =============================================
-- B. SHOPPING & LIFESTYLE SPECIALIST
-- =============================================

-- "Shop Scout" → "Retail Royalty"
UPDATE public.badges SET
  name = 'Retail Royalty',
  description = '3 Shopping & Lifestyle reviews'
WHERE id = 'shopping_shop_scout';

-- "Lifestyle Explorer" → "Shopaholic"
UPDATE public.badges SET
  name = 'Shopaholic',
  description = '10 Shopping & Lifestyle reviews'
WHERE id = 'shopping_lifestyle_explorer';

-- Remove the 25-review badge for Shopping (not in new spec)
-- We'll keep it but it can remain for legacy users
UPDATE public.badges SET
  name = 'Shopping Pro',
  description = '25 Shopping & Lifestyle reviews (legacy)'
WHERE id = 'shopping_retail_ranger';

-- "Style Spotter" stays the same
UPDATE public.badges SET
  name = 'Style Spotter',
  description = '5 boutique reviews'
WHERE id = 'shopping_style_spotter';

-- "Gadget Grabber" → "Gadget Goblin"
UPDATE public.badges SET
  name = 'Gadget Goblin',
  description = '5 electronics store reviews'
WHERE id = 'shopping_gadget_grabber';

-- "Budget Finder" → "Baddie on a Budget"
UPDATE public.badges SET
  name = 'Baddie on a Budget',
  description = '3 affordable/discount store reviews'
WHERE id = 'shopping_budget_finder';

-- =============================================
-- B. FAMILY & PETS SPECIALIST
-- =============================================

-- "Home Life Scout" → "Quality Time Seeker"
UPDATE public.badges SET
  name = 'Quality Time Seeker',
  description = '3 Family & Pets reviews'
WHERE id = 'family_home_life_scout';

-- "Everyday Companion" → "Bonding Buff"
UPDATE public.badges SET
  name = 'Bonding Buff',
  description = '10 Family & Pets reviews'
WHERE id = 'family_everyday_companion';

-- "Family & Pets Pro" → "Playtime Pro"
UPDATE public.badges SET
  name = 'Playtime Pro',
  description = '25 Family & Pets reviews'
WHERE id = 'family_family_pets_pro';

-- "Care Companion" stays the same
UPDATE public.badges SET
  name = 'Care Companion',
  description = '5 vet/groomer/childcare reviews'
WHERE id = 'family_care_companion';

-- "Play & Paws Explorer" → "Play & Paws"
UPDATE public.badges SET
  name = 'Play & Paws',
  description = '5 family/pet-friendly spot reviews'
WHERE id = 'family_play_paws_explorer';

-- "Friendly Spaces Finder" stays the same
UPDATE public.badges SET
  name = 'Friendly Spaces Finder',
  description = '5 kids/pets play area reviews'
WHERE id = 'family_friendly_spaces';

-- =============================================
-- B. EXPERIENCES & ENTERTAINMENT SPECIALIST
-- =============================================

-- "Fun Finder" → "Memory Maker"
UPDATE public.badges SET
  name = 'Memory Maker',
  description = '3 Experiences & Entertainment reviews'
WHERE id = 'experiences_fun_finder';

-- "Event Explorer" → "Curiosity Cruiser"
UPDATE public.badges SET
  name = 'Curiosity Cruiser',
  description = '10 Experiences & Entertainment reviews'
WHERE id = 'experiences_event_explorer';

-- "Experience Pro" → "Vibe Voyager"
UPDATE public.badges SET
  name = 'Vibe Voyager',
  description = '25 Experiences & Entertainment reviews'
WHERE id = 'experiences_experience_pro';

-- "Music Lover" → "Beat Chaser"
UPDATE public.badges SET
  name = 'Beat Chaser',
  description = '5 music venue reviews'
WHERE id = 'experiences_music_lover';

-- "Show Goer" stays the same
UPDATE public.badges SET
  name = 'Show Goer',
  description = '5 theatres/cinemas reviews'
WHERE id = 'experiences_show_goer';

-- "Sunday Chiller" → "Weekend Warrior"
UPDATE public.badges SET
  name = 'Weekend Warrior',
  description = '3 weekend activity reviews'
WHERE id = 'experiences_sunday_chiller';

-- =============================================
-- B. PROFESSIONAL SERVICES SPECIALIST
-- =============================================

-- "Service Scout" stays the same
UPDATE public.badges SET
  name = 'Service Scout',
  description = '3 Professional Services reviews'
WHERE id = 'services_service_scout';

-- "Local Helper" → "Solution Seeker"
UPDATE public.badges SET
  name = 'Solution Seeker',
  description = '10 Professional Services reviews'
WHERE id = 'services_local_helper';

-- "Service Pro" stays the same
UPDATE public.badges SET
  name = 'Service Pro',
  description = '25 Professional Services reviews'
WHERE id = 'services_service_pro';

-- "Fix-It Finder" → "Fix-It Fairy"
UPDATE public.badges SET
  name = 'Fix-It Fairy',
  description = '5 repair/handyman/plumber/electrician reviews'
WHERE id = 'services_fix_it_finder';

-- "Money-Minded" stays the same
UPDATE public.badges SET
  name = 'Money-Minded',
  description = '5 finance/insurance services'
WHERE id = 'services_money_minded';

-- "Home Helper" stays the same
UPDATE public.badges SET
  name = 'Home Helper',
  description = '5 home service reviews'
WHERE id = 'services_home_helper';

-- =============================================
-- C. ACTIVITY & MILESTONE BADGES
-- =============================================

-- "New Voice" stays the same
UPDATE public.badges SET
  name = 'New Voice',
  description = 'Posted your first review'
WHERE id = 'milestone_new_voice';

-- "Rookie Reviewer" stays the same
UPDATE public.badges SET
  name = 'Rookie Reviewer',
  description = 'Posted 5 reviews'
WHERE id = 'milestone_rookie_reviewer';

-- "Level Up!" stays the same
UPDATE public.badges SET
  name = 'Level Up!',
  description = 'Posted 10 reviews'
WHERE id = 'milestone_level_up';

-- "Review Machine" stays the same
UPDATE public.badges SET
  name = 'Review Machine',
  description = 'Posted 50 reviews'
WHERE id = 'milestone_review_machine';

-- "Century Club" stays the same
UPDATE public.badges SET
  name = 'Century Club',
  description = 'Posted 100 reviews'
WHERE id = 'milestone_century_club';

-- "Take a Pic!" → "Picture Pioneer"
UPDATE public.badges SET
  name = 'Picture Pioneer',
  description = 'First photo uploaded'
WHERE id = 'milestone_take_pic';

-- "Visual Storyteller" → "Snapshot Superstar"
UPDATE public.badges SET
  name = 'Snapshot Superstar',
  description = '15 photos uploaded'
WHERE id = 'milestone_visual_storyteller';

-- "Helpful Reviewer" → "Helpful Honeybee"
UPDATE public.badges SET
  name = 'Helpful Honeybee',
  description = '10 helpful likes'
WHERE id = 'milestone_helpful_reviewer';

-- "Consistency Star" stays the same
UPDATE public.badges SET
  name = 'Consistency Star',
  description = 'Review once a week for a month'
WHERE id = 'milestone_consistency_star';

-- "Streak Star" → "Streak Spark"
UPDATE public.badges SET
  name = 'Streak Spark',
  description = '7-day review streak'
WHERE id = 'milestone_streak_star';

-- =============================================
-- D. COMMUNITY & PERSONALITY BADGES
-- =============================================

-- "Early Bird" → "Early Birdie"
UPDATE public.badges SET
  name = 'Early Birdie',
  description = 'First to review a business'
WHERE id = 'community_early_bird';

-- "Community Helper" stays the same
UPDATE public.badges SET
  name = 'Community Helper',
  description = 'One of your reviews gets 5+ helpful votes'
WHERE id = 'community_helper';

-- "Trend Starter" stays the same
UPDATE public.badges SET
  name = 'Trend Starter',
  description = 'Your review sparks a rise in new reviews'
WHERE id = 'community_trend_starter';

-- "Discoverer" → "Columbus"
UPDATE public.badges SET
  name = 'Columbus',
  description = 'Review 3 businesses with fewer than 3 reviews each'
WHERE id = 'community_discoverer';

-- "The Loyal One" stays the same
UPDATE public.badges SET
  name = 'The Loyal One',
  description = 'Review the same business twice'
WHERE id = 'community_loyal_one';

-- "Neighbourhood Plug" stays the same
UPDATE public.badges SET
  name = 'Neighbourhood Plug',
  description = 'Review 10+ businesses in one suburb'
WHERE id = 'community_neighbourhood_plug';

-- "Hidden Gem Finder" → "Hidden Gem Hunter"
UPDATE public.badges SET
  name = 'Hidden Gem Hunter',
  description = 'Review 5 underrated spots'
WHERE id = 'community_hidden_gem';

-- "Fun Storyteller" → "Lens Legend"
UPDATE public.badges SET
  name = 'Lens Legend',
  description = 'Reviews + photos + 3 helpful votes'
WHERE id = 'community_fun_storyteller';

-- Add new badge: "Plug of the Year"
INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, threshold, icon_name)
VALUES (
  'community_plug_of_year',
  'Plug of the Year',
  'Discover 5 places before anyone else',
  'community',
  NULL,
  'first_review_for_business',
  5,
  'award'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- All badge names and descriptions updated to match Badge names.pdf spec
