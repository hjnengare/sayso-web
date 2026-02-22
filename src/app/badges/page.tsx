"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { m } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  Compass, 
  Target, 
  Trophy, 
  Users, 
  Sparkles,
  Star,
  Search,
  X
} from "lucide-react";
import Footer from "../components/Footer/Footer";
import { BADGE_MAPPINGS, type BadgeMapping } from "../lib/badgeMappings";
import { useAuth } from "../contexts/AuthContext";
import { useIsDesktop } from "../hooks/useIsDesktop";

// Badge descriptions and how to earn them
const BADGE_DETAILS: Record<string, { description: string; howToEarn: string }> = {
  // Explorer Badges
  explorer_dabbler: {
    description: "You're dipping your toes into different categories, exploring what the city has to offer.",
    howToEarn: "Review businesses in 2 different categories",
  },
  explorer_newbie_nomad: {
    description: "A curious soul just starting their journey of discovery across the city.",
    howToEarn: "Review businesses in 3 different categories",
  },
  explorer_curiosity_captain: {
    description: "Leading the way with an insatiable curiosity for new experiences.",
    howToEarn: "Review businesses in 5 different categories",
  },
  explorer_variety_voyager: {
    description: "Your diverse taste takes you on adventures across many different worlds.",
    howToEarn: "Review businesses in 7 different categories",
  },
  explorer_full_circle: {
    description: "You've come full circle, experiencing everything the city has to offer.",
    howToEarn: "Review businesses in all available categories",
  },

  // Food & Drink Specialists
  specialist_food_taste_tester: {
    description: "Your palate is your guide as you sample the culinary landscape.",
    howToEarn: "Review 3 Food & Drink businesses",
  },
  specialist_food_flavour_finder: {
    description: "You have a knack for discovering delicious hidden gems.",
    howToEarn: "Review 5 Food & Drink businesses",
  },
  specialist_food_foodie_boss: {
    description: "The ultimate authority on all things food in your city.",
    howToEarn: "Review 10 Food & Drink businesses",
  },
  specialist_food_coffee_connoisseur: {
    description: "From espresso to cold brew, you know your beans.",
    howToEarn: "Review 5 coffee shops or cafés",
  },
  specialist_food_dessert_detective: {
    description: "On a never-ending quest for the perfect sweet treat.",
    howToEarn: "Review 5 dessert or bakery spots",
  },
  specialist_food_brunch_enthusiast: {
    description: "Weekend mornings are made for exploring brunch menus.",
    howToEarn: "Review 5 brunch spots",
  },

  // Beauty & Wellness Specialists
  specialist_beauty_glow_getter: {
    description: "Always on the hunt for that perfect glow-up experience.",
    howToEarn: "Review 3 Beauty & Wellness businesses",
  },
  specialist_beauty_self_care_superstar: {
    description: "Self-care isn't just a trend for you, it's a lifestyle.",
    howToEarn: "Review 5 Beauty & Wellness businesses",
  },
  specialist_beauty_beauty_boss: {
    description: "The go-to expert for all beauty recommendations.",
    howToEarn: "Review 10 Beauty & Wellness businesses",
  },
  specialist_beauty_cuticle_queen: {
    description: "Nails always on point, and you know the best spots for it.",
    howToEarn: "Review 5 nail salons",
  },
  specialist_beauty_mane_lover: {
    description: "Your hair game is strong and you share the best stylists.",
    howToEarn: "Review 5 hair salons",
  },
  specialist_beauty_serenity_seeker: {
    description: "Finding peace and wellness wherever you go.",
    howToEarn: "Review 5 spas or wellness centers",
  },

  // Arts & Culture Specialists
  specialist_arts_heritage_hunter: {
    description: "Preserving and celebrating our rich cultural heritage.",
    howToEarn: "Review 3 Arts & Culture venues",
  },
  specialist_arts_local_lore_seeker: {
    description: "Passionate about local history and stories.",
    howToEarn: "Review 5 Arts & Culture venues",
  },
  specialist_arts_culture_master: {
    description: "A true connoisseur of arts and cultural experiences.",
    howToEarn: "Review 10 Arts & Culture venues",
  },
  specialist_arts_curtain_chaser: {
    description: "Never miss a show, from theater to live performances.",
    howToEarn: "Review 5 theaters or performance venues",
  },
  specialist_arts_canvas_collector: {
    description: "Art galleries and exhibitions are your happy place.",
    howToEarn: "Review 5 art galleries or museums",
  },
  specialist_arts_cinephile: {
    description: "From blockbusters to indie films, cinema is your passion.",
    howToEarn: "Review 5 cinemas or film venues",
  },

  // Outdoors & Adventure Specialists
  specialist_outdoors_nature_nomad: {
    description: "At home in nature, always seeking the next outdoor escape.",
    howToEarn: "Review 3 Outdoor & Adventure spots",
  },
  specialist_outdoors_thrill_seeker: {
    description: "Adrenaline is your fuel for adventure.",
    howToEarn: "Review 5 adventure or extreme sports venues",
  },
  specialist_outdoors_adventure_voyager: {
    description: "Every weekend is an opportunity for a new adventure.",
    howToEarn: "Review 10 Outdoor & Adventure spots",
  },
  specialist_outdoors_trail_tamer: {
    description: "Hiking trails don't stand a chance against you.",
    howToEarn: "Review 5 hiking trails or nature reserves",
  },
  specialist_outdoors_beach_bum: {
    description: "Sand between your toes, waves in your soul.",
    howToEarn: "Review 5 beaches or coastal spots",
  },
  specialist_outdoors_botanical_buff: {
    description: "Gardens and green spaces bring you joy.",
    howToEarn: "Review 5 gardens or botanical venues",
  },
  specialist_outdoors_daredevil: {
    description: "Fear is just another word for excitement.",
    howToEarn: "Review 7 extreme adventure activities",
  },

  // Shopping & Lifestyle Specialists
  specialist_shopping_retail_royalty: {
    description: "Shopping is an art form, and you've mastered it.",
    howToEarn: "Review 3 Shopping & Lifestyle businesses",
  },
  specialist_shopping_shopaholic: {
    description: "Retail therapy? You're the therapist.",
    howToEarn: "Review 5 Shopping & Lifestyle businesses",
  },
  specialist_shopping_style_spotter: {
    description: "Always ahead of the trends, sharing the best finds.",
    howToEarn: "Review 10 fashion or boutique stores",
  },
  specialist_shopping_gadget_goblin: {
    description: "Tech and gadgets are your playground.",
    howToEarn: "Review 5 electronics or tech stores",
  },
  specialist_shopping_baddie_on_budget: {
    description: "Looking fabulous doesn't have to break the bank.",
    howToEarn: "Review 5 budget-friendly or thrift stores",
  },

  // Family & Pets Specialists
  specialist_family_quality_time_seeker: {
    description: "Family time is precious, and you know the best spots for it.",
    howToEarn: "Review 3 Family & Pets friendly venues",
  },
  specialist_family_bonding_buff: {
    description: "Creating memories with loved ones is your specialty.",
    howToEarn: "Review 5 Family & Pets friendly venues",
  },
  specialist_family_playtime_pro: {
    description: "Expert at finding fun for the whole family.",
    howToEarn: "Review 10 Family & Pets friendly venues",
  },
  specialist_family_care_companion: {
    description: "Caring for family is what drives your recommendations.",
    howToEarn: "Review 5 family care or childcare services",
  },
  specialist_family_play_paws: {
    description: "Your fur babies deserve the best, and you find it.",
    howToEarn: "Review 5 pet-friendly or pet service venues",
  },
  specialist_family_friendly_spaces_finder: {
    description: "Always scouting for the most welcoming family spots.",
    howToEarn: "Review 7 kid-friendly venues",
  },

  // Experiences & Entertainment Specialists
  specialist_experiences_memory_maker: {
    description: "Every experience is a chance to create lasting memories.",
    howToEarn: "Review 3 Experiences & Entertainment venues",
  },
  specialist_experiences_curiosity_cruiser: {
    description: "Curiosity drives you to try new and unique experiences.",
    howToEarn: "Review 5 Experiences & Entertainment venues",
  },
  specialist_experiences_vibe_voyager: {
    description: "Always seeking the perfect atmosphere and vibe.",
    howToEarn: "Review 10 Experiences & Entertainment venues",
  },
  specialist_experiences_beat_chaser: {
    description: "Music moves you, and you know the best live venues.",
    howToEarn: "Review 5 music venues or clubs",
  },
  specialist_experiences_show_goer: {
    description: "Never miss a great show or performance.",
    howToEarn: "Review 5 entertainment shows or events",
  },
  specialist_experiences_weekend_warrior: {
    description: "Weekends are for making the most of every moment.",
    howToEarn: "Review 7 weekend activity spots",
  },

  // Professional Services Specialists
  specialist_services_service_scout: {
    description: "Finding reliable professional services is your forte.",
    howToEarn: "Review 3 Professional Services",
  },
  specialist_services_solution_seeker: {
    description: "Always finding the right solution for every need.",
    howToEarn: "Review 5 Professional Services",
  },
  specialist_services_service_pro: {
    description: "The trusted expert for professional service recommendations.",
    howToEarn: "Review 10 Professional Services",
  },
  specialist_services_fix_it_fairy: {
    description: "Know the best repair and maintenance services around.",
    howToEarn: "Review 5 repair or maintenance services",
  },
  specialist_services_money_minded: {
    description: "Financial wisdom guides your service recommendations.",
    howToEarn: "Review 5 financial or accounting services",
  },
  specialist_services_home_helper: {
    description: "Home services? You've got the best contacts.",
    howToEarn: "Review 5 home services or contractors",
  },

  // Milestone Badges
  milestone_new_voice: {
    description: "Your voice matters! Welcome to the community.",
    howToEarn: "Write your first review",
  },
  milestone_rookie_reviewer: {
    description: "You're getting the hang of this reviewing thing.",
    howToEarn: "Write 5 reviews",
  },
  milestone_level_up: {
    description: "Your reviewing skills are growing stronger.",
    howToEarn: "Write 10 reviews",
  },
  milestone_review_machine: {
    description: "Reviews flow from you like a well-oiled machine.",
    howToEarn: "Write 25 reviews",
  },
  milestone_century_club: {
    description: "An elite club of dedicated reviewers. Welcome!",
    howToEarn: "Write 100 reviews",
  },
  milestone_picture_pioneer: {
    description: "A picture says a thousand words, and you're starting to speak.",
    howToEarn: "Upload your first photo with a review",
  },
  milestone_snapshot_superstar: {
    description: "Your photos bring reviews to life.",
    howToEarn: "Upload 25 photos with reviews",
  },
  milestone_helpful_honeybee: {
    description: "Your reviews help others make great decisions.",
    howToEarn: "Receive 10 helpful votes on your reviews",
  },
  milestone_consistency_star: {
    description: "Consistent quality is your superpower.",
    howToEarn: "Review consistently for 4 weeks",
  },
  milestone_streak_spark: {
    description: "You're on fire! Keep that reviewing streak going.",
    howToEarn: "Maintain a 7-day reviewing streak",
  },

  // Community Badges
  community_early_birdie: {
    description: "You were here from the beginning, helping build our community.",
    howToEarn: "Join Sayso during the early access period",
  },
  community_community_helper: {
    description: "Your helpful nature makes this community stronger.",
    howToEarn: "Help 10 community members with their questions",
  },
  community_trend_starter: {
    description: "You set the trends others follow.",
    howToEarn: "Be the first to review a business that becomes popular",
  },
  community_columbus: {
    description: "Discovering uncharted territory, one business at a time.",
    howToEarn: "Be the first to review 5 new businesses",
  },
  community_loyal_one: {
    description: "Loyalty runs deep. You keep coming back to your favorites.",
    howToEarn: "Review the same business multiple times over 6 months",
  },
  community_neighbourhood_plug: {
    description: "The local expert everyone turns to for recommendations.",
    howToEarn: "Review 15 businesses in your neighborhood",
  },
  community_hidden_gem_hunter: {
    description: "You have a gift for finding hidden treasures others miss.",
    howToEarn: "Discover and review 5 lesser-known businesses",
  },
  community_lens_legend: {
    description: "Your photography skills elevate the entire platform.",
    howToEarn: "Upload 50 high-quality photos",
  },
  community_plug_of_year: {
    description: "The ultimate community contributor. A true legend!",
    howToEarn: "Be recognized as top contributor of the year",
  },
};

