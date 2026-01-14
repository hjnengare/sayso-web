"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { Review, Reviewer } from "../../data/communityHighlightsData";
import ProfilePicture from "./ProfilePicture";
import ReviewerStats from "./ReviewerStats";
import ReviewContent from "./ReviewContent";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import { motion, useReducedMotion } from "framer-motion";
import BadgePill, { BadgePillData } from "../Badges/BadgePill";

// Generate a unique color for each badge based on reviewer ID
// This ensures every badge has a different color
const getUniqueBadgeColor = (reviewerId: string, badgeType: string): string => {
  // Create a simple hash from the reviewer ID and badge type
  const combined = `${reviewerId}-${badgeType}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get a consistent index
  const index = Math.abs(hash) % 12;
  
  // Palette of distinct colors for variety
  const colorPalette = [
    'from-coral/20 to-coral/10',           // 0 - Coral
    'from-sage/20 to-sage/10',             // 1 - Sage
    'from-purple-400/20 to-purple-400/10', // 2 - Purple
    'from-blue-400/20 to-blue-400/10',     // 3 - Blue
    'from-pink-400/20 to-pink-400/10',     // 4 - Pink
    'from-yellow-400/20 to-yellow-400/10',  // 5 - Yellow
    'from-indigo-400/20 to-indigo-400/10', // 6 - Indigo
    'from-teal-400/20 to-teal-400/10',     // 7 - Teal
    'from-orange-400/20 to-orange-400/10', // 8 - Orange
    'from-rose-400/20 to-rose-400/10',     // 9 - Rose
    'from-cyan-400/20 to-cyan-400/10',     // 10 - Cyan
    'from-emerald-400/20 to-emerald-400/10', // 11 - Emerald
  ];
  
  return colorPalette[index];
};

// Get badge icon from Lucide React
const getBadgeIcon = (badgeType: string): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
  switch (badgeType) {
    case "top":
      return Trophy;
    case "verified":
      return CheckCircle;
    case "local":
      return MapPin;
    default:
      return Award;
  }
};

// Get trophy badge icon from Lucide React
const getTrophyBadgeIcon = (trophyType: string): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
  switch (trophyType) {
    case "gold":
      return Trophy;
    case "silver":
      return Award;
    case "bronze":
      return Award;
    case "rising-star":
      return Sparkles;
    case "community-favorite":
      return HeartIcon;
    default:
      return Trophy;
  }
};

// react-feather icons
import {
  User,
  Star,
  Users,
  Share2,
} from "react-feather";

// Lucide React icons for badges
import {
  Award,
  CheckCircle,
  MapPin,
  Trophy,
  Sparkles,
  Heart as HeartIcon,
} from "lucide-react";

interface ReviewerCardProps {
  review?: Review;
  reviewer?: Reviewer;
  latestReview?: Review;
  variant?: "reviewer" | "review";
  index?: number;
}

export default function ReviewerCard({
  review,
  reviewer,
  latestReview,
  variant = "review",
  index = 0,
}: ReviewerCardProps) {
  const reviewerData = reviewer || review?.reviewer;
  const idForSnap = useMemo(
    () => `reviewer-${reviewerData?.id}`,
    [reviewerData?.id]
  );
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(true);
  const [userBadges, setUserBadges] = useState<BadgePillData[]>([]);

  // Check if mobile for animation
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch user's badges (top 2 most relevant)
  useEffect(() => {
    if (!reviewerData?.id) return;

    async function fetchUserBadges() {
      try {
        const response = await fetch(`/api/badges/user?user_id=${reviewerData.id}`);
        if (response.ok) {
          const data = await response.json();
          // Get earned badges only
          const earnedBadges = (data.badges || [])
            .filter((b: any) => b.earned)
            .map((b: any) => ({
              id: b.id,
              name: b.name,
              icon_path: b.icon_path,
              badge_group: b.badge_group,
            }));

          // Prioritize: milestone > specialist > explorer > community
          const priorityOrder = ['milestone', 'specialist', 'explorer', 'community'];
          const sortedBadges = earnedBadges.sort((a: any, b: any) => {
            const aIndex = priorityOrder.indexOf(a.badge_group);
            const bIndex = priorityOrder.indexOf(b.badge_group);
            return aIndex - bIndex;
          });

          // Take top 2
          setUserBadges(sortedBadges.slice(0, 2));
        }
      } catch (err) {
        console.error('Error fetching user badges:', err);
      }
    }

    fetchUserBadges();
  }, [reviewerData?.id]);

  // Animation variants
  const cardInitial = prefersReducedMotion
    ? { opacity: 0 }
    : isMobile
    ? { opacity: 0 }
    : { opacity: 0, y: 40, x: index % 2 === 0 ? -20 : 20 };

  const cardAnimate = prefersReducedMotion
    ? { opacity: 1 }
    : isMobile
    ? { opacity: 1 }
    : { opacity: 1, y: 0, x: 0 };

  if (variant === "reviewer" || reviewer) {
    return (
      <motion.div
        id={idForSnap}
        className="snap-start snap-always w-full sm:w-[240px] flex-shrink-0"
        initial={cardInitial}
        whileInView={cardAnimate}
        viewport={{ amount: isMobile ? 0.1 : 0.2, once: false }}
        transition={{
          duration: prefersReducedMotion ? 0.2 : isMobile ? 0.4 : 0.5,
          delay: index * 0.05,
          ease: "easeOut",
        }}
      >
        <Link
          href={`/reviewer/${reviewerData?.id || ''}`}
          className="block"
        >
          <div
            className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl rounded-[20px] overflow-visible group cursor-pointer h-[240px] relative border border-white/60 ring-1 ring-white/30 shadow-md"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
          
          {/* Content */}
          <div className="relative z-10 p-2 h-full flex flex-col">
            {/* Header with small profile pic and rating */}
            <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-1.5">
                {!imgError && reviewerData?.profilePicture && reviewerData.profilePicture.trim() !== '' ? (
                  <div className="relative">
                    <Image
                      src={reviewerData.profilePicture}
                      alt={reviewerData?.name || "User avatar"}
                      width={32}
                      height={32}
                      className="w-8 h-8 object-cover rounded-full border-2 border-white ring-2 ring-white/50"
                      priority={false}
                      onError={() => setImgError(true)}
                    />
                    {/* Verified badge */}
                    {reviewerData?.badge === "verified" && (
                      <div className="absolute -right-0.5 -top-0.5 z-20">
                        <VerifiedBadge size="sm" />
                      </div>
                    )}
                    {/* Subtle glow for top reviewers */}
                    {reviewerData?.badge === "top" && (
                      <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-sm animate-pulse" />
                    )}
                  </div>
                ) : (
                  <div className="w-8 h-8 flex items-center justify-center bg-sage/20 text-sage rounded-full border-2 border-white ring-2 ring-white/50">
                    <User className="text-sage/70" size={14} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-charcoal group-hover:text-coral/90 truncate transition-colors duration-300" style={{ 
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
                    fontWeight: 700,
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    letterSpacing: '-0.01em',
                  }}>
                    {reviewerData?.name}
                  </h3>
                  <p className="text-sm sm:text-xs text-charcoal/70" style={{ 
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
                    fontWeight: 600,
                  }}>
                    {reviewerData?.location}
                  </p>
                </div>
              </div>

            </div>

            {/* Stats with micro-interaction */}
            <div className="mb-1">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-semibold text-charcoal flex items-center justify-center gap-1" style={{ 
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
                    fontWeight: 600,
                  }}>
                    <span>{reviewerData?.reviewCount}</span>
                    </div>
                  <div className="text-sm sm:text-xs text-charcoal/70" style={{ 
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
                    fontWeight: 600,
                  }}>Reviews</div>
                </div>
              </div>
            </div>

            {/* Latest Review Preview with fade-in effect */}
            {latestReview && (
              <div className="mb-1.5 mt-1 border-t border-white/20 pt-1.5">
                <div className="bg-gradient-to-br from-off-white/95 to-off-white/85 backdrop-blur-sm rounded-md px-2 py-1 border border-white/30">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Star className="w-3 h-3 fill-coral text-coral" />
                    <span className="font-urbanist text-[10px] text-charcoal/60" style={{ 
                      fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
                    }}>Latest Review</span>
                  </div>
                  <p className="font-urbanist text-sm sm:text-xs text-charcoal/80 leading-relaxed line-clamp-2 italic" style={{ 
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
                  }}>
                    "{latestReview.reviewText}"
                  </p>
                </div>
              </div>
            )}

            {/* Badges with entrance animation */}
            <div className="mt-auto flex items-center justify-between gap-2">
              {/* User's earned badges from badge system */}
              <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                {userBadges.map((badge) => (
                  <BadgePill key={badge.id} badge={badge} size="sm" />
                ))}
              </div>

              {/* Card Actions - always visible on mobile, slide-up on desktop */}
              <div className="flex gap-1.5 transition-all duration-500 ease-out md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 flex-shrink-0">
                <button
                  className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 w-11 h-11 sm:w-8 sm:h-8 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 active:scale-95 transition-all duration-300 touch-manipulation shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  aria-label="Follow"
                  title="Follow"
                >
                  <Users className="text-white w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        </Link>
      </motion.div>
    );
  }

  // --- REVIEW CARD VARIANT ---
  return (
    <motion.li 
      className="w-[calc(50vw-12px)] sm:w-auto sm:min-w-[213px] flex-shrink-0"
      initial={cardInitial}
      whileInView={cardAnimate}
      viewport={{ amount: isMobile ? 0.1 : 0.2, once: false }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : isMobile ? 0.4 : 0.5,
        delay: index * 0.05,
        ease: "easeOut",
      }}
    >
      <Link
        href={`/reviewer/${review?.reviewer?.id || ''}`}
        className="block"
      >
        <div
          className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl rounded-[20px] group cursor-pointer h-[187px] flex flex-col relative overflow-visible border border-white/60 ring-1 ring-white/30 shadow-md"
        >
        {/* Glass depth overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-off-white/8 via-transparent to-transparent pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none z-0" />
        <div className="flex items-start gap-1.5 mb-2 p-2">
          <div className="relative">
            <ProfilePicture
              src={review?.reviewer.profilePicture || ""}
              alt={review?.reviewer.name || ""}
              size="md"
              badge={review?.reviewer.badge}
            />
            {/* Verified badge for profile picture */}
            {review?.reviewer.badge === "verified" && (
              <div className="absolute -right-1 -top-1 z-20">
                <VerifiedBadge />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-charcoal group-hover:text-coral/90 truncate transition-colors duration-300" style={{ 
              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
              fontWeight: 700,
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              letterSpacing: '-0.01em',
            }}>
              {review?.reviewer.name}
            </h3>
            <ReviewerStats
              reviewCount={review?.reviewer.reviewCount || 0}
              location={review?.reviewer.location || ""}
            />
          </div>

          {/* Card Actions - always visible on mobile, slide-in on desktop */}
          <div className="absolute right-2 top-2 md:right-2 md:bottom-4 z-20 flex flex-row md:flex-col gap-1.5 md:gap-2 transition-all duration-500 ease-out md:translate-y-8 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
            <button
              className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 w-11 h-11 sm:w-8 sm:h-8 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 active:scale-95 transition-all duration-300 touch-manipulation"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              aria-label="Follow"
              title="Follow"
            >
              <Users className="text-white w-5 h-5 sm:w-4 sm:h-4" />
            </button>
            <button
              className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 w-11 h-11 sm:w-8 sm:h-8 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 active:scale-95 transition-all duration-300 touch-manipulation shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              aria-label="Share"
              title="Share"
            >
              <Share2 className="text-white w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* User's earned badges - shown below reviewer info */}
        {userBadges.length > 0 && (
          <div className="px-2 pb-2 flex items-center gap-1.5 flex-wrap">
            {userBadges.map((badge) => (
              <BadgePill key={badge.id} badge={badge} size="sm" />
            ))}
          </div>
        )}

        <ReviewContent
          businessName={review?.businessName || ""}
          businessType={review?.businessType || ""}
          reviewText={review?.reviewText || ""}
          date={review?.date || ""}
          likes={review?.likes || 0}
          images={review?.images}
        />
      </div>
      </Link>
    </motion.li>
  );
}
