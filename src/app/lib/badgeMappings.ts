/**
 * Badge Mappings - Maps badge IDs to PNG images and Lucide icons
 * Based on Badge names.pdf specification
 *
 * PNG images are stored in /public/badges/
 * Lucide icons are used for compact display on review cards
 */

import {
  Compass,
  Map,
  Globe,
  CircleDot,
  Target,
  Utensils,
  Search,
  Crown,
  Coffee,
  Cake,
  Croissant,
  Sparkles,
  Heart,
  Award,
  Scissors,
  Brush,
  Flower2,
  Landmark,
  BookOpen,
  GraduationCap,
  Theater,
  Palette,
  Film,
  TreePine,
  Mountain,
  Ship,
  MapPin,
  Waves,
  Leaf,
  Flame,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Smartphone,
  Wallet,
  Baby,
  Users,
  Gamepad2,
  PawPrint,
  Smile,
  PartyPopper,
  Music,
  Clapperboard,
  Calendar,
  Briefcase,
  Lightbulb,
  Wrench,
  BadgeDollarSign,
  Home,
  Megaphone,
  BadgeCheck,
  Gauge,
  Rocket,
  Trophy,
  Camera,
  Image,
  ThumbsUp,
  Star,
  Zap,
  Bird,
  HelpingHand,
  TrendingUp,
  Sailboat,
  Repeat,
  MapPinned,
  Gem,
  Aperture,
  Medal,
  type LucideIcon,
} from "lucide-react";

export interface BadgeMapping {
  id: string;
  name: string;
  description: string;
  pngPath: string;
  lucideIcon: LucideIcon;
  badgeGroup: "explorer" | "specialist" | "milestone" | "community";
  categoryKey?: string;
}

/**
 * Complete badge mappings based on Badge names.pdf specification
 */