// Category metadata
const CATEGORY_META = {
  explorer: {
    title: "Explorer Badges",
    subtitle: "Venture into the unknown",
    description: "Earned by reviewing businesses across different categories. The more diverse your exploration, the more explorer badges you unlock.",
    icon: Compass,
    gradient: "from-emerald-500/20 to-teal-500/20",
    accentColor: "text-emerald-600",
    borderColor: "border-emerald-500/30",
  },
  specialist: {
    title: "Specialist Badges",
    subtitle: "Master your passions",
    description: "Become an expert in specific categories. Deep knowledge in your favorite areas earns you specialist recognition.",
    icon: Target,
    gradient: "from-sage/20 to-sage/10",
    accentColor: "text-sage",
    borderColor: "border-sage/30",
  },
  milestone: {
    title: "Milestone Badges",
    subtitle: "Celebrate your journey",
    description: "Mark your achievements as you grow with Sayso. Every review, photo, and helpful action counts toward your milestones.",
    icon: Trophy,
    gradient: "from-amber-500/20 to-yellow-500/20",
    accentColor: "text-amber-600",
    borderColor: "border-amber-500/30",
  },
  community: {
    title: "Community Badges",
    subtitle: "Connect and inspire",
    description: "Recognition for building and strengthening our community. Your contributions make Sayso better for everyone.",
    icon: Users,
    gradient: "from-coral/20 to-rose-500/20",
    accentColor: "text-coral",
    borderColor: "border-coral/30",
  },
};

