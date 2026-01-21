-- =============================================
-- UPDATE BADGES TO MATCH NEW SPEC
-- 72 Badges, 72 Unique Icons, 1 Unused (007-home.png)
-- =============================================

BEGIN;

-- Update badge_group constraint
ALTER TABLE public.badges
  DROP CONSTRAINT IF EXISTS badges_badge_group_check;

ALTER TABLE public.badges
  ADD CONSTRAINT badges_badge_group_check
  CHECK (badge_group IN ('explorer','specialist','milestone','community'));

COMMIT;

-- =============================================
-- A. CATEGORY EXPLORER BADGES (5 badges)
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('explorer_dabbler', 'The Dabbler', 'Reviewed 3 different categories', 'explorer', NULL, 'achievement', '011-compass.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('explorer_newbie_nomad', 'Newbie Nomad', 'Reviewed 5 different categories', 'explorer', NULL, 'achievement', '036-binocular.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('explorer_curiosity_captain', 'Curiosity Captain', 'Reviewed 6 different categories', 'explorer', NULL, 'achievement', '044-boat-captain-hat.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('explorer_variety_voyager', 'Variety Voyager', 'Reviewed 7 different categories', 'explorer', NULL, 'achievement', '045-diversity.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('explorer_full_circle', 'Full Circle', 'Reviewed all 8 categories', 'explorer', NULL, 'achievement', '043-choice.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

-- =============================================
-- B. SPECIALIST BADGES (48 badges)
-- =============================================

-- B.1 Food & Drink (6 badges)
INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_food_taste_tester', 'Taste Tester', '3 Food & Drink reviews', 'specialist', 'food-drink', 'achievement', '047-tongue.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_food_flavour_finder', 'Flavour Finder', '10 Food & Drink reviews', 'specialist', 'food-drink', 'achievement', '051-searcher.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_food_foodie_boss', 'Foodie Boss', '25 Food & Drink reviews', 'specialist', 'food-drink', 'achievement', '049-leadership.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_food_coffee_connoisseur', 'Coffee Connoisseur', '5 café reviews', 'specialist', 'food-drink', 'achievement', '050-coffee-bean.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_food_dessert_detective', 'Dessert Detective', '5 dessert spot reviews', 'specialist', 'food-drink', 'achievement', '052-croissant.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_food_brunch_enthusiast', 'Brunch Enthusiast', '5 brunch spot reviews', 'specialist', 'food-drink', 'achievement', '048-extract.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

-- B.2 Beauty & Wellness (6 badges)
INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_beauty_glow_getter', 'Glow Getter', '3 Beauty & Wellness reviews', 'specialist', 'beauty-wellness', 'achievement', '053-woman.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_beauty_self_care_superstar', 'Self-Care Superstar', '10 Beauty & Wellness reviews', 'specialist', 'beauty-wellness', 'achievement', '054-self-love.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_beauty_beauty_boss', 'Beauty Boss', '25 Beauty & Wellness reviews', 'specialist', 'beauty-wellness', 'achievement', '055-makeover.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_beauty_cuticle_queen', 'Cuticle Queen', '5 nail salon reviews', 'specialist', 'beauty-wellness', 'achievement', '056-nail-polish.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_beauty_mane_lover', 'Mane Lover', '5 hair salon reviews', 'specialist', 'beauty-wellness', 'achievement', '057-lion.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_beauty_serenity_seeker', 'Serenity Seeker', '5 spa/wellness reviews', 'specialist', 'beauty-wellness', 'achievement', '018-peace.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

-- B.3 Arts & Culture (6 badges)
INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_arts_heritage_hunter', 'Heritage Hunter', '3 Arts & Culture reviews', 'specialist', 'arts-culture', 'achievement', '059-heritage.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_arts_local_lore_seeker', 'Local Lore Seeker', '10 Arts & Culture reviews', 'specialist', 'arts-culture', 'achievement', '060-history.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_arts_culture_master', 'Culture Master', '25 Arts & Culture reviews', 'specialist', 'arts-culture', 'achievement', '061-master.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_arts_curtain_chaser', 'Curtain Chaser', '5 theatre reviews', 'specialist', 'arts-culture', 'achievement', '014-mask.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_arts_canvas_collector', 'Canvas Collector', '5 gallery reviews', 'specialist', 'arts-culture', 'achievement', '063-easel.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_arts_cinephile', 'Cinephile', '5 cinema reviews', 'specialist', 'arts-culture', 'achievement', '064-clapperboard.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

-- B.4 Outdoors & Adventure (7 badges)
INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_outdoors_nature_nomad', 'Nature Nomad', '3 Outdoors & Adventure reviews', 'specialist', 'outdoors-adventure', 'achievement', '065-seeding.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_outdoors_thrill_seeker', 'Thrill Seeker', '10 Outdoors & Adventure reviews', 'specialist', 'outdoors-adventure', 'achievement', '066-skydiving.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_outdoors_adventure_voyager', 'Adventure Voyager', '25 Outdoors & Adventure reviews', 'specialist', 'outdoors-adventure', 'achievement', '067-adventure-game.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_outdoors_trail_tamer', 'Trail Tamer', '5 hiking trail reviews', 'specialist', 'outdoors-adventure', 'achievement', '068-trail-marker.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_outdoors_beach_bum', 'Beach Bum', '5 beach reviews', 'specialist', 'outdoors-adventure', 'achievement', '069-wave.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_outdoors_botanical_buff', 'Botanical Buff', '5 park/garden reviews', 'specialist', 'outdoors-adventure', 'achievement', '070-botanical.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_outdoors_daredevil', 'Daredevil', '3 adventure sports reviews', 'specialist', 'outdoors-adventure', 'achievement', '071-devil.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

-- B.5 Shopping & Lifestyle (5 badges)
INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_shopping_retail_royalty', 'Retail Royalty', '3 Shopping & Lifestyle reviews', 'specialist', 'shopping-lifestyle', 'achievement', '072-jewel.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_shopping_shopaholic', 'Shopaholic', '10 Shopping & Lifestyle reviews', 'specialist', 'shopping-lifestyle', 'achievement', '073-shopaholic.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_shopping_style_spotter', 'Style Spotter', '25 Shopping & Lifestyle reviews', 'specialist', 'shopping-lifestyle', 'achievement', '017-scarf.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_shopping_gadget_goblin', 'Gadget Goblin', '5 electronics store reviews', 'specialist', 'shopping-lifestyle', 'achievement', '002-goblin.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_shopping_baddie_on_budget', 'Baddie on a Budget', '3 discount store reviews', 'specialist', 'shopping-lifestyle', 'achievement', '003-money-bag.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

-- B.6 Family & Pets (6 badges)
INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_family_quality_time_seeker', 'Quality Time Seeker', '3 Family & Pets reviews', 'specialist', 'family-pets', 'achievement', '004-waiting.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_family_bonding_buff', 'Bonding Buff', '10 Family & Pets reviews', 'specialist', 'family-pets', 'achievement', '005-social-life.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_family_playtime_pro', 'Playtime Pro', '25 Family & Pets reviews', 'specialist', 'family-pets', 'achievement', '006-toy.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_family_care_companion', 'Care Companion', '5 vet/pet groomer/childcare reviews', 'specialist', 'family-pets', 'achievement', '008-baby.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_family_play_paws', 'Play & Paws', '5 family/pet-friendly spot reviews', 'specialist', 'family-pets', 'achievement', '009-mouse.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_family_friendly_spaces_finder', 'Friendly Spaces Finder', '5 kids/pets play area reviews', 'specialist', 'family-pets', 'achievement', '010-confetti.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

-- B.7 Experiences & Entertainment (6 badges)
INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_experiences_memory_maker', 'Memory Maker', '3 Experiences & Entertainment reviews', 'specialist', 'experiences-entertainment', 'achievement', '046-rec.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_experiences_curiosity_cruiser', 'Curiosity Cruiser', '10 Experiences & Entertainment reviews', 'specialist', 'experiences-entertainment', 'achievement', '026-gears.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_experiences_vibe_voyager', 'Vibe Voyager', '25 Experiences & Entertainment reviews', 'specialist', 'experiences-entertainment', 'achievement', '021-mindset.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_experiences_beat_chaser', 'Beat Chaser', '5 music venue reviews', 'specialist', 'experiences-entertainment', 'achievement', '013-vinyl.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_experiences_show_goer', 'Show Goer', '5 cinema/theatre reviews', 'specialist', 'experiences-entertainment', 'achievement', '062-decoration.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_experiences_weekend_warrior', 'Weekend Warrior', '3 weekend spot reviews', 'specialist', 'experiences-entertainment', 'achievement', '015-weekend.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

-- B.8 Professional Services (6 badges)
INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_services_service_scout', 'Service Scout', '3 Professional Services reviews', 'specialist', 'professional-services', 'achievement', '019-professional-services.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_services_solution_seeker', 'Solution Seeker', '10 Professional Services reviews', 'specialist', 'professional-services', 'achievement', '012-expertise.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_services_service_pro', 'Service Pro', '25 Professional Services reviews', 'specialist', 'professional-services', 'achievement', '023-ai-technology.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_services_fix_it_fairy', 'Fix-It Fairy', '5 repair/handyman reviews', 'specialist', 'professional-services', 'achievement', '016-wrench.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_services_money_minded', 'Money-Minded', '5 finance/insurance reviews', 'specialist', 'professional-services', 'achievement', '001-accessory.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('specialist_services_home_helper', 'Home Helper', '5 home service reviews', 'specialist', 'professional-services', 'achievement', '022-house.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

-- =============================================
-- C. MILESTONE BADGES (10 badges)
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('milestone_new_voice', 'New Voice', 'Posted your first review', 'milestone', NULL, 'achievement', '027-aniversary.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('milestone_rookie_reviewer', 'Rookie Reviewer', 'Posted 5 reviews', 'milestone', NULL, 'achievement', '024-climbing-stairs.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('milestone_level_up', 'Level Up!', 'Posted 10 reviews', 'milestone', NULL, 'achievement', '025-level-up.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('milestone_review_machine', 'Review Machine', 'Posted 50 reviews', 'milestone', NULL, 'achievement', '041-no-connection.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('milestone_century_club', 'Century Club', 'Posted 100 reviews', 'milestone', NULL, 'achievement', '042-test.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('milestone_picture_pioneer', 'Picture Pioneer', 'Uploaded your first photo', 'milestone', NULL, 'achievement', '028-phone-camera.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('milestone_snapshot_superstar', 'Snapshot Superstar', 'Uploaded 15 photos', 'milestone', NULL, 'achievement', '029-camera.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('milestone_helpful_honeybee', 'Helpful Honeybee', 'Got 10 helpful votes', 'milestone', NULL, 'achievement', '030-honeybee.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('milestone_consistency_star', 'Consistency Star', 'Posted weekly for a month', 'milestone', NULL, 'achievement', '031-star.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('milestone_streak_spark', 'Streak Spark', 'Posted 7 days in a row', 'milestone', NULL, 'achievement', '032-fire.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

-- =============================================
-- D. COMMUNITY BADGES (9 badges)
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('community_early_birdie', 'Early Birdie', 'First to review a business', 'community', NULL, 'achievement', '033-early.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('community_community_helper', 'Community Helper', 'Review got 5+ helpful votes', 'community', NULL, 'achievement', '034-social-support.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('community_trend_starter', 'Trend Starter', 'Review made a place trend', 'community', NULL, 'achievement', '035-sunglasses.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('community_columbus', 'Columbus', 'Reviewed 3 businesses with <3 reviews', 'community', NULL, 'achievement', '020-magic-wand.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('community_loyal_one', 'The Loyal One', 'Reviewed same business twice', 'community', NULL, 'achievement', '037-loyalty.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('community_neighbourhood_plug', 'Neighbourhood Plug', 'Reviewed 10+ places in one suburb', 'community', NULL, 'achievement', '038-plug.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('community_hidden_gem_hunter', 'Hidden Gem Hunter', 'Reviewed 5 underrated spots', 'community', NULL, 'achievement', '039-gem.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('community_lens_legend', 'Lens Legend', 'Photos got 3+ helpful votes', 'community', NULL, 'achievement', '040-lens.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, icon_name) VALUES 
('community_plug_of_year', 'Plug of the Year', 'Top community contributor', 'community', NULL, 'achievement', '058-plant.png')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, badge_group = EXCLUDED.badge_group, category_key = EXCLUDED.category_key, rule_type = EXCLUDED.rule_type, icon_name = EXCLUDED.icon_name;

-- =============================================
-- SUMMARY
-- =============================================
-- Total: 72 badges (5 explorer + 48 specialist + 10 milestone + 9 community)
-- Icons used: 72 unique PNGs from 001-073 (excluding 007-home.png)
-- Each badge has a unique icon_name, no reuse
