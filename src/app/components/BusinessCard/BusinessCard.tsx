"use client";

import React, { useMemo, useState, useEffect, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Star, Edit, Share2, Bookmark, Info, ChevronLeft, ChevronRight, TrendingUp, Zap, Scissors, Coffee, UtensilsCrossed, Wine, Dumbbell, Activity, Heart, Book, ShoppingBag, Home, Briefcase, MapPin, Music, Film, Camera, Car, GraduationCap, CreditCard, Tag, Flame } from "lucide-react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import PercentileChip from "../PercentileChip/PercentileChip";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import OptimizedImage from "../Performance/OptimizedImage";
import Tooltip from "../Tooltip/Tooltip";
import { useSavedItems } from "../../contexts/SavedItemsContext";
import { useToast } from "../../contexts/ToastContext";
import { getCategoryPng, getCategoryPngFromLabels, isPngIcon } from "../../utils/categoryToPngMapping";
import BusinessCardImage from "./parts/BusinessCardImage";
import BusinessCardCategory from "./parts/BusinessCardCategory";
import BusinessCardActions from "./parts/BusinessCardActions";
import BusinessCardPercentiles from "./parts/BusinessCardPercentiles";
import BusinessCardReviews from "./parts/BusinessCardReviews";

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
  lat?: number; // Latitude for map display
  lng?: number; // Longitude for map display
};



// Map categories to lucide-react icons
export const getCategoryIcon = (category: string, subInterestId?: string, subInterestLabel?: string): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
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
  const hasReviewed = false;
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

  // Always use the raw category from the DB for display
  const categoryKey = business.subInterestId || business.category || "default";
  const displayCategoryLabel = business.category || "";
  // Log for validation
  console.log("BusinessCard category:", displayCategoryLabel);

  const getDisplayImage = useMemo(() => {
    // Priority 1: Check uploaded_images array (new source of truth)
    // Always use the first (primary) image
    if (business.uploaded_images && Array.isArray(business.uploaded_images) && business.uploaded_images.length > 0) {
      const imageUrl = business.uploaded_images[0];

      if (imageUrl &&
          typeof imageUrl === 'string' &&
          imageUrl.trim() !== '' &&
          !isPngIcon(imageUrl) &&
          !imageUrl.includes('/png/')) {
        return { image: imageUrl, isPng: false };
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
    "relative overflow-hidden z-10 cursor-pointer rounded-[20px] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl";
  const mediaClass = compact
    ? `${mediaBaseClass} h-[300px] sm:h-[320px] md:h-[240px]`
    : `${mediaBaseClass} h-[300px] sm:h-[320px] md:h-[240px]`;

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
      className={`snap-start snap-always flex-shrink-0 ${compact ? 'w-auto' : 'w-[240px] sm:w-[260px] md:w-[340px]'}`}
      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
      initial={cardInitial}
      whileInView={cardAnimate}
      viewport={{ amount: isMobile ? 0.1 : 0.2, once: false }}
      transition={{ duration: prefersReducedMotion ? 0.2 : isMobile ? 0.4 : 0.5, ease: "easeOut", delay: index * 0.05 }}
    >
      <div
        className={`px-1 pt-1 pb-0 rounded-[20px] ${compact ? "lg:py-1 lg:pb-1 lg:min-h-[200px]" : "flex-1"} relative flex-shrink-0 flex flex-col justify-between bg-sage z-10 shadow-md group w-full sm:h-auto`}
        style={{ maxWidth: compact ? "100%" : "540px" } as React.CSSProperties}
        role="link"
        tabIndex={0}
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(); } }}
      >
        <div className={mediaClass} onClick={handleCardClick}>
          <BusinessCardImage
            displayImage={displayImage}
            isImagePng={isImagePng}
            displayAlt={displayAlt}
            usingFallback={usingFallback}
            imgError={imgError}
            onImageError={handleImageError}
            categoryKey={categoryKey}
            businessName={business.name}
            verified={business.verified}
          />
          {/* Premium glass badges */}
          {business.verified && (
            <div className="absolute left-4 top-4 z-20">
              <VerifiedBadge />
            </div>
          )}
          {/* Star/Rating badge */}
          {!hideStar && hasRating && displayRating !== undefined && (
            <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal">
              <Star className="rounded-full p-1 w-6 h-6 text-charcoal fill-charcoal" strokeWidth={2.5} aria-hidden />
              <span className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>{Number(displayRating).toFixed(1)}</span>
            </div>
          )}
          {!hideStar && !hasRating && (
            <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/40 shadow-md">
              <span className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>New</span>
            </div>
          )}
          {/* Premium floating actions - desktop only */}
          <BusinessCardActions
            hasReviewed={hasReviewed}
            isItemSaved={isItemSaved(business.id)}
            onWriteReview={(e) => { e.stopPropagation(); handleWriteReview(); }}
            onBookmark={(e) => { e.stopPropagation(); handleBookmark(); }}
            onShare={(e) => { e.stopPropagation(); handleShare(); }}
            businessName={business.name}
          />
        </div>
        {/* CONTENT - Minimal, premium spacing */}
        <div className={`px-4 py-3 sm:px-5 sm:pt-1 md:pt-2 lg:pt-3 pb-0 ${compact ? "lg:py-1 lg:pt-2 lg:pb-0 lg:min-h-[160px]" : "flex-1"} relative flex-shrink-0 flex flex-col md:justify-start justify-between bg-sage/10 z-10 rounded-b-[20px]`}>
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
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 700, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility', letterSpacing: '0.03em', transform: 'translateY(0)', willChange: 'transform' }}
                      >
                        {business.name}
                      </h3>
                    </button>
                  </Tooltip>
                </div>
                {/* Category with icon - Stacked layout */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <BusinessCardCategory
                    category={business.category}
                    subInterestId={business.subInterestId}
                    subInterestLabel={business.subInterestLabel}
                    displayCategoryLabel={displayCategoryLabel}
                  />
                  {/* Description - Stacked below category */}
                  {business.description && (
                    <p className="text-caption sm:text-xs text-charcoal/70 line-clamp-2 max-w-full text-center px-1" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' }}>{business.description}</p>
                  )}
                </div>
                {/* Reviews - Refined */}
                <BusinessCardReviews
                  hasRating={hasRating}
                  displayRating={displayRating}
                  reviews={business.reviews}
                  hasReviewed={hasReviewed}
                  onCardClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                  onWriteReview={(e) => { e.stopPropagation(); if (!hasReviewed) handleWriteReview(); }}
                  compact={compact}
                />
                {/* Percentile chips - Inside wrapper */}
                <BusinessCardPercentiles percentiles={business.percentiles} />
              </div>
            </div>
          </div>
          {/* Mobile actions - Minimal */}
          <div className="flex md:hidden items-center justify-center pt-2 pb-2">
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-full text-caption sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage/40 border transition-all min-h-[48px] shadow-md ${hasReviewed ? 'bg-charcoal/20 text-charcoal/70 cursor-not-allowed border-charcoal/20' : 'bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white border-sage/50 active:scale-95'}`}
              onClick={(e) => { e.stopPropagation(); if (!hasReviewed) handleWriteReview(); }}
              disabled={hasReviewed}
              aria-label={hasReviewed ? `You have already reviewed ${business.name}` : `Write a review for ${business.name}`}
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
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