// Specialist subcategories
const SPECIALIST_CATEGORIES = {
  "food-drink": { title: "Food & Drink", emoji: "🍽️" },
  "beauty-wellness": { title: "Beauty & Wellness", emoji: "✨" },
  "arts-culture": { title: "Arts & Culture", emoji: "🎭" },
  "outdoors-adventure": { title: "Outdoors & Adventure", emoji: "🏔️" },
  "shopping-lifestyle": { title: "Shopping & Lifestyle", emoji: "🛍️" },
  "family-pets": { title: "Family & Pets", emoji: "👨‍👩‍👧" },
  "experiences-entertainment": { title: "Experiences & Entertainment", emoji: "🎉" },
  "professional-services": { title: "Professional Services", emoji: "💼" },
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// Badge Card Component
function BadgeCard({ badge, index }: { badge: BadgeMapping; index: number }) {
  const isDesktop = useIsDesktop();
  const details = BADGE_DETAILS[badge.id];
  
  return (
    <m.div
      variants={isDesktop ? itemVariants : undefined}
      initial={isDesktop ? "hidden" : false}
      animate={isDesktop ? "visible" : undefined}
      className="group relative bg-white rounded-2xl border border-black/5 shadow-premium hover:shadow-premiumHover transition-all duration-300 overflow-hidden"
    >
      {/* Card Content */}
      <div className="p-5">
        {/* Badge Image */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-sage/10 to-sage/5 rounded-full" />
          <Image
            src={badge.pngPath}
            alt={badge.name}
            fill
            className="object-contain p-2 group-hover:scale-110 transition-transform duration-300"
          />
        </div>

        {/* Badge Name */}
        <h3 
          className="text-lg font-semibold text-charcoal text-center mb-2"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          {badge.name}
        </h3>

        {/* Description */}
        <p 
          className="text-sm text-charcoal/70 text-center mb-4 leading-relaxed min-h-[3rem]"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          {details?.description || "A special badge recognizing your contributions."}
        </p>

        {/* How to Earn */}
        <div className="bg-card-bg/5 rounded-xl px-4 py-3 border border-sage/10">
          <p 
            className="text-xs font-medium text-sage uppercase tracking-wide mb-1"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            How to earn
          </p>
          <p 
            className="text-sm text-charcoal/80"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {details?.howToEarn || "Keep exploring and contributing!"}
          </p>
        </div>
      </div>

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-sage/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </m.div>
  );
}

// Section Component
function BadgeSection({ 
  groupKey, 
  badges 
}: { 
  groupKey: "explorer" | "specialist" | "milestone" | "community";
  badges: BadgeMapping[];
}) {
  const isDesktop = useIsDesktop();
  const meta = CATEGORY_META[groupKey];
  const IconComponent = meta.icon;

  // Group specialist badges by category
  const groupedBadges = useMemo(() => {
    if (groupKey !== "specialist") return { all: badges };
    
    const groups: Record<string, BadgeMapping[]> = {};
    badges.forEach(badge => {
      const key = badge.categoryKey || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(badge);
    });
    return groups;
  }, [badges, groupKey]);

  return (
    <section className="mb-16 sm:mb-24">
      {/* Section Header */}
      {isDesktop ? (
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8 sm:mb-12"
      >
        <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r ${meta.gradient} border ${meta.borderColor} mb-4`}>
          <IconComponent className={`w-5 h-5 ${meta.accentColor}`} />
          <span 
            className={`text-sm font-semibold ${meta.accentColor}`}
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {meta.subtitle}
          </span>
        </div>
        <h2 
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-3"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          {meta.title}
        </h2>
        <p 
          className="text-base sm:text-lg text-charcoal/70 max-w-2xl"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          {meta.description}
        </p>
      </m.div>
      ) : (
      <div className="mb-8 sm:mb-12">
        <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r ${meta.gradient} border ${meta.borderColor} mb-4`}>
          <IconComponent className={`w-5 h-5 ${meta.accentColor}`} />
          <span 
            className={`text-sm font-semibold ${meta.accentColor}`}
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {meta.subtitle}
          </span>
        </div>
        <h2 
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-3"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          {meta.title}
        </h2>
        <p 
          className="text-base sm:text-lg text-charcoal/70 max-w-2xl"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          {meta.description}
        </p>
      </div>
      )}

      {/* Badge Grid */}
      {groupKey === "specialist" ? (
        // Specialist badges grouped by category
        <div className="space-y-12">
          {Object.entries(groupedBadges).map(([categoryKey, categoryBadges]) => {
            const categoryMeta = SPECIALIST_CATEGORIES[categoryKey as keyof typeof SPECIALIST_CATEGORIES];
            if (!categoryMeta) return null;
            
            return (
              <div key={categoryKey}>
                {isDesktop ? (
                  <m.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3 mb-6"
                  >
                    <span className="text-2xl">{categoryMeta.emoji}</span>
                    <h3 
                      className="text-xl font-semibold text-charcoal"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                      {categoryMeta.title}
                    </h3>
                    <div className="flex-1 h-px bg-charcoal/10" />
                  </m.div>
                ) : (
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-2xl">{categoryMeta.emoji}</span>
                    <h3 
                      className="text-xl font-semibold text-charcoal"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                      {categoryMeta.title}
                    </h3>
                    <div className="flex-1 h-px bg-charcoal/10" />
                  </div>
                )}
                {isDesktop ? (
                  <m.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                  >
                    {categoryBadges.map((badge, index) => (
                      <BadgeCard key={badge.id} badge={badge} index={index} />
                    ))}
                  </m.div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {categoryBadges.map((badge, index) => (
                      <BadgeCard key={badge.id} badge={badge} index={index} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : isDesktop ? (
        // Other badge groups (desktop: animated)
        <m.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
        >
          {badges.map((badge, index) => (
            <BadgeCard key={badge.id} badge={badge} index={index} />
          ))}
        </m.div>
      ) : (
        // Other badge groups (mobile: no animation)
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {badges.map((badge, index) => (
            <BadgeCard key={badge.id} badge={badge} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function BadgesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const discoverBusinessesHref = user ? "/for-you" : "/home";
  const [searchQuery, setSearchQuery] = useState("");

  // Group badges by category
  const badgesByGroup = useMemo(() => {
    const groups: Record<string, BadgeMapping[]> = {
      explorer: [],
      specialist: [],
      milestone: [],
      community: [],
    };

    Object.values(BADGE_MAPPINGS).forEach(badge => {
      if (groups[badge.badgeGroup]) {
        groups[badge.badgeGroup].push(badge);
      }
    });

    return groups;
  }, []);

  // Filter badges by search
  const filteredBadges = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    return Object.values(BADGE_MAPPINGS).filter(badge => {
      const details = BADGE_DETAILS[badge.id];
      return (
        badge.name.toLowerCase().includes(query) ||
        details?.description?.toLowerCase().includes(query) ||
        details?.howToEarn?.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  return (
    <div className="min-h-dvh bg-off-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />

        <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-12 sm:pb-24">
          {/* Back Link */}
          <m.div
            initial={isDesktop ? { opacity: 0, x: -20 } : false}
            animate={isDesktop ? { opacity: 1, x: 0 } : undefined}
            transition={isDesktop ? { duration: 0.4 } : undefined}
          >
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/leaderboard");
                }
              }}
              className="inline-flex items-center gap-2 text-charcoal/70 hover:text-charcoal transition-colors mb-8 group"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Back to previous page</span>
            </button>
          </m.div>

          {/* Hero Content */}
          <div className="max-w-3xl">
            <m.div
              initial={isDesktop ? { opacity: 0, y: 20 } : false}
              animate={isDesktop ? { opacity: 1, y: 0 } : undefined}
              transition={isDesktop ? { duration: 0.6, delay: 0.1 } : undefined}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-sage/20 shadow-sm mb-6"
            >
              <Sparkles className="w-4 h-4 text-sage" />
              <span 
                className="text-sm font-medium text-charcoal"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {Object.keys(BADGE_MAPPINGS).length} Badges to Collect
              </span>
            </m.div>

            <m.h1
              initial={isDesktop ? { opacity: 0, y: 20 } : false}
              animate={isDesktop ? { opacity: 1, y: 0 } : undefined}
              transition={isDesktop ? { duration: 0.6, delay: 0.2 } : undefined}
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-charcoal mb-6 leading-tight"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Earn Badges.<br />
              <span className="text-sage">Show Your Expertise.</span>
            </m.h1>

            <m.p
              initial={isDesktop ? { opacity: 0, y: 20 } : false}
              animate={isDesktop ? { opacity: 1, y: 0 } : undefined}
              transition={isDesktop ? { duration: 0.6, delay: 0.3 } : undefined}
              className="text-lg sm:text-xl text-charcoal/70 mb-8 leading-relaxed"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Every review, photo, and helpful action earns you recognition. Collect badges that showcase your unique journey and expertise across Cape Town's best local businesses.
            </m.p>

            {/* Search */}
            <m.div
              initial={isDesktop ? { opacity: 0, y: 20 } : false}
              animate={isDesktop ? { opacity: 1, y: 0 } : undefined}
              transition={isDesktop ? { duration: 0.6, delay: 0.4 } : undefined}
              className="relative max-w-md"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
              <input
                type="text"
                placeholder="Search badges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 rounded-full bg-white border border-charcoal/10 shadow-sm focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-all text-charcoal placeholder:text-charcoal/40"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-charcoal/5 transition-colors"
                >
                  <X className="w-4 h-4 text-charcoal/40" />
                </button>
              )}
            </m.div>
          </div>

          {/* Decorative Badges */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block">
            <m.div
              initial={isDesktop ? { opacity: 0, scale: 0.8, rotate: -10 } : false}
              animate={isDesktop ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
              transition={isDesktop ? { duration: 0.8, delay: 0.5 } : undefined}
              className="relative"
            >
              <div className="absolute -inset-4 bg-white/50 backdrop-blur-xl rounded-3xl shadow-lg" />
              <div className="relative grid grid-cols-3 gap-3 p-4">
                {[
                  "/badges/042-test.png",
                  "/badges/030-honeybee.png",
                  "/badges/039-gem.png",
                  "/badges/049-leadership.png",
                  "/badges/066-skydiving.png",
                  "/badges/035-sunglasses.png",
                ].map((src, i) => (
                  <m.div
                    key={src}
                    initial={isDesktop ? { opacity: 0, y: 20 } : false}
                    animate={isDesktop ? { opacity: 1, y: 0 } : undefined}
                    transition={isDesktop ? { delay: 0.6 + i * 0.1 } : undefined}
                    className="w-16 h-16 relative"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-contain"
                    />
                  </m.div>
                ))}
              </div>
            </m.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        {/* Search Results */}
        {filteredBadges ? (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 
                className="text-xl sm:text-2xl font-semibold text-charcoal"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {filteredBadges.length} {filteredBadges.length === 1 ? 'badge' : 'badges'} found
              </h2>
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-sage hover:text-sage/80 font-medium transition-colors"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Clear search
              </button>
            </div>
            {filteredBadges.length > 0 ? (
              isDesktop ? (
                <m.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                >
                  {filteredBadges.map((badge, index) => (
                    <BadgeCard key={badge.id} badge={badge} index={index} />
                  ))}
                </m.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredBadges.map((badge, index) => (
                    <BadgeCard key={badge.id} badge={badge} index={index} />
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-16">
                <p className="text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  No badges match your search. Try a different term.
                </p>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Badge Sections */}
            <BadgeSection groupKey="explorer" badges={badgesByGroup.explorer} />
            <BadgeSection groupKey="specialist" badges={badgesByGroup.specialist} />
            <BadgeSection groupKey="milestone" badges={badgesByGroup.milestone} />
            <BadgeSection groupKey="community" badges={badgesByGroup.community} />
          </>
        )}

        {/* CTA Section */}
        <m.section
          initial={isDesktop ? { opacity: 0, y: 40 } : false}
          whileInView={isDesktop ? { opacity: 1, y: 0 } : undefined}
          viewport={isDesktop ? { once: true } : undefined}
          transition={isDesktop ? { duration: 0.6 } : undefined}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sage to-sage/80 p-8 sm:p-12 md:p-16 text-center"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_white_0%,_transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_white_0%,_transparent_50%)]" />
          </div>

          <div className="relative z-10">
            <Star className="w-12 h-12 text-white/80 mx-auto mb-6" />
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Ready to Start Collecting?
            </h2>
            <p 
              className="text-lg text-white/80 mb-8 max-w-xl mx-auto"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Every badge tells a story. Begin your journey by sharing your experiences at local businesses.
            </p>
            <Link
              href={discoverBusinessesHref}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-sage font-semibold hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              <span>Discover Businesses</span>
              <Sparkles className="w-5 h-5" />
            </Link>
          </div>
        </m.section>
      </main>

      <Footer />
    </div>
  );
}
