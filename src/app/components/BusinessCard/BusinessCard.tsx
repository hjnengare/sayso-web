"use client";

import React, { useMemo, useState, useEffect, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Star, Edit, Share2, Bookmark, Info } from "react-feather";
import { Scissors, Coffee, UtensilsCrossed, Wine, Dumbbell, Activity, Heart, Book, ShoppingBag, Home, Briefcase, MapPin, Music, Film, Camera, Car, GraduationCap, CreditCard, Tag } from "lucide-react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import PercentileChip from "../PercentileChip/PercentileChip";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import OptimizedImage from "../Performance/OptimizedImage";
import Tooltip from "../Tooltip/Tooltip";
import { useSavedItems } from "../../contexts/SavedItemsContext";
import { useToast } from "../../contexts/ToastContext";
import { getCategoryPng, getCategoryPngFromLabels, isPngIcon } from "../../utils/categoryToPngMapping";
import { useUserHasReviewed } from "../../hooks/useReviews";

type Percentiles = {
  punctuality?: number;
  'cost-effectiveness'?: number;
  friendliness?: number;
  trustworthiness?: number;
};

type Business = {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  image_url?: string;
  uploaded_images?: string[]; // Array of image URLs from uploaded_images field
  alt: string;
  category: string;
  subInterestId?: string;
  subInterestLabel?: string;
  interestId?: string;
  location: string;
  rating?: number;
  totalRating?: number;
  reviews: number;
  badge?: string;
  href?: string;
  percentiles?: Percentiles;
  verified?: boolean;
  distance?: string;
  priceRange?: string;
  hasRating?: boolean;
  stats?: {
    average_rating: number;
  };
  description?: string;
  phone?: string;
  website?: string;
  address?: string;
  amenity?: string;
  tags?: string[];
};