export const BADGE_MAPPINGS: Record<string, BadgeMapping> = {
  // =============================================
  // A. CATEGORY EXPLORER BADGES
  // =============================================
  explorer_sampler: {
    id: "explorer_sampler",
    name: "The Dabbler",
    description: "Review 1 business in at least 3 different categories",
    pngPath: "/badges/042-test.png",
    lucideIcon: Compass,
    badgeGroup: "explorer",
  },
  explorer_explorer: {
    id: "explorer_explorer",
    name: "Newbie Nomad",
    description: "Review 10 businesses across 5 categories",
    pngPath: "/badges/065-seeding.png",
    lucideIcon: Map,
    badgeGroup: "explorer",
  },
  explorer_local_legend: {
    id: "explorer_local_legend",
    name: "Curiosity Captain",
    description: "Review 1 business in every category",
    pngPath: "/badges/044-boat-captain-hat.png",
    lucideIcon: Ship,
    badgeGroup: "explorer",
  },
  explorer_world_wanderer: {
    id: "explorer_world_wanderer",
    name: "Variety Voyager",
    description: "Review more than 1 business in every category",
    pngPath: "/badges/045-diversity.png",
    lucideIcon: Globe,
    badgeGroup: "explorer",
  },
  explorer_full_spectrum: {
    id: "explorer_full_spectrum",
    name: "Full Circle",
    description: "Review 50+ businesses across 8+ categories",
    pngPath: "/badges/046-rec.png",
    lucideIcon: Target,
    badgeGroup: "explorer",
  },

  // =============================================
  // B. FOOD & DRINK SPECIALIST
  // =============================================
  food_taste_taster: {
    id: "food_taste_taster",
    name: "Taste Tester",
    description: "3 Food & Drink reviews",
    pngPath: "/badges/047-tongue.png",
    lucideIcon: Utensils,
    badgeGroup: "specialist",
    categoryKey: "food-drink",
  },
  food_foodie_finder: {
    id: "food_foodie_finder",
    name: "Flavour Finder",
    description: "10 Food & Drink reviews",
    pngPath: "/badges/048-extract.png",
    lucideIcon: Search,
    badgeGroup: "specialist",
    categoryKey: "food-drink",
  },
  food_foodie_boss: {
    id: "food_foodie_boss",
    name: "Foodie Boss",
    description: "25 Food & Drink reviews",
    pngPath: "/badges/049-leadership.png",
    lucideIcon: Crown,
    badgeGroup: "specialist",
    categoryKey: "food-drink",
  },
  food_coffee_lover: {
    id: "food_coffee_lover",
    name: "Coffee Connoisseur",
    description: "5 cafe reviews",
    pngPath: "/badges/050-coffee-bean.png",
    lucideIcon: Coffee,
    badgeGroup: "specialist",
    categoryKey: "food-drink",
  },
  food_sweet_tooth: {
    id: "food_sweet_tooth",
    name: "Dessert Detective",
    description: "5 dessert reviews",
    pngPath: "/badges/051-searcher.png",
    lucideIcon: Cake,
    badgeGroup: "specialist",
    categoryKey: "food-drink",
  },
  food_brunch_enthusiast: {
    id: "food_brunch_enthusiast",
    name: "Brunch Enthusiast",
    description: "5 brunch spots",
    pngPath: "/badges/052-croissant.png",
    lucideIcon: Croissant,
    badgeGroup: "specialist",
    categoryKey: "food-drink",
  },

  // =============================================
  // B. BEAUTY & WELLNESS SPECIALIST
  // =============================================
  beauty_glow_seeker: {
    id: "beauty_glow_seeker",
    name: "Glow Getter",
    description: "3 Beauty & Wellness reviews",
    pngPath: "/badges/053-woman.png",
    lucideIcon: Sparkles,
    badgeGroup: "specialist",
    categoryKey: "beauty-wellness",
  },
  beauty_beauty_explorer: {
    id: "beauty_beauty_explorer",
    name: "Selfcare Superstar",
    description: "10 Beauty & Wellness reviews",
    pngPath: "/badges/054-self-love.png",
    lucideIcon: Heart,
    badgeGroup: "specialist",
    categoryKey: "beauty-wellness",
  },
  beauty_style_star: {
    id: "beauty_style_star",
    name: "Beauty Boss",
    description: "25 Beauty & Wellness reviews",
    pngPath: "/badges/055-makeover.png",
    lucideIcon: Award,
    badgeGroup: "specialist",
    categoryKey: "beauty-wellness",
  },
  beauty_nail_enthusiast: {
    id: "beauty_nail_enthusiast",
    name: "Cuticle Queen",
    description: "5 nail salon reviews",
    pngPath: "/badges/056-nail-polish.png",
    lucideIcon: Scissors,
    badgeGroup: "specialist",
    categoryKey: "beauty-wellness",
  },
  beauty_style_whisperer: {
    id: "beauty_style_whisperer",
    name: "Mane Lover",
    description: "5 hair salon reviews",
    pngPath: "/badges/057-lion.png",
    lucideIcon: Brush,
    badgeGroup: "specialist",
    categoryKey: "beauty-wellness",
  },
  beauty_soft_life_guru: {
    id: "beauty_soft_life_guru",
    name: "Serenity Seeker",
    description: "5 spa/wellness spot reviews",
    pngPath: "/badges/058-plant.png",
    lucideIcon: Flower2,
    badgeGroup: "specialist",
    categoryKey: "beauty-wellness",
  },

  // =============================================
  // B. ARTS & CULTURE SPECIALIST
  // =============================================
  arts_culture_curious: {
    id: "arts_culture_curious",
    name: "Heritage Hunter",
    description: "3 Arts & Culture reviews",
    pngPath: "/badges/059-heritage.png",
    lucideIcon: Landmark,
    badgeGroup: "specialist",
    categoryKey: "arts-culture",
  },
  arts_art_explorer: {
    id: "arts_art_explorer",
    name: "Local Lore Seeker",
    description: "10 Arts & Culture reviews",
    pngPath: "/badges/060-history.png",
    lucideIcon: BookOpen,
    badgeGroup: "specialist",
    categoryKey: "arts-culture",
  },
  arts_culture_maven: {
    id: "arts_culture_maven",
    name: "Culture Master",
    description: "25 Arts & Culture reviews",
    pngPath: "/badges/061-master.png",
    lucideIcon: GraduationCap,
    badgeGroup: "specialist",
    categoryKey: "arts-culture",
  },
  arts_theatre_friend: {
    id: "arts_theatre_friend",
    name: "Curtain Chaser",
    description: "5 theatre reviews",
    pngPath: "/badges/062-decoration.png",
    lucideIcon: Theater,
    badgeGroup: "specialist",
    categoryKey: "arts-culture",
  },
  arts_gallery_goer: {
    id: "arts_gallery_goer",
    name: "Canvas Collector",
    description: "5 gallery reviews",
    pngPath: "/badges/063-easel.png",
    lucideIcon: Palette,
    badgeGroup: "specialist",
    categoryKey: "arts-culture",
  },
  arts_cinephile: {
    id: "arts_cinephile",
    name: "Cinephile",
    description: "5 cinema reviews",
    pngPath: "/badges/064-clapperboard.png",
    lucideIcon: Film,
    badgeGroup: "specialist",
    categoryKey: "arts-culture",
  },

  // =============================================
  // B. OUTDOORS & ADVENTURE SPECIALIST
  // =============================================
  outdoors_fresh_air_friend: {
    id: "outdoors_fresh_air_friend",
    name: "Nature Nomad",
    description: "3 Outdoors & Adventure reviews",
    pngPath: "/badges/065-seeding.png",
    lucideIcon: TreePine,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },
  outdoors_adventure_explorer: {
    id: "outdoors_adventure_explorer",
    name: "Thrill Seeker",
    description: "10 Outdoors & Adventure reviews",
    pngPath: "/badges/066-skydiving.png",
    lucideIcon: Mountain,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },
  outdoors_adventure_ace: {
    id: "outdoors_adventure_ace",
    name: "Adventure Voyager",
    description: "25 Outdoors & Adventure reviews",
    pngPath: "/badges/067-adventure-game.png",
    lucideIcon: Ship,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },
  outdoors_trail_tracker: {
    id: "outdoors_trail_tracker",
    name: "Trail Tamer",
    description: "5 hiking trail reviews",
    pngPath: "/badges/068-trail-marker.png",
    lucideIcon: MapPin,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },
  outdoors_beach_browser: {
    id: "outdoors_beach_browser",
    name: "Beach Bum",
    description: "5 beach reviews",
    pngPath: "/badges/069-wave.png",
    lucideIcon: Waves,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },
  outdoors_nature_drifter: {
    id: "outdoors_nature_drifter",
    name: "Botanical Buff",
    description: "5 parks/gardens reviews",
    pngPath: "/badges/070-botanical.png",
    lucideIcon: Leaf,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },
  outdoors_thrill_finder: {
    id: "outdoors_thrill_finder",
    name: "Daredevil",
    description: "3 extreme/adventure activities",
    pngPath: "/badges/071-devil.png",
    lucideIcon: Flame,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },

  // =============================================
  // B. SHOPPING & LIFESTYLE SPECIALIST
  // =============================================
  shopping_shop_scout: {
    id: "shopping_shop_scout",
    name: "Retail Royalty",
    description: "3 Shopping & Lifestyle reviews",
    pngPath: "/badges/072-jewel.png",
    lucideIcon: ShoppingBag,
    badgeGroup: "specialist",
    categoryKey: "shopping-lifestyle",
  },
  shopping_lifestyle_explorer: {
    id: "shopping_lifestyle_explorer",
    name: "Shopaholic",
    description: "10 Shopping & Lifestyle reviews",
    pngPath: "/badges/073-shopaholic.png",
    lucideIcon: ShoppingCart,
    badgeGroup: "specialist",
    categoryKey: "shopping-lifestyle",
  },
  shopping_style_spotter: {
    id: "shopping_style_spotter",
    name: "Style Spotter",
    description: "5 boutique reviews",
    pngPath: "/badges/001-accessory.png",
    lucideIcon: Shirt,
    badgeGroup: "specialist",
    categoryKey: "shopping-lifestyle",
  },
  shopping_gadget_grabber: {
    id: "shopping_gadget_grabber",
    name: "Gadget Goblin",
    description: "5 electronics store reviews",
    pngPath: "/badges/002-goblin.png",
    lucideIcon: Smartphone,
    badgeGroup: "specialist",
    categoryKey: "shopping-lifestyle",
  },
  shopping_budget_finder: {
    id: "shopping_budget_finder",
    name: "Baddie on a Budget",
    description: "3 affordable/discount store reviews",
    pngPath: "/badges/003-money-bag.png",
    lucideIcon: Wallet,
    badgeGroup: "specialist",
    categoryKey: "shopping-lifestyle",
  },

  // =============================================
  // B. FAMILY & PETS SPECIALIST
  // =============================================
  family_home_life_scout: {
    id: "family_home_life_scout",
    name: "Quality Time Seeker",
    description: "3 Family & Pets reviews",
    pngPath: "/badges/004-waiting.png",
    lucideIcon: Baby,
    badgeGroup: "specialist",
    categoryKey: "family-pets",
  },
  family_everyday_companion: {
    id: "family_everyday_companion",
    name: "Bonding Buff",
    description: "10 Family & Pets reviews",
    pngPath: "/badges/005-social-life.png",
    lucideIcon: Users,
    badgeGroup: "specialist",
    categoryKey: "family-pets",
  },
  family_family_pets_pro: {
    id: "family_family_pets_pro",
    name: "Playtime Pro",
    description: "25 Family & Pets reviews",
    pngPath: "/badges/006-toy.png",
    lucideIcon: Gamepad2,
    badgeGroup: "specialist",
    categoryKey: "family-pets",
  },
  family_care_companion: {
    id: "family_care_companion",
    name: "Care Companion",
    description: "5 vet/groomer/childcare reviews",
    pngPath: "/badges/008-baby.png",
    lucideIcon: Heart,
    badgeGroup: "specialist",
    categoryKey: "family-pets",
  },
  family_play_paws_explorer: {
    id: "family_play_paws_explorer",
    name: "Play & Paws",
    description: "5 family/pet-friendly spot reviews",
    pngPath: "/badges/009-mouse.png",
    lucideIcon: PawPrint,
    badgeGroup: "specialist",
    categoryKey: "family-pets",
  },
  family_friendly_spaces: {
    id: "family_friendly_spaces",
    name: "Friendly Spaces Finder",
    description: "5 kids/pets play area reviews",
    pngPath: "/badges/010-confetti.png",
    lucideIcon: Smile,
    badgeGroup: "specialist",
    categoryKey: "family-pets",
  },

  // =============================================
  // B. EXPERIENCES & ENTERTAINMENT SPECIALIST
  // =============================================
  experiences_fun_finder: {
    id: "experiences_fun_finder",
    name: "Memory Maker",
    description: "3 Experiences & Entertainment reviews",
    pngPath: "/badges/010-confetti.png",
    lucideIcon: PartyPopper,
    badgeGroup: "specialist",
    categoryKey: "experiences-entertainment",
  },
  experiences_event_explorer: {
    id: "experiences_event_explorer",
    name: "Curiosity Cruiser",
    description: "10 Experiences & Entertainment reviews",
    pngPath: "/badges/036-binocular.png",
    lucideIcon: Compass,
    badgeGroup: "specialist",
    categoryKey: "experiences-entertainment",
  },
  experiences_experience_pro: {
    id: "experiences_experience_pro",
    name: "Vibe Voyager",
    description: "25 Experiences & Entertainment reviews",
    pngPath: "/badges/035-sunglasses.png",
    lucideIcon: Sparkles,
    badgeGroup: "specialist",
    categoryKey: "experiences-entertainment",
  },
  experiences_music_lover: {
    id: "experiences_music_lover",
    name: "Beat Chaser",
    description: "5 music venue reviews",
    pngPath: "/badges/013-vinyl.png",
    lucideIcon: Music,
    badgeGroup: "specialist",
    categoryKey: "experiences-entertainment",
  },
  experiences_show_goer: {
    id: "experiences_show_goer",
    name: "Show Goer",
    description: "5 theatres/cinemas reviews",
    pngPath: "/badges/064-clapperboard.png",
    lucideIcon: Clapperboard,
    badgeGroup: "specialist",
    categoryKey: "experiences-entertainment",
  },
  experiences_sunday_chiller: {
    id: "experiences_sunday_chiller",
    name: "Weekend Warrior",
    description: "3 weekend activity reviews",
    pngPath: "/badges/015-weekend.png",
    lucideIcon: Calendar,
    badgeGroup: "specialist",
    categoryKey: "experiences-entertainment",
  },

  // =============================================
  // B. PROFESSIONAL SERVICES SPECIALIST
  // =============================================
  services_service_scout: {
    id: "services_service_scout",
    name: "Service Scout",
    description: "3 Professional Services reviews",
    pngPath: "/badges/019-professional-services.png",
    lucideIcon: Briefcase,
    badgeGroup: "specialist",
    categoryKey: "professional-services",
  },
  services_local_helper: {
    id: "services_local_helper",
    name: "Solution Seeker",
    description: "10 Professional Services reviews",
    pngPath: "/badges/023-ai-technology.png",
    lucideIcon: Lightbulb,
    badgeGroup: "specialist",
    categoryKey: "professional-services",
  },
  services_service_pro: {
    id: "services_service_pro",
    name: "Service Pro",
    description: "25 Professional Services reviews",
    pngPath: "/badges/012-expertise.png",
    lucideIcon: Award,
    badgeGroup: "specialist",
    categoryKey: "professional-services",
  },
  services_fix_it_finder: {
    id: "services_fix_it_finder",
    name: "Fix-It Fairy",
    description: "5 repair/handyman/plumber/electrician reviews",
    pngPath: "/badges/016-wrench.png",
    lucideIcon: Wrench,
    badgeGroup: "specialist",
    categoryKey: "professional-services",
  },
  services_money_minded: {
    id: "services_money_minded",
    name: "Money-Minded",
    description: "5 finance/insurance services",
    pngPath: "/badges/003-money-bag.png",
    lucideIcon: BadgeDollarSign,
    badgeGroup: "specialist",
    categoryKey: "professional-services",
  },
  services_home_helper: {
    id: "services_home_helper",
    name: "Home Helper",
    description: "5 home service reviews",
    pngPath: "/badges/007-home.png",
    lucideIcon: Home,
    badgeGroup: "specialist",
    categoryKey: "professional-services",
  },

  // =============================================
  // C. ACTIVITY & MILESTONE BADGES
  // =============================================
  milestone_new_voice: {
    id: "milestone_new_voice",
    name: "New Voice",
    description: "Posted your first review",
    pngPath: "/badges/027-aniversary.png",
    lucideIcon: Megaphone,
    badgeGroup: "milestone",
  },
  milestone_rookie_reviewer: {
    id: "milestone_rookie_reviewer",
    name: "Rookie Reviewer",
    description: "Posted 5 reviews",
    pngPath: "/badges/024-climbing-stairs.png",
    lucideIcon: BadgeCheck,
    badgeGroup: "milestone",
  },
  milestone_level_up: {
    id: "milestone_level_up",
    name: "Level Up!",
    description: "Posted 10 reviews",
    pngPath: "/badges/025-level-up.png",
    lucideIcon: Gauge,
    badgeGroup: "milestone",
  },
  milestone_review_machine: {
    id: "milestone_review_machine",
    name: "Review Machine",
    description: "Posted 50 reviews",
    pngPath: "/badges/026-gears.png",
    lucideIcon: Rocket,
    badgeGroup: "milestone",
  },
  milestone_century_club: {
    id: "milestone_century_club",
    name: "Century Club",
    description: "Posted 100 reviews",
    pngPath: "/badges/012-expertise.png",
    lucideIcon: Trophy,
    badgeGroup: "milestone",
  },
  milestone_take_pic: {
    id: "milestone_take_pic",
    name: "Picture Pioneer",
    description: "First photo uploaded",
    pngPath: "/badges/028-phone-camera.png",
    lucideIcon: Camera,
    badgeGroup: "milestone",
  },
  milestone_visual_storyteller: {
    id: "milestone_visual_storyteller",
    name: "Snapshot Superstar",
    description: "15 photos uploaded",
    pngPath: "/badges/029-camera.png",
    lucideIcon: Image,
    badgeGroup: "milestone",
  },
  milestone_helpful_reviewer: {
    id: "milestone_helpful_reviewer",
    name: "Helpful Honeybee",
    description: "10 helpful likes",
    pngPath: "/badges/030-honeybee.png",
    lucideIcon: ThumbsUp,
    badgeGroup: "milestone",
  },
  milestone_consistency_star: {
    id: "milestone_consistency_star",
    name: "Consistency Star",
    description: "Review once a week for a month",
    pngPath: "/badges/031-star.png",
    lucideIcon: Star,
    badgeGroup: "milestone",
  },
  milestone_streak_star: {
    id: "milestone_streak_star",
    name: "Streak Spark",
    description: "7-day review streak",
    pngPath: "/badges/032-fire.png",
    lucideIcon: Zap,
    badgeGroup: "milestone",
  },

  // =============================================
  // D. COMMUNITY & PERSONALITY BADGES
  // =============================================
  community_early_bird: {
    id: "community_early_bird",
    name: "Early Birdie",
    description: "First to review a business",
    pngPath: "/badges/033-early.png",
    lucideIcon: Bird,
    badgeGroup: "community",
  },
  community_helper: {
    id: "community_helper",
    name: "Community Helper",
    description: "One of your reviews gets 5+ helpful votes",
    pngPath: "/badges/034-social-support.png",
    lucideIcon: HelpingHand,
    badgeGroup: "community",
  },
  community_trend_starter: {
    id: "community_trend_starter",
    name: "Trend Starter",
    description: "Your review sparks a rise in new reviews",
    pngPath: "/badges/035-sunglasses.png",
    lucideIcon: TrendingUp,
    badgeGroup: "community",
  },
  community_discoverer: {
    id: "community_discoverer",
    name: "Columbus",
    description: "Review 3 businesses with fewer than 3 reviews each",
    pngPath: "/badges/036-binocular.png",
    lucideIcon: Sailboat,
    badgeGroup: "community",
  },
  community_loyal_one: {
    id: "community_loyal_one",
    name: "The Loyal One",
    description: "Review the same business twice",
    pngPath: "/badges/037-loyalty.png",
    lucideIcon: Repeat,
    badgeGroup: "community",
  },
  community_neighbourhood_plug: {
    id: "community_neighbourhood_plug",
    name: "Neighbourhood Plug",
    description: "Review 10+ businesses in one suburb",
    pngPath: "/badges/038-plug.png",
    lucideIcon: MapPinned,
    badgeGroup: "community",
  },
  community_hidden_gem: {
    id: "community_hidden_gem",
    name: "Hidden Gem Hunter",
    description: "Review 5 underrated spots",
    pngPath: "/badges/039-gem.png",
    lucideIcon: Gem,
    badgeGroup: "community",
  },
  community_fun_storyteller: {
    id: "community_fun_storyteller",
    name: "Lens Legend",
    description: "Reviews + photos + 3 helpful votes",
    pngPath: "/badges/040-lens.png",
    lucideIcon: Aperture,
    badgeGroup: "community",
  },
  community_plug_of_year: {
    id: "community_plug_of_year",
    name: "Plug of the Year",
    description: "Discover 5 places before anyone else",
    pngPath: "/badges/012-expertise.png",
    lucideIcon: Medal,
    badgeGroup: "community",
  },
};

/**
 * Get badge mapping by ID
 */
export function getBadgeMapping(badgeId: string): BadgeMapping | undefined {
  return BADGE_MAPPINGS[badgeId];
}

/**
 * Get PNG path for a badge ID
 */
export function getBadgePngPath(badgeId: string): string {
  const mapping = BADGE_MAPPINGS[badgeId];
  return mapping?.pngPath || "/badges/012-expertise.png"; // Default fallback
}

/**
 * Get Lucide icon for a badge ID
 */
export function getBadgeLucideIcon(badgeId: string): LucideIcon {
  const mapping = BADGE_MAPPINGS[badgeId];
  return mapping?.lucideIcon || Award; // Default fallback
}

/**
 * Get all badges by group
 */
export function getBadgesByGroup(
  group: "explorer" | "specialist" | "milestone" | "community"
): BadgeMapping[] {
  return Object.values(BADGE_MAPPINGS).filter((b) => b.badgeGroup === group);
}

/**
 * Get all specialist badges for a specific category
 */
export function getSpecialistBadgesByCategory(
  categoryKey: string
): BadgeMapping[] {
  return Object.values(BADGE_MAPPINGS).filter(
    (b) => b.badgeGroup === "specialist" && b.categoryKey === categoryKey
  );
}
