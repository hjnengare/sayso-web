/**
 * Badge Mappings - Maps badge IDs to PNG images and Lucide icons
 * Source of truth: grouped by badge category per AC requirements
 *
 * PNG images are stored in /public/badges/
 * Lucide icons are used for compact display on review cards
 */

import {
  Target,
  Compass,
  Globe,
  Award,
  TrendingUp,
  Utensils,
  Search,
  Crown,
  Coffee,
  Cake,
  Croissant,
  Sparkles,
  Heart,
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
  pngPath: string;
  lucideIcon: LucideIcon;
  badgeGroup: "explorer" | "specialist" | "milestone" | "community";
  categoryKey?: string;
}

/**
 * Complete badge mappings organized by category
 * Each badge mapped to its PNG from /public/badges/
 */
export const BADGE_MAPPINGS: Record<string, BadgeMapping> = {
  // =============================================
  // A. CATEGORY EXPLORER BADGES
  // =============================================
  explorer_dabbler: {
    id: "explorer_dabbler",
    name: "The Dabbler",
    pngPath: "/badges/011-compass.png",
    lucideIcon: Compass,
    badgeGroup: "explorer",
  },
  explorer_newbie_nomad: {
    id: "explorer_newbie_nomad",
    name: "Newbie Nomad",
    pngPath: "/badges/036-binocular.png",
    lucideIcon: Search,
    badgeGroup: "explorer",
  },
  explorer_curiosity_captain: {
    id: "explorer_curiosity_captain",
    name: "Curiosity Captain",
    pngPath: "/badges/044-boat-captain-hat.png",
    lucideIcon: Ship,
    badgeGroup: "explorer",
  },
  explorer_variety_voyager: {
    id: "explorer_variety_voyager",
    name: "Variety Voyager",
    pngPath: "/badges/045-diversity.png",
    lucideIcon: Globe,
    badgeGroup: "explorer",
  },
  explorer_full_circle: {
    id: "explorer_full_circle",
    name: "Full Circle",
    pngPath: "/badges/043-choice.png",
    lucideIcon: Target,
    badgeGroup: "explorer",
  },

  // =============================================
  // B. CATEGORY SPECIALIST BADGES
  // =============================================

  // B.1 Food & Drink
  specialist_food_taste_tester: {
    id: "specialist_food_taste_tester",
    name: "Taste Tester",
    pngPath: "/badges/047-tongue.png",
    lucideIcon: Utensils,
    badgeGroup: "specialist",
    categoryKey: "food-drink",
  },
  specialist_food_flavour_finder: {
    id: "specialist_food_flavour_finder",
    name: "Flavour Finder",
    pngPath: "/badges/051-searcher.png",
    lucideIcon: Search,
    badgeGroup: "specialist",
    categoryKey: "food-drink",
  },
  specialist_food_foodie_boss: {
    id: "specialist_food_foodie_boss",
    name: "Foodie Boss",
    pngPath: "/badges/049-leadership.png",
    lucideIcon: Crown,
    badgeGroup: "specialist",
    categoryKey: "food-drink",
  },
  specialist_food_coffee_connoisseur: {
    id: "specialist_food_coffee_connoisseur",
    name: "Coffee Connoisseur",
    pngPath: "/badges/050-coffee-bean.png",
    lucideIcon: Coffee,
    badgeGroup: "specialist",
    categoryKey: "food-drink",
  },
  specialist_food_dessert_detective: {
    id: "specialist_food_dessert_detective",
    name: "Dessert Detective",
    pngPath: "/badges/052-croissant.png",
    lucideIcon: Cake,
    badgeGroup: "specialist",
    categoryKey: "food-drink",
  },
  specialist_food_brunch_enthusiast: {
    id: "specialist_food_brunch_enthusiast",
    name: "Brunch Enthusiast",
    pngPath: "/badges/048-extract.png",
    lucideIcon: Croissant,
    badgeGroup: "specialist",
    categoryKey: "food-drink",
  },

  // B.2 Beauty & Wellness
  specialist_beauty_glow_getter: {
    id: "specialist_beauty_glow_getter",
    name: "Glow Getter",
    pngPath: "/badges/053-woman.png",
    lucideIcon: Sparkles,
    badgeGroup: "specialist",
    categoryKey: "beauty-wellness",
  },
  specialist_beauty_self_care_superstar: {
    id: "specialist_beauty_self_care_superstar",
    name: "Self-Care Superstar",
    pngPath: "/badges/054-self-love.png",
    lucideIcon: Heart,
    badgeGroup: "specialist",
    categoryKey: "beauty-wellness",
  },
  specialist_beauty_beauty_boss: {
    id: "specialist_beauty_beauty_boss",
    name: "Beauty Boss",
    pngPath: "/badges/055-makeover.png",
    lucideIcon: Crown,
    badgeGroup: "specialist",
    categoryKey: "beauty-wellness",
  },
  specialist_beauty_cuticle_queen: {
    id: "specialist_beauty_cuticle_queen",
    name: "Cuticle Queen",
    pngPath: "/badges/056-nail-polish.png",
    lucideIcon: Scissors,
    badgeGroup: "specialist",
    categoryKey: "beauty-wellness",
  },
  specialist_beauty_mane_lover: {
    id: "specialist_beauty_mane_lover",
    name: "Mane Lover",
    pngPath: "/badges/057-lion.png",
    lucideIcon: Brush,
    badgeGroup: "specialist",
    categoryKey: "beauty-wellness",
  },
  specialist_beauty_serenity_seeker: {
    id: "specialist_beauty_serenity_seeker",
    name: "Serenity Seeker",
    pngPath: "/badges/018-peace.png",
    lucideIcon: Flower2,
    badgeGroup: "specialist",
    categoryKey: "beauty-wellness",
  },

  // B.3 Arts & Culture
  specialist_arts_heritage_hunter: {
    id: "specialist_arts_heritage_hunter",
    name: "Heritage Hunter",
    pngPath: "/badges/059-heritage.png",
    lucideIcon: Landmark,
    badgeGroup: "specialist",
    categoryKey: "arts-culture",
  },
  specialist_arts_local_lore_seeker: {
    id: "specialist_arts_local_lore_seeker",
    name: "Local Lore Seeker",
    pngPath: "/badges/060-history.png",
    lucideIcon: BookOpen,
    badgeGroup: "specialist",
    categoryKey: "arts-culture",
  },
  specialist_arts_culture_master: {
    id: "specialist_arts_culture_master",
    name: "Culture Master",
    pngPath: "/badges/061-master.png",
    lucideIcon: GraduationCap,
    badgeGroup: "specialist",
    categoryKey: "arts-culture",
  },
  specialist_arts_curtain_chaser: {
    id: "specialist_arts_curtain_chaser",
    name: "Curtain Chaser",
    pngPath: "/badges/014-mask.png",
    lucideIcon: Theater,
    badgeGroup: "specialist",
    categoryKey: "arts-culture",
  },
  specialist_arts_canvas_collector: {
    id: "specialist_arts_canvas_collector",
    name: "Canvas Collector",
    pngPath: "/badges/063-easel.png",
    lucideIcon: Palette,
    badgeGroup: "specialist",
    categoryKey: "arts-culture",
  },
  specialist_arts_cinephile: {
    id: "specialist_arts_cinephile",
    name: "Cinephile",
    pngPath: "/badges/064-clapperboard.png",
    lucideIcon: Film,
    badgeGroup: "specialist",
    categoryKey: "arts-culture",
  },

  // B.4 Outdoors & Adventure
  specialist_outdoors_nature_nomad: {
    id: "specialist_outdoors_nature_nomad",
    name: "Nature Nomad",
    pngPath: "/badges/065-seeding.png",
    lucideIcon: TreePine,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },
  specialist_outdoors_thrill_seeker: {
    id: "specialist_outdoors_thrill_seeker",
    name: "Thrill Seeker",
    pngPath: "/badges/066-skydiving.png",
    lucideIcon: Mountain,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },
  specialist_outdoors_adventure_voyager: {
    id: "specialist_outdoors_adventure_voyager",
    name: "Adventure Voyager",
    pngPath: "/badges/067-adventure-game.png",
    lucideIcon: Ship,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },
  specialist_outdoors_trail_tamer: {
    id: "specialist_outdoors_trail_tamer",
    name: "Trail Tamer",
    pngPath: "/badges/068-trail-marker.png",
    lucideIcon: MapPin,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },
  specialist_outdoors_beach_bum: {
    id: "specialist_outdoors_beach_bum",
    name: "Beach Bum",
    pngPath: "/badges/069-wave.png",
    lucideIcon: Waves,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },
  specialist_outdoors_botanical_buff: {
    id: "specialist_outdoors_botanical_buff",
    name: "Botanical Buff",
    pngPath: "/badges/070-botanical.png",
    lucideIcon: Leaf,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },
  specialist_outdoors_daredevil: {
    id: "specialist_outdoors_daredevil",
    name: "Daredevil",
    pngPath: "/badges/071-devil.png",
    lucideIcon: Flame,
    badgeGroup: "specialist",
    categoryKey: "outdoors-adventure",
  },

  // B.5 Shopping & Lifestyle
  specialist_shopping_retail_royalty: {
    id: "specialist_shopping_retail_royalty",
    name: "Retail Royalty",
    pngPath: "/badges/072-jewel.png",
    lucideIcon: ShoppingBag,
    badgeGroup: "specialist",
    categoryKey: "shopping-lifestyle",
  },
  specialist_shopping_shopaholic: {
    id: "specialist_shopping_shopaholic",
    name: "Shopaholic",
    pngPath: "/badges/073-shopaholic.png",
    lucideIcon: ShoppingCart,
    badgeGroup: "specialist",
    categoryKey: "shopping-lifestyle",
  },
  specialist_shopping_style_spotter: {
    id: "specialist_shopping_style_spotter",
    name: "Style Spotter",
    pngPath: "/badges/017-scarf.png",
    lucideIcon: Shirt,
    badgeGroup: "specialist",
    categoryKey: "shopping-lifestyle",
  },
  specialist_shopping_gadget_goblin: {
    id: "specialist_shopping_gadget_goblin",
    name: "Gadget Goblin",
    pngPath: "/badges/002-goblin.png",
    lucideIcon: Smartphone,
    badgeGroup: "specialist",
    categoryKey: "shopping-lifestyle",
  },
  specialist_shopping_baddie_on_budget: {
    id: "specialist_shopping_baddie_on_budget",
    name: "Baddie on a Budget",
    pngPath: "/badges/003-money-bag.png",
    lucideIcon: Wallet,
    badgeGroup: "specialist",
    categoryKey: "shopping-lifestyle",
  },

  // B.6 Family & Pets
  specialist_family_quality_time_seeker: {
    id: "specialist_family_quality_time_seeker",
    name: "Quality Time Seeker",
    pngPath: "/badges/004-waiting.png",
    lucideIcon: Baby,
    badgeGroup: "specialist",
    categoryKey: "family-pets",
  },
  specialist_family_bonding_buff: {
    id: "specialist_family_bonding_buff",
    name: "Bonding Buff",
    pngPath: "/badges/005-social-life.png",
    lucideIcon: Users,
    badgeGroup: "specialist",
    categoryKey: "family-pets",
  },
  specialist_family_playtime_pro: {
    id: "specialist_family_playtime_pro",
    name: "Playtime Pro",
    pngPath: "/badges/006-toy.png",
    lucideIcon: Gamepad2,
    badgeGroup: "specialist",
    categoryKey: "family-pets",
  },
  specialist_family_care_companion: {
    id: "specialist_family_care_companion",
    name: "Care Companion",
    pngPath: "/badges/008-baby.png",
    lucideIcon: Heart,
    badgeGroup: "specialist",
    categoryKey: "family-pets",
  },
  specialist_family_play_paws: {
    id: "specialist_family_play_paws",
    name: "Play & Paws",
    pngPath: "/badges/009-mouse.png",
    lucideIcon: PawPrint,
    badgeGroup: "specialist",
    categoryKey: "family-pets",
  },
  specialist_family_friendly_spaces_finder: {
    id: "specialist_family_friendly_spaces_finder",
    name: "Friendly Spaces Finder",
    pngPath: "/badges/010-confetti.png",
    lucideIcon: Smile,
    badgeGroup: "specialist",
    categoryKey: "family-pets",
  },

  // B.7 Experiences & Entertainment
  specialist_experiences_memory_maker: {
    id: "specialist_experiences_memory_maker",
    name: "Memory Maker",
    pngPath: "/badges/046-rec.png",
    lucideIcon: PartyPopper,
    badgeGroup: "specialist",
    categoryKey: "experiences-entertainment",
  },
  specialist_experiences_curiosity_cruiser: {
    id: "specialist_experiences_curiosity_cruiser",
    name: "Curiosity Cruiser",
    pngPath: "/badges/026-gears.png",
    lucideIcon: Compass,
    badgeGroup: "specialist",
    categoryKey: "experiences-entertainment",
  },
  specialist_experiences_vibe_voyager: {
    id: "specialist_experiences_vibe_voyager",
    name: "Vibe Voyager",
    pngPath: "/badges/021-mindset.png",
    lucideIcon: Sparkles,
    badgeGroup: "specialist",
    categoryKey: "experiences-entertainment",
  },
  specialist_experiences_beat_chaser: {
    id: "specialist_experiences_beat_chaser",
    name: "Beat Chaser",
    pngPath: "/badges/013-vinyl.png",
    lucideIcon: Music,
    badgeGroup: "specialist",
    categoryKey: "experiences-entertainment",
  },
  specialist_experiences_show_goer: {
    id: "specialist_experiences_show_goer",
    name: "Show Goer",
    pngPath: "/badges/062-decoration.png",
    lucideIcon: Clapperboard,
    badgeGroup: "specialist",
    categoryKey: "experiences-entertainment",
  },
  specialist_experiences_weekend_warrior: {
    id: "specialist_experiences_weekend_warrior",
    name: "Weekend Warrior",
    pngPath: "/badges/015-weekend.png",
    lucideIcon: Calendar,
    badgeGroup: "specialist",
    categoryKey: "experiences-entertainment",
  },

  // B.8 Professional Services
  specialist_services_service_scout: {
    id: "specialist_services_service_scout",
    name: "Service Scout",
    pngPath: "/badges/019-professional-services.png",
    lucideIcon: Briefcase,
    badgeGroup: "specialist",
    categoryKey: "professional-services",
  },
  specialist_services_solution_seeker: {
    id: "specialist_services_solution_seeker",
    name: "Solution Seeker",
    pngPath: "/badges/012-expertise.png",
    lucideIcon: Lightbulb,
    badgeGroup: "specialist",
    categoryKey: "professional-services",
  },
  specialist_services_service_pro: {
    id: "specialist_services_service_pro",
    name: "Service Pro",
    pngPath: "/badges/023-ai-technology.png",
    lucideIcon: Award,
    badgeGroup: "specialist",
    categoryKey: "professional-services",
  },
  specialist_services_fix_it_fairy: {
    id: "specialist_services_fix_it_fairy",
    name: "Fix-It Fairy",
    pngPath: "/badges/016-wrench.png",
    lucideIcon: Wrench,
    badgeGroup: "specialist",
    categoryKey: "professional-services",
  },
  specialist_services_money_minded: {
    id: "specialist_services_money_minded",
    name: "Money-Minded",
    pngPath: "/badges/001-accessory.png",
    lucideIcon: BadgeDollarSign,
    badgeGroup: "specialist",
    categoryKey: "professional-services",
  },
  specialist_services_home_helper: {
    id: "specialist_services_home_helper",
    name: "Home Helper",
    pngPath: "/badges/022-house.png",
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
    pngPath: "/badges/027-aniversary.png",
    lucideIcon: Megaphone,
    badgeGroup: "milestone",
  },
  milestone_rookie_reviewer: {
    id: "milestone_rookie_reviewer",
    name: "Rookie Reviewer",
    pngPath: "/badges/024-climbing-stairs.png",
    lucideIcon: BadgeCheck,
    badgeGroup: "milestone",
  },
  milestone_level_up: {
    id: "milestone_level_up",
    name: "Level Up!",
    pngPath: "/badges/025-level-up.png",
    lucideIcon: Gauge,
    badgeGroup: "milestone",
  },
  milestone_review_machine: {
    id: "milestone_review_machine",
    name: "Review Machine",
    pngPath: "/badges/041-no-connection.png",
    lucideIcon: Rocket,
    badgeGroup: "milestone",
  },
  milestone_century_club: {
    id: "milestone_century_club",
    name: "Century Club",
    pngPath: "/badges/042-test.png",
    lucideIcon: Trophy,
    badgeGroup: "milestone",
  },
  milestone_picture_pioneer: {
    id: "milestone_picture_pioneer",
    name: "Picture Pioneer",
    pngPath: "/badges/028-phone-camera.png",
    lucideIcon: Camera,
    badgeGroup: "milestone",
  },
  milestone_snapshot_superstar: {
    id: "milestone_snapshot_superstar",
    name: "Snapshot Superstar",
    pngPath: "/badges/029-camera.png",
    lucideIcon: Image,
    badgeGroup: "milestone",
  },
  milestone_helpful_honeybee: {
    id: "milestone_helpful_honeybee",
    name: "Helpful Honeybee",
    pngPath: "/badges/030-honeybee.png",
    lucideIcon: ThumbsUp,
    badgeGroup: "milestone",
  },
  milestone_consistency_star: {
    id: "milestone_consistency_star",
    name: "Consistency Star",
    pngPath: "/badges/031-star.png",
    lucideIcon: Star,
    badgeGroup: "milestone",
  },
  milestone_streak_spark: {
    id: "milestone_streak_spark",
    name: "Streak Spark",
    pngPath: "/badges/032-fire.png",
    lucideIcon: Zap,
    badgeGroup: "milestone",
  },

  // =============================================
  // D. COMMUNITY & PERSONALITY BADGES
  // =============================================
  community_early_birdie: {
    id: "community_early_birdie",
    name: "Early Birdie",
    pngPath: "/badges/033-early.png",
    lucideIcon: Bird,
    badgeGroup: "community",
  },
  community_community_helper: {
    id: "community_community_helper",
    name: "Community Helper",
    pngPath: "/badges/034-social-support.png",
    lucideIcon: HelpingHand,
    badgeGroup: "community",
  },
  community_trend_starter: {
    id: "community_trend_starter",
    name: "Trend Starter",
    pngPath: "/badges/035-sunglasses.png",
    lucideIcon: TrendingUp,
    badgeGroup: "community",
  },
  community_columbus: {
    id: "community_columbus",
    name: "Columbus",
    pngPath: "/badges/020-magic-wand.png",
    lucideIcon: Compass,
    badgeGroup: "community",
  },
  community_loyal_one: {
    id: "community_loyal_one",
    name: "The Loyal One",
    pngPath: "/badges/037-loyalty.png",
    lucideIcon: Repeat,
    badgeGroup: "community",
  },
  community_neighbourhood_plug: {
    id: "community_neighbourhood_plug",
    name: "Neighbourhood Plug",
    pngPath: "/badges/038-plug.png",
    lucideIcon: MapPinned,
    badgeGroup: "community",
  },
  community_hidden_gem_hunter: {
    id: "community_hidden_gem_hunter",
    name: "Hidden Gem Hunter",
    pngPath: "/badges/039-gem.png",
    lucideIcon: Gem,
    badgeGroup: "community",
  },
  community_lens_legend: {
    id: "community_lens_legend",
    name: "Lens Legend",
    pngPath: "/badges/040-lens.png",
    lucideIcon: Aperture,
    badgeGroup: "community",
  },
  community_plug_of_year: {
    id: "community_plug_of_year",
    name: "Plug of the Year",
    pngPath: "/badges/038-plug.png",
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