const formatCategoryLabel = (value?: string) => {
  if (!value) return "Explore";
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

// Generate a unique color for each business based on its ID
// This ensures every business card icon has a different color
const getUniqueBusinessColor = (businessId: string): string => {
  // Create a simple hash from the business ID
  let hash = 0;
  for (let i = 0; i < businessId.length; i++) {
    const char = businessId.charCodeAt(i);
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

// Map categories to lucide-react icons
const getCategoryIcon = (category: string, subInterestId?: string, subInterestLabel?: string): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
  // Normalize category/label for matching
  const normalizedCategory = (category || '').toLowerCase();
  const normalizedSubInterest = (subInterestId || subInterestLabel || '').toLowerCase();
  const searchTerm = normalizedSubInterest || normalizedCategory;
  
  // Food & Drink
  if (searchTerm.includes('salon') || searchTerm.includes('hairdresser') || searchTerm.includes('nail')) {
    return Scissors;
  }
  if (searchTerm.includes('cafe') || searchTerm.includes('coffee')) {
    return Coffee;
  }
  if (searchTerm.includes('restaurant') || searchTerm.includes('dining') || searchTerm.includes('food')) {
    return UtensilsCrossed;
  }
  if (searchTerm.includes('bar') || searchTerm.includes('pub')) {
    return Wine;
  }
  
  // Beauty & Wellness
  if (searchTerm.includes('gym') || searchTerm.includes('fitness') || searchTerm.includes('workout')) {
    return Dumbbell;
  }
  if (searchTerm.includes('spa') || searchTerm.includes('wellness') || searchTerm.includes('massage')) {
    return Activity;
  }
  if (searchTerm.includes('health') || searchTerm.includes('medical')) {
    return Heart;
  }
  
  // Shopping
  if (searchTerm.includes('shop') || searchTerm.includes('store') || searchTerm.includes('retail') || searchTerm.includes('fashion') || searchTerm.includes('clothing')) {
    return ShoppingBag;
  }
  if (searchTerm.includes('book') || searchTerm.includes('library')) {
    return Book;
  }
  
  // Professional Services
  if (searchTerm.includes('education') || searchTerm.includes('school') || searchTerm.includes('learn')) {
    return GraduationCap;
  }
  if (searchTerm.includes('finance') || searchTerm.includes('bank') || searchTerm.includes('insurance')) {
    return CreditCard;
  }
  if (searchTerm.includes('business') || searchTerm.includes('office') || searchTerm.includes('professional')) {
    return Briefcase;
  }
  
  // Entertainment
  if (searchTerm.includes('music') || searchTerm.includes('concert') || searchTerm.includes('venue')) {
    return Music;
  }
  if (searchTerm.includes('movie') || searchTerm.includes('cinema') || searchTerm.includes('theater') || searchTerm.includes('theatre')) {
    return Film;
  }
  if (searchTerm.includes('art') || searchTerm.includes('gallery') || searchTerm.includes('museum')) {
    return Camera;
  }
  
  // Travel & Transport
  if (searchTerm.includes('travel') || searchTerm.includes('transport') || searchTerm.includes('hotel')) {
    return MapPin;
  }
  if (searchTerm.includes('car') || searchTerm.includes('auto') || searchTerm.includes('vehicle')) {
    return Car;
  }
  
  // Home & Living
  if (searchTerm.includes('home') || searchTerm.includes('decor') || searchTerm.includes('furniture')) {
    return Home;
  }
  
  // Default fallback
  return Tag;
};

function BusinessCard({
  business,
  hideStar = false,
  compact = false,
  inGrid = false,
  index = 0,
}: {
  business: Business;
  hideStar?: boolean;
  compact?: boolean;
  inGrid?: boolean;
  index?: number;
}) {
  const router = useRouter();
  const { toggleSavedItem, isItemSaved } = useSavedItems();
  const { showToast } = useToast();
  const { hasReviewed } = useUserHasReviewed(business.id);
  const idForSnap = useMemo(() => `business-${business.id}`, [business.id]);
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(true);

  const [imgError, setImgError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const infoPopupRef = useRef<HTMLDivElement>(null);

  // Check if mobile for animation
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use slug for SEO-friendly URLs, fallback to ID
  const businessIdentifier = business.slug || business.id;
  const reviewRoute = useMemo(() => `/business/${businessIdentifier}/review`, [businessIdentifier]);
  const businessProfileRoute = useMemo(() => `/business/${businessIdentifier}`, [businessIdentifier]);

  // Prefetch routes on mount
  useEffect(() => {
    router.prefetch(reviewRoute);
    router.prefetch(businessProfileRoute);
  }, [router, reviewRoute, businessProfileRoute]);

  // Prefetch on hover with debouncing
  const hoverTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Prefetch after a short delay to avoid prefetching on accidental hovers
    hoverTimeoutRef.current = setTimeout(() => {
      router.prefetch(businessProfileRoute);
      router.prefetch(reviewRoute);
    }, 100);
  };

  const handleMouseLeave = () => {
    // Clear timeout if user moves away before prefetch
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleCardClick = () => {
    router.push(businessProfileRoute);
  };

  const handleWriteReview = () => {
    if (!hasReviewed) {
      router.push(reviewRoute);
    }
  };

  const handleBookmark = async () => {
    const wasSaved = isItemSaved(business.id);
    const success = await toggleSavedItem(business.id);

    if (success) {
      // Toast notification is handled by SavedItemsContext
    }

    setShowInfoPopup(false);
  };

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}${businessProfileRoute}`;
      const shareText = `Check out ${business.name} on sayso!`;

      // Try Web Share API first (mobile/native apps)
      if (navigator.share && navigator.canShare && navigator.canShare({ title: business.name, text: shareText, url: shareUrl })) {
        try {
          await navigator.share({
            title: business.name,
            text: shareText,
            url: shareUrl,
          });
          showToast('Shared successfully!', 'success', 2000);
          setShowInfoPopup(false);
          return;
        } catch (shareError: any) {
          // If user cancelled, don't show error
          if (shareError.name === 'AbortError') {
            return;
          }
          // If share failed, fall through to clipboard
        }
      }

      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard!', 'success', 2000);

        // Show visual feedback on button
        const shareBtn = infoPopupRef.current?.querySelector('[data-share-btn]') as HTMLElement;
        if (shareBtn) {
          const originalText = shareBtn.getAttribute('aria-label');
          shareBtn.setAttribute('aria-label', 'Link copied!');
          setTimeout(() => {
            if (originalText) shareBtn.setAttribute('aria-label', originalText);
          }, 2000);
        }

        setShowInfoPopup(false);
      } catch (clipboardError) {
        // Clipboard API failed - show error
        showToast('Failed to copy link. Please copy manually.', 'sage', 3000);
        console.error('Clipboard error:', clipboardError);
      }
    } catch (error) {
      console.error('Share error:', error);
      showToast('Failed to share. Please try again.', 'sage', 3000);
    }
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoPopupRef.current && !infoPopupRef.current.contains(event.target as Node)) {
        const infoButton = (event.target as HTMLElement).closest('[data-info-button]');
        if (!infoButton) {
          setShowInfoPopup(false);
        }
      }
    };

    if (showInfoPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showInfoPopup]);

  // Image fallback logic
  const categoryKey = business.subInterestId || business.category || "default";
  const displayCategoryLabel =
    business.subInterestLabel || formatCategoryLabel(categoryKey);

  const getDisplayImage = useMemo(() => {
    // Priority 1: Check uploaded_images array (new source of truth)
    // First image in array is the primary/cover image
    if (business.uploaded_images && Array.isArray(business.uploaded_images) && business.uploaded_images.length > 0) {
      const firstImageUrl = business.uploaded_images[0];
      
      if (firstImageUrl && 
          typeof firstImageUrl === 'string' && 
          firstImageUrl.trim() !== '' &&
          !isPngIcon(firstImageUrl) &&
          !firstImageUrl.includes('/png/')) {
        return { image: firstImageUrl, isPng: false };
      }
    }

    // Priority 2: External image_url
    if (business.image_url &&
      typeof business.image_url === 'string' &&
      business.image_url.trim() !== '' &&
      !isPngIcon(business.image_url)) {
      return { image: business.image_url, isPng: false };
    }

    // Priority 3: Legacy image field
    if (business.image &&
      typeof business.image === 'string' &&
      business.image.trim() !== '' &&
      !isPngIcon(business.image)) {
      return { image: business.image, isPng: false };
    }

    // Priority 4: Category PNG fallback
    const categoryPng = getCategoryPngFromLabels([business.subInterestId, business.subInterestLabel, business.category, categoryKey]);
    return { image: categoryPng, isPng: true };
  }, [
    business.uploaded_images,
    business.image_url,
    business.image,
    categoryKey,
    business.subInterestId,
    business.subInterestLabel,
    business.category,
  ]);

  const displayImage = getDisplayImage.image;
  const isImagePng = getDisplayImage.isPng;
  const displayAlt = business.alt || business.name;

  const hasRating = business.hasRating !== undefined
    ? business.hasRating
    : (business.totalRating !== undefined && business.totalRating > 0) ||
    (business.rating !== undefined && business.rating > 0) ||
    (business?.stats?.average_rating !== undefined && business.stats.average_rating > 0);

  const displayRating =
    (typeof business.totalRating === "number" && business.totalRating > 0 && business.totalRating) ||
    (typeof business.rating === "number" && business.rating > 0 && business.rating) ||
    (typeof business?.stats?.average_rating === "number" && business.stats.average_rating > 0 && business.stats.average_rating) ||
    undefined;

  const handleImageError = () => {
    if (!usingFallback && !isImagePng) {
      setUsingFallback(true);
      setImgError(false);
    } else {
      setImgError(true);
    }
  };

  const mediaBaseClass =
    "relative overflow-hidden z-10 cursor-pointer rounded-t-[20px] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl";
  const mediaClass = compact
    ? `${mediaBaseClass} h-[490px] sm:h-[320px] md:h-[240px]`
    : `${mediaBaseClass} h-[490px] sm:h-[320px] md:h-[240px]`;

  // Animation variants - mobile gets fade, desktop gets slide
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

  return (
    <motion.li
      id={idForSnap}
      className={`snap-start snap-always flex-shrink-0 ${compact ? 'w-auto' : 'w-[240px] sm:w-[260px] md:w-[340px]'
        }`}
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontWeight: 600,
      }}
      initial={cardInitial}
      whileInView={cardAnimate}
      viewport={{ amount: isMobile ? 0.1 : 0.2, once: false }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : isMobile ? 0.4 : 0.5,
        ease: "easeOut",
        delay: index * 0.05, // Stagger effect: 50ms delay per card
      }}
    >
      <div
        className={`px-2 sm:px-2 pt-2 pb-0 rounded-[20px] ${compact ? "lg:py-3 lg:pb-2 lg:min-h-[200px]" : "flex-1"
          } relative flex-shrink-0 flex flex-col justify-between bg-sage z-10 shadow-md group w-full h-[650px] sm:h-auto`}
        style={{
          maxWidth: compact ? "100%" : undefined,
        } as React.CSSProperties}
        role="link"
        tabIndex={0}
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >

        <div
          className={mediaClass}
          onClick={handleCardClick}
        >
          <div 
            className="relative w-full h-full"
            style={{
              padding: '8px',
              boxSizing: 'border-box',
            }}
          >
            {!imgError && displayImage ? (
              isImagePng || displayImage.includes('/png/') || displayImage.endsWith('.png') || usingFallback ? (
                <div className="relative w-full h-full rounded-[20px] flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85 shadow-sm overflow-hidden">
                  <OptimizedImage
                    src={usingFallback ? getCategoryPng(categoryKey) : displayImage}
                    alt={displayAlt}
                    width={320}
                    height={350}
                    sizes="(max-width: 768px) 540px, 340px"
                    className="w-32 h-32 md:w-36 md:h-36 object-contain"
                    priority={false}
                    quality={90}
                    onError={handleImageError}
                  />
                </div>
              ) : (
                <div className="relative w-full h-full rounded-[20px] overflow-hidden">
                  <OptimizedImage
                    src={displayImage}
                    alt={displayAlt}
                    width={340}
                    height={400}
                    sizes="(max-width: 768px) 540px, 340px"
                    className="w-full h-full object-cover"
                    priority={false}
                    quality={90}
                    onError={handleImageError}
                  />
                </div>
              )
            ) : (
              <div
                className="relative w-full h-full flex items-center justify-center"
                style={{ backgroundColor: '#E5E0E5' }}
              >
                <div className="w-32 h-32 md:w-36 md:h-36 flex items-center justify-center">
                  <OptimizedImage
                    src={getCategoryPng(categoryKey)}
                    alt={displayAlt}
                    width={144}
                    height={144}
                    sizes="144px"
                    className="w-full h-full object-contain opacity-60"
                    priority={false}
                    quality={90}
                    onError={() => setImgError(true)}
                  />
                </div>
              </div>
            )}
            {imgError && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: '#E5E0E5' }}
              >
                <ImageIcon className="w-16 h-16 text-charcoal/20" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* Premium glass badges */}
          {business.verified && (
            <div className="absolute left-4 top-4 z-20">
              <VerifiedBadge />
            </div>
          )}

          {!hideStar && hasRating && displayRating !== undefined && (
            <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal">
              <Star className="rounded-full p-1 w-3.5 h-3.5 text-charcoal fill-charcoal" strokeWidth={2.5} aria-hidden />
              <span className="text-sm font-semibold text-charcoal" style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 600
              }}>
                {Number(displayRating).toFixed(1)}
              </span>
            </div>
          )}

          {!hideStar && !hasRating && (
            <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/40 shadow-md">
              <span className="text-sm font-semibold text-charcoal" style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 600
              }}>
                New
              </span>
            </div>
          )}

          {/* Mobile Info Icon - Shows popup with Share and Save */}
          <div className="md:hidden absolute left-4 bottom-4 z-[50]">
            <button
              data-info-button
              onClick={(e) => {
                e.stopPropagation();
                setShowInfoPopup(!showInfoPopup);
              }}
              className="w-10 h-10 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md touch-manipulation relative z-[51]"
              aria-label="More options"
              aria-expanded={showInfoPopup}
            >
              <Info className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>

            {/* Popup with Share and Save options */}
            {showInfoPopup && (
              <div
                ref={infoPopupRef}
                className="absolute bottom-full left-0 mb-2 bg-off-white/95 backdrop-blur-xl rounded-2xl border border-white/40 p-2 z-[60] min-w-[140px] max-w-[calc(100vw-8rem)] whitespace-nowrap shadow-premiumElevated"
                style={{
                  animation: 'fadeInUp 0.2s ease-out forwards',
                  transformOrigin: 'bottom left',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-2 w-full">
                  <button
                    data-share-btn
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare();
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-sage/10 active:bg-sage/20 transition-colors duration-200 min-h-[44px] touch-manipulation w-full shadow-md"
                    aria-label={`Share ${business.name}`}
                  >
                    <div className="w-10 h-10 bg-sage/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-5 h-5 text-navbar-bg/90" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-semibold text-charcoal whitespace-nowrap" style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      fontWeight: 600
                    }}>
                      Share
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookmark();
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-coral/10 active:bg-coral/20 transition-colors duration-200 min-h-[44px] touch-manipulation w-full shadow-md"
                    aria-label={isItemSaved(business.id) ? `Remove ${business.name} from saved` : `Save ${business.name}`}
                  >
                    <div className="w-10 h-10 bg-coral/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bookmark
                        className={`w-5 h-5 ${isItemSaved(business.id) ? 'text-coral fill-coral' : 'text-coral'}`}
                        strokeWidth={2.5}
                      />
                    </div>
                    <span className="text-sm font-semibold text-charcoal whitespace-nowrap" style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      fontWeight: 600
                    }}>
                      {isItemSaved(business.id) ? 'Saved' : 'Save'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Premium floating actions - desktop only */}
          <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-2 transition-all duration-300 ease-out translate-x-12 opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100">
            <button
              className={`w-12 h-10 bg-navbar-bg rounded-[20px] flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md ${hasReviewed
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-navbar-bg/90 hover:scale-110'
                }`}
              onClick={(e) => {
                e.stopPropagation();
                handleWriteReview();
              }}
              disabled={hasReviewed}
              aria-label={hasReviewed ? `You have already reviewed ${business.name}` : `Write a review for ${business.name}`}
              title={hasReviewed ? 'Already reviewed' : 'Write a review'}
            >
              <Edit className={`w-4 h-4 ${hasReviewed ? 'text-white/50' : 'text-white'}`} strokeWidth={2.5} />
            </button>
            <button
              className="w-12 h-10 bg-navbar-bg rounded-[20px] flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                handleBookmark();
              }}
              aria-label={`${isItemSaved(business.id) ? 'Remove from saved' : 'Save'} ${business.name}`}
              title={isItemSaved(business.id) ? 'Remove from saved' : 'Save'}
            >
              <Bookmark
                className={`w-4 h-4 ${isItemSaved(business.id) ? 'text-white fill-white' : 'text-white'}`}
                strokeWidth={2.5}
              />
            </button>
            <button
              className="w-12 h-10 bg-navbar-bg rounded-[20px] flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              aria-label={`Share ${business.name}`}
              title="Share"
            >
              <Share2 className="w-4 h-4 text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* CONTENT - Minimal, premium spacing */}
        <div
          className={`px-4 sm:px-5 pt-1 md:pt-2 lg:pt-3 pb-0 ${compact ? "lg:py-1 lg:pt-2 lg:pb-0 lg:min-h-[160px]" : "flex-1"
            } relative flex-shrink-0 flex flex-col md:justify-start justify-between bg-sage/10 z-10 rounded-b-[20px]`}
        >
          <div className={`${compact ? "flex flex-col" : "flex-1 flex flex-col"}`}>
            {/* Info Wrapper */}
            <div className="relative overflow-hidden">
              {/* Content - Centered */}
              <div className="flex flex-col items-center text-center relative z-10 space-y-0.5">
                {/* Business Name - Inside wrapper */}
                <div className="flex items-center justify-center w-full min-w-0 h-[2rem] sm:h-[2.5rem] relative">

                  <Tooltip content={business.name} position="top">
                    <button
                      type="button"
                      onClick={handleCardClick}
                      className="group w-full max-w-full min-w-0 text-charcoal transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 rounded-lg px-2 py-1 flex items-center justify-center relative"
                      aria-label={`View ${business.name} details`}
                    >

                      <h3
                        className="text-h2 sm:text-h1 font-bold text-center leading-[1.3] truncate tracking-tight transition-all duration-300 group-hover:text-navbar-bg/90 group-hover:scale-[1.02] group-hover:translate-y-[-1px] w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap relative z-[1]"
                        style={{
                          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                          fontWeight: 700,
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                          textRendering: 'optimizeLegibility',
                          letterSpacing: '0.03em',
                          transform: 'translateY(0)',
                          willChange: 'transform'
                        }}
                      >
                        {business.name}
                      </h3>
                    </button>
                  </Tooltip>
                </div>
                {/* Category with icon - Stacked layout */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  {/* Category row with icon - Pill badge style */}
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5">
                    {(() => {
                      const CategoryIcon = getCategoryIcon(business.category, business.subInterestId, business.subInterestLabel);
                      const uniqueColor = getUniqueBusinessColor(business.id);
                      return (
                        <>
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${uniqueColor} flex items-center justify-center flex-shrink-0`}>
                            <CategoryIcon className="w-4 h-4 text-charcoal/70" strokeWidth={2.5} />
                          </div>
                          <span 
                            className="truncate text-caption sm:text-xs text-charcoal/80 font-semibold"
                            style={{
                              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                              fontWeight: 600,
                              WebkitFontSmoothing: 'antialiased',
                              MozOsxFontSmoothing: 'grayscale',
                              textRendering: 'optimizeLegibility',
                              letterSpacing: '0.01em'
                            }}
                          >
                            {displayCategoryLabel}
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Description - Stacked below category */}
                  {business.description && (
                    <p
                      className="text-caption sm:text-xs text-charcoal/50 line-clamp-2 max-w-full text-center px-1"
                      style={{
                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                        fontWeight: 400,
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        textRendering: 'optimizeLegibility',
                      }}
                    >
                      {business.description}
                    </p>
                  )}
                </div>

                {/* Reviews - Refined */}
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className="inline-flex items-center justify-center gap-1 min-h-[20px]">
                    {hasRating && displayRating !== undefined ? (
                      <>
                        <span
                          role="link"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleCardClick();
                            }
                          }}
                          className="inline-flex items-center justify-center text-body-sm sm:text-base font-bold leading-none text-navbar-bg underline-offset-2 cursor-pointer transition-colors duration-200 hover:text-coral"
                          style={{
                            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                            fontWeight: 700
                          }}
                        >
                          {business.reviews}
                        </span>
                        <span
                          role="link"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleCardClick();
                            }
                          }}
                          className="inline-flex items-center justify-center text-sm leading-none text-navbar-bg underline-offset-2 cursor-pointer transition-colors duration-200 hover:text-coral"
                          style={{
                            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                            fontWeight: 400
                          }}
                        >
                          Reviews
                        </span>
                      </>
                    ) : (
                      <span
                        role="button"
                        tabIndex={hasReviewed ? -1 : 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!hasReviewed) {
                            handleWriteReview();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (!hasReviewed && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            handleWriteReview();
                          }
                        }}
                        className={`inline-flex items-center justify-center text-sm font-normal underline-offset-2 min-w-[92px] text-center transition-colors duration-200 ${hasReviewed
                          ? 'text-charcoal/50 cursor-not-allowed'
                          : 'text-charcoal cursor-pointer hover:text-coral'
                          } ${compact ? 'lg:order-1 lg:mb-1' : ''}`}
                        style={{
                          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                          fontWeight: 400
                        }}
                        aria-disabled={hasReviewed}
                        title={hasReviewed ? 'You have already reviewed this business' : 'Be the first to review'}
                      >
                        {hasReviewed ? 'Already reviewed' : 'Be the first to review'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Percentile chips - Inside wrapper */}
                <div className="flex items-center justify-between sm:justify-center gap-4 sm:gap-3 flex-nowrap min-h-[28px] sm:min-h-[28px] py-1 md:bg-off-white/50 md:backdrop-blur-sm md:rounded-[20px] overflow-hidden w-[90%] mx-auto md:mb-2 shadow-sm">
                  <PercentileChip
                    label="punctuality"
                    value={business.percentiles?.punctuality || 0}
                  />
                  <PercentileChip
                    label="cost-effectiveness"
                    value={business.percentiles?.['cost-effectiveness'] || 0}
                  />
                  <PercentileChip
                    label="friendliness"
                    value={business.percentiles?.friendliness || 0}
                  />
                  <PercentileChip
                    label="trustworthiness"
                    value={business.percentiles?.trustworthiness || 0}
                  />
                </div>

              </div>
            </div>
          </div>

          {/* Mobile actions - Minimal */}
          <div className="flex md:hidden items-center justify-center pt-2 pb-2">
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-full text-caption sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage/40 border transition-all min-h-[48px] shadow-md ${hasReviewed
                ? 'bg-charcoal/20 text-charcoal/50 cursor-not-allowed border-charcoal/20'
                : 'bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white border-sage/50 active:scale-95'
                }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasReviewed) {
                  handleWriteReview();
                }
              }}
              disabled={hasReviewed}
              aria-label={hasReviewed ? `You have already reviewed ${business.name}` : `Write a review for ${business.name}`}
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              <Edit className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{hasReviewed ? 'Already Reviewed' : 'Review'}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.li>
  );
}

export default memo(BusinessCard);
export type { Business };
