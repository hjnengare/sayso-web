"use client";

import React, { useMemo, useState, useEffect, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Image as ImageIcon, Star, Share2, Bookmark, Info, ChevronLeft, ChevronRight, TrendingUp, Zap, Scissors, Coffee, UtensilsCrossed, Wine, Dumbbell, Activity, Heart, Book, ShoppingBag, Home, Briefcase, MapPin, Music, Film, Camera, Car, GraduationCap, CreditCard, Tag, Flame, Store } from "lucide-react";
import Image from "next/image";
import PercentileChip from "../PercentileChip/PercentileChip";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import OptimizedImage from "../Performance/OptimizedImage";
import Tooltip from "../Tooltip/Tooltip";
import { useSavedItems } from "../../contexts/SavedItemsContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  getCategoryLabelFromBusiness,
  getCategorySlugFromBusiness,
  getSubcategoryPlaceholderFromCandidates,
  isPlaceholderImage,
} from "../../utils/subcategoryPlaceholders";
import BusinessCardImage from "./parts/BusinessCardImage";
import BusinessCardCategory from "./parts/BusinessCardCategory";
import BusinessCardActions from "./parts/BusinessCardActions";
import BusinessCardPercentiles from "./parts/BusinessCardPercentiles";
import BusinessCardReviews from "./parts/BusinessCardReviews";
import {
  formatDistanceAway,
  isValidCoordinate,
  useBusinessDistanceLocation,
} from "../../hooks/useBusinessDistanceLocation";

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
  /** Canonical slug (e.g. restaurants). Used for placeholder resolution. */
  category?: string;
  /** Display label (e.g. "Restaurants"). Prefer this for UI text. */
  category_label?: string;
  /** New schema (20260210): DB primary taxonomy columns. Prefer when present. */
  primary_subcategory_slug?: string | null;
  primary_subcategory_label?: string | null;
  primary_category_slug?: string | null;
  sub_interest_id?: string | null;
  subInterestId?: string;
  subInterestLabel?: string;
  interest_id?: string | null;
  interestId?: string;
  location: string;
  rating?: number;
  totalRating?: number;
  reviews: number;
  badge?: string;
  href?: string;
  percentiles?: Percentiles;
  verified?: boolean;
  distance?: number | string;
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
  top_review_preview?: {
    content: string;
    rating?: number | null;
    createdAt?: string | null;
  } | null;
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
  ownerView = false,
  showActions: showActionsProp,
}: {
  business: Business;
  hideStar?: boolean;
  compact?: boolean;
  inGrid?: boolean;
  index?: number;
  ownerView?: boolean;
  showActions?: boolean;
}) {
  const router = useRouter();
  const { toggleSavedItem, isItemSaved } = useSavedItems();
  const { showToast } = useToast();
  const { user } = useAuth();
  const hasReviewed = false;
  const idForSnap = useMemo(() => `business-${business.id}`, [business.id]);
  const businessImageLayoutId = useMemo(() => `business-media-${business.id}`, [business.id]);
  const businessTitleLayoutId = useMemo(() => `business-title-${business.id}`, [business.id]);

  // Check if user is a business account
  const isBusinessAccount = useMemo(() => {
    return user?.profile?.role === 'business_owner' || user?.profile?.role === 'both';
  }, [user?.profile?.role]);

  // Determine if actions should be shown
  const showActions = useMemo(() => {
    // If explicitly set via prop, use that
    if (showActionsProp !== undefined) {
      return showActionsProp;
    }

    // Hide actions for business accounts on my-businesses page
    const isMyBusinessesPage = typeof window !== 'undefined' && window.location.pathname === '/my-businesses';

    if (isBusinessAccount && isMyBusinessesPage) {
      return false;
    }

    return true;
  }, [showActionsProp, isBusinessAccount]);

  const [imgError, setImgError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const infoPopupRef = useRef<HTMLDivElement>(null);
  const hasCoordinates = isValidCoordinate(business.lat) && isValidCoordinate(business.lng);
  const { status: locationStatus, getDistanceKm } = useBusinessDistanceLocation();
  const distanceLabel = useMemo(() => {
    if (!hasCoordinates) return null;
    const distanceKm = getDistanceKm(business.lat, business.lng);
    if (distanceKm === null) return null;
    return formatDistanceAway(distanceKm);
  }, [business.lat, business.lng, getDistanceKm, hasCoordinates]);
  const distanceHint = useMemo(() => {
    if (!hasCoordinates) return null;
    if (locationStatus === "loading") return "Calculating...";
    if (distanceLabel) return distanceLabel;
    if (locationStatus === "denied") {
      return "Location is off. Enable it in browser settings.";
    }
    return "Enable location to see distance";
  }, [distanceLabel, hasCoordinates, locationStatus]);
  const distanceBadgeText = useMemo(() => {
    if (!hasCoordinates) return null;
    if (distanceLabel) return distanceLabel;
    if (locationStatus === "loading") return "Calculating...";
    if (locationStatus === "denied") return "Location off";
    return "Enable location";
  }, [distanceLabel, hasCoordinates, locationStatus]);


  // Use slug for SEO-friendly URLs, fallback to ID
  const businessIdentifier = business.slug || business.id;
  const reviewRoute = useMemo(() => `/business/${businessIdentifier}/review`, [businessIdentifier]);
  const businessProfileRoute = useMemo(() => 
    ownerView ? `/my-businesses/businesses/${businessIdentifier}` : `/business/${businessIdentifier}`, 
    [businessIdentifier, ownerView]
  );

  // Prefetch routes on mount (limit to first few cards to avoid flooding)
  useEffect(() => {
    if (index > 2) return;
    if (typeof window === "undefined") return;

    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const prefetch = () => {
      try {
        router.prefetch(reviewRoute);
        router.prefetch(businessProfileRoute);
      } catch {
        // ignore prefetch failures
      }
    };

    const idleCallback = (window as any).requestIdleCallback;
    if (typeof idleCallback === "function") {
      idleId = idleCallback(prefetch, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(prefetch, 200);
    }

    return () => {
      if (idleId !== null && typeof (window as any).cancelIdleCallback === "function") {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [index, router, reviewRoute, businessProfileRoute]);

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

  const categoryKey = getCategorySlugFromBusiness(business) || "default";
  const displayCategoryLabel = getCategoryLabelFromBusiness(business);

  if (process.env.NODE_ENV === "development") {
    console.log("[CARD CATEGORY DEBUG]", {
      id: business.id,
      name: business.name,
      sub_interest_id: (business as { sub_interest_id?: string }).sub_interest_id,
      subInterestId: business.subInterestId,
      interest_id: (business as { interest_id?: string }).interest_id,
      interestId: business.interestId,
      category: business.category,
      categoryKey,
      displayCategoryLabel,
    });
  }

  const getDisplayImage = useMemo(() => {
    // Priority 1: Check uploaded_images array (new source of truth)
    if (business.uploaded_images && Array.isArray(business.uploaded_images) && business.uploaded_images.length > 0) {
      const imageUrl = business.uploaded_images[0];

      if (imageUrl &&
          typeof imageUrl === 'string' &&
          imageUrl.trim() !== '' &&
          !isPlaceholderImage(imageUrl)) {
        return { image: imageUrl, isPlaceholder: false };
      }
    }

    // Priority 2: External image_url
    if (business.image_url &&
      typeof business.image_url === 'string' &&
      business.image_url.trim() !== '' &&
      !isPlaceholderImage(business.image_url)) {
      return { image: business.image_url, isPlaceholder: false };
    }

    // Priority 3: Legacy image field
    if (business.image &&
      typeof business.image === 'string' &&
      business.image.trim() !== '' &&
      !isPlaceholderImage(business.image)) {
      return { image: business.image, isPlaceholder: false };
    }

    // Priority 4: Canonical subcategory placeholder only (no fuzzy/old mapping)
    const placeholder = getSubcategoryPlaceholderFromCandidates([
      (business as { sub_interest_id?: string }).sub_interest_id,
      business.subInterestId,
      (business as { sub_interest_slug?: string }).sub_interest_slug,
      (business as { interest_id?: string }).interest_id,
      business.interestId,
      business.category,
    ]);
    return { image: placeholder, isPlaceholder: true };
  }, [
    business.uploaded_images,
    business.image_url,
    business.image,
    (business as { sub_interest_id?: string }).sub_interest_id,
    business.subInterestId,
    (business as { interest_id?: string }).interest_id,
    business.interestId,
    business.category,
  ]);

  const displayImage = getDisplayImage.image;
  const isImagePng = getDisplayImage.isPlaceholder;
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
    "relative overflow-hidden z-10 cursor-pointer bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl";
  const mediaClass = compact
    ? `${mediaBaseClass} h-[280px] sm:h-[300px] md:h-[220px]`
    : `${mediaBaseClass} h-[280px] sm:h-[300px] md:h-[220px]`;

  return (
    <li
      id={idForSnap}
      className={`snap-start snap-always flex-shrink-0 ${compact ? 'w-auto' : 'w-[240px] sm:w-[260px] md:w-[340px]'}`}
      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
    >
      <Link
        href={businessProfileRoute}
        className={`rounded-[12px] ${compact ? "lg:min-h-[200px]" : "flex-1"} relative flex-shrink-0 flex flex-col justify-between bg-sage z-10 shadow-md group cursor-pointer w-full sm:h-auto overflow-hidden`}
        style={{ maxWidth: compact ? "100%" : "540px" } as React.CSSProperties}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
            sharedLayoutId={businessImageLayoutId}
            priority={index < 3}
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
          {distanceBadgeText && (
            <div className="absolute left-3 bottom-3 z-20 inline-flex items-center rounded-full bg-off-white/90 backdrop-blur-[2px] px-2.5 py-1 text-[11px] font-medium text-charcoal shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
              <span
                className="leading-none"
                style={{
                  fontFamily:
                    "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                }}
                title={distanceHint ?? distanceBadgeText}
              >
                {distanceBadgeText}
              </span>
            </div>
          )}
          {/* Premium floating actions - desktop only */}
          {showActions && (
            <BusinessCardActions
              hasReviewed={hasReviewed}
              isItemSaved={isItemSaved(business.id)}
              isBusinessAccount={isBusinessAccount}
              onWriteReview={(e) => { e.preventDefault(); e.stopPropagation(); handleWriteReview(); }}
              onViewProfile={(e) => { e.preventDefault(); e.stopPropagation(); handleCardClick(); }}
              onBookmark={(e) => { e.preventDefault(); e.stopPropagation(); handleBookmark(); }}
              onShare={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(); }}
              businessName={business.name}
            />
          )}
        </div>
        {/* CONTENT - Minimal, premium spacing */}
        <div className={`px-5 pt-2.5 sm:px-6 sm:pt-1 md:pt-2 lg:pt-2.5 pb-2.5 ${compact ? "lg:py-1 lg:pt-2 lg:pb-0 lg:min-h-[160px]" : "flex-1"} relative flex-shrink-0 flex flex-col justify-start bg-sage/10 z-10 rounded-b-[12px]`}>
          <div className="flex flex-col">
            {/* Info Wrapper */}
            <div className="relative overflow-hidden">
              {/* Content - Centered */}
              <div className="flex flex-col items-center text-center relative z-10 space-y-0.5">
                {/* Business Name - Inside wrapper */}
                <div className="flex items-center justify-center w-full min-w-0 relative">
                  <Tooltip content={business.name} position="top">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCardClick(); }}
                      className="group w-full max-w-full min-w-0 text-charcoal transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 rounded-lg px-2 py-1 flex items-center justify-center relative"
                      aria-label={`View ${business.name} details`}
                    >
                      <motion.h3
                        layoutId={businessTitleLayoutId}
                        className="text-h2 sm:text-h1 font-bold text-center leading-[1.3] truncate tracking-tight transition-colors duration-300 group-hover:text-navbar-bg/90 w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap relative z-[1]"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 700, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility', letterSpacing: '0.03em' }}
                      >
                        {business.name}
                      </motion.h3>
                    </button>
                  </Tooltip>
                </div>
                {/* Category with icon - Stacked layout */}
                <div className="flex flex-col items-center gap-1 w-full">
                  <BusinessCardCategory
                    category={displayCategoryLabel}
                    subInterestId={categoryKey === "default" ? undefined : categoryKey}
                    subInterestLabel={displayCategoryLabel}
                    displayCategoryLabel={displayCategoryLabel}
                  />
                </div>
                {/* Reviews - Refined */}
                <BusinessCardReviews
                  hasRating={hasRating}
                  displayRating={displayRating}
                  reviews={business.reviews}
                  hasReviewed={hasReviewed}
                  onCardClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCardClick(); }}
                  onWriteReview={(e) => { e.preventDefault(); e.stopPropagation(); if (!hasReviewed) handleWriteReview(); }}
                  compact={compact}
                />
                {/* Percentile chips - Inside wrapper */}
                <BusinessCardPercentiles percentiles={business.percentiles} />
              </div>
            </div>
          </div>
          {/* Mobile actions - Minimal */}
          <div className="flex md:hidden items-center justify-center pt-1.5 pb-1.5 px-1">
            <button
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-full text-caption sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage/40 border transition-all duration-200 min-h-[48px] shadow-md bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white border-sage/50 active:scale-95 active:translate-y-[1px] transform-gpu touch-manipulation select-none"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCardClick();
              }}
              aria-label={`View ${business.name} details`}
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
            >
              <span>{isBusinessAccount ? 'View Business Profile' : 'View Details'}</span>
            </button>
          </div>
        </div>
      </Link>
    </li>
  );
}

export default memo(BusinessCard);
export type { Business };
