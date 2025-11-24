"use client";

import React, { useMemo, useState, useEffect, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Star, Edit, Share2, MapPin, Bookmark, Globe, Tag, Info } from "react-feather";
import Stars from "../Stars/Stars";
import PercentileChip from "../PercentileChip/PercentileChip";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import OptimizedImage from "../Performance/OptimizedImage";
import Tooltip from "../Tooltip/Tooltip";
import { useSavedItems } from "../../contexts/SavedItemsContext";
import { useToast } from "../../contexts/ToastContext";
import { getCategoryPng, getCategoryPngFromLabels, isPngIcon } from "../../utils/categoryToPngMapping";

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
  uploaded_image?: string;
  uploadedImage?: string;
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

function BusinessCard({
  business,
  hideStar = false,
  compact = false,
}: {
  business: Business;
  hideStar?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const { toggleSavedItem, isItemSaved } = useSavedItems();
  const { showToast } = useToast();
  const idForSnap = useMemo(() => `business-${business.id}`, [business.id]);

  const [imgError, setImgError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const infoPopupRef = useRef<HTMLDivElement>(null);

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

  const handleWriteReview = () => router.push(reviewRoute);
  
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
    const uploadedImage = business.uploaded_image || business.uploadedImage;
    if (uploadedImage &&
      typeof uploadedImage === 'string' &&
      uploadedImage.trim() !== '' &&
      !isPngIcon(uploadedImage) &&
      !uploadedImage.includes('/png/')) {
      return { image: uploadedImage, isPng: false };
    }

    if (business.image_url &&
      typeof business.image_url === 'string' &&
      business.image_url.trim() !== '' &&
      !isPngIcon(business.image_url)) {
      return { image: business.image_url, isPng: false };
    }

    if (business.image &&
      typeof business.image === 'string' &&
      business.image.trim() !== '' &&
      !isPngIcon(business.image)) {
      return { image: business.image, isPng: false };
    }

    // Prefer resolving by multiple labels (subInterestId, subInterestLabel, category)
    const categoryPng = getCategoryPngFromLabels([business.subInterestId, business.subInterestLabel, business.category, categoryKey]);
    return { image: categoryPng, isPng: true };
  }, [
    business.uploaded_image,
    business.uploadedImage,
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
    "relative overflow-hidden z-10 cursor-pointer rounded-t-[12px] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 border border-white/50 backdrop-blur-md";
  const mediaClass = compact
    ? `${mediaBaseClass} h-[300px] lg:h-[260px]`
    : `${mediaBaseClass} h-[490px] sm:h-[320px] md:h-[240px]`;

  return (
    <li
      id={idForSnap}
      className={`snap-start snap-always flex-shrink-0 ${compact ? 'w-auto' : 'w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] xl:min-w-[25%]'
        }`}
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontWeight: 600,
      }}
    >
      <div
        className={`relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden group cursor-pointer w-full flex flex-col border border-white/50 backdrop-blur-md ring-1 ring-white/20 ${compact ? "md:h-[416px]" : "h-[650px] sm:h-auto md:w-[340px]"
          }`}
        style={{
          maxWidth: compact ? "100%" : "540px",
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
        {/* Glass depth overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-off-white/5 via-transparent to-transparent pointer-events-none z-0" />
        {/* MEDIA - Full bleed with premium overlay */}
        <div
          className={mediaClass}
          onClick={handleCardClick}
        >
          <div className="relative w-full h-full">
            {!imgError && displayImage ? (
              isImagePng || displayImage.includes('/png/') || displayImage.endsWith('.png') || usingFallback ? (
                <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85">
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
                <div className="relative w-full h-full overflow-hidden">
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
            <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/90 px-3 py-1.5 text-charcoal border border-white/30">
              <Star className="w-3.5 h-3.5 text-navbar-bg fill-navbar-bg" aria-hidden />
              <span className="text-sm font-semibold text-charcoal" style={{ 
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', 
                fontWeight: 600
              }}>
                {Number(displayRating).toFixed(1)}
              </span>
            </div>
          )}

          {!hideStar && !hasRating && (
            <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/90 px-3 py-1.5 text-charcoal border border-white/30">
              <span className="text-sm font-semibold text-charcoal" style={{ 
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', 
                fontWeight: 600
              }}>
                New
              </span>
            </div>
          )}

          {/* Mobile Info Icon - Shows popup with Share and Save */}
          <div className="md:hidden absolute left-4 bottom-4 z-20">
            <button
              data-info-button
              onClick={(e) => {
                e.stopPropagation();
                setShowInfoPopup(!showInfoPopup);
              }}
              className="w-10 h-10 bg-off-white/95 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/30 shadow-lg touch-manipulation"
              aria-label="More options"
              aria-expanded={showInfoPopup}
            >
              <Info className="w-5 h-5 text-charcoal" />
            </button>

            {/* Popup with Share and Save options */}
            {showInfoPopup && (
              <div
                ref={infoPopupRef}
                className="absolute bottom-full left-0 mb-2 bg-off-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-2 z-30 min-w-[140px] whitespace-nowrap"
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
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sage/10 active:bg-sage/20 transition-colors duration-200 min-h-[44px] touch-manipulation w-full"
                    aria-label={`Share ${business.name}`}
                  >
                    <div className="w-10 h-10 bg-sage/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-5 h-5 text-sage" />
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
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-coral/10 active:bg-coral/20 transition-colors duration-200 min-h-[44px] touch-manipulation w-full"
                    aria-label={isItemSaved(business.id) ? `Remove ${business.name} from saved` : `Save ${business.name}`}
                  >
                    <div className="w-10 h-10 bg-coral/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bookmark
                        className={`w-5 h-5 ${isItemSaved(business.id) ? 'text-coral fill-coral' : 'text-coral'}`}
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
              className="w-12 h-10 bg-off-white/95 rounded-[20px] flex items-center justify-center hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/30"
              onClick={(e) => {
                e.stopPropagation();
                handleWriteReview();
              }}
              aria-label={`Write a review for ${business.name}`}
              title="Write a review"
            >
              <Edit className="w-4 h-4 text-primary" />
            </button>
            <button
              className="w-12 h-10 bg-off-white/95 rounded-[20px] flex items-center justify-center hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/30"
              onClick={(e) => {
                e.stopPropagation();
                handleBookmark();
              }}
              aria-label={`${isItemSaved(business.id) ? 'Remove from saved' : 'Save'} ${business.name}`}
              title={isItemSaved(business.id) ? 'Remove from saved' : 'Save'}
            >
              <Bookmark
                className={`w-4 h-4 ${isItemSaved(business.id) ? 'text-coral fill-coral' : 'text-primary'}`}
              />
            </button>
            <button
              className="w-12 h-10 bg-off-white/95 rounded-[20px] flex items-center justify-center hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/30"
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              aria-label={`Share ${business.name}`}
              title="Share"
            >
              <Share2 className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>

        {/* CONTENT - Minimal, premium spacing */}
        <div
          className={`px-4 sm:px-5 pt-2 pb-2 ${compact ? "lg:py-3 lg:pb-4 lg:min-h-[200px]" : "flex-1"
            } relative flex-shrink-0 flex flex-col justify-between bg-sage/10 z-10 rounded-b-[12px]`}
        >
          <div className={`${compact ? "flex flex-col" : "flex-1 flex flex-col"}`}>
            {/* Info Wrapper */}
            <div className="relative overflow-hidden">
              {/* Content - Centered */}
              <div className="flex flex-col items-center text-center relative z-10 space-y-1">
                {/* Business Name - Inside wrapper */}
                <div className="flex items-center justify-center w-full">
                  <Tooltip content={business.name} position="top">
                    <button
                      type="button"
                      onClick={handleCardClick}
                      className="group w-full max-w-full text-charcoal transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 rounded-lg px-2 py-1"
                      aria-label={`View ${business.name} details`}
                    >
                      <h3
                        className="text-h2 sm:text-h1 font-bold text-inherit text-center leading-[1.3] truncate tracking-tight transition-colors duration-300 group-hover:text-navbar-bg/90 max-w-full"
                        style={{
                          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                          fontWeight: 700,
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale',
                          textRendering: 'optimizeLegibility',
                          letterSpacing: '-0.01em'
                        }}
                      >
                        {business.name}
                      </h3>
                    </button>
                  </Tooltip>
                </div>
                {/* Category and Location - Combined with bullet separator */}
                <div
                  className="flex items-center justify-center gap-1.5 text-caption sm:text-xs text-charcoal/60 min-h-[20px]"
                  style={{
                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    fontWeight: 400,
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'optimizeLegibility',
                    letterSpacing: '0.01em'
                  }}
                >
                  <span className="truncate">{displayCategoryLabel}</span>
                  {(business.address || business.location) && (
                    <>
                      <span aria-hidden>·</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.name} ${business.location || business.address || ''}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-caption sm:text-xs font-normal text-charcoal/60 transition-colors duration-200 hover:text-navbar-bg/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/30 rounded-full px-2 py-1"
                        aria-label={`Open ${business.name} in maps`}
                      >
                        <MapPin className="w-3 h-3 text-navbar-bg/90 stroke-[2.5] transition-colors duration-200 group-hover:text-navbar-bg/90" />
                        <span className="truncate max-w-[8rem] sm:max-w-[10rem]">{business.location || business.address}</span>
                      </a>
                    </>
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
                          className="inline-flex items-center justify-center text-body-sm sm:text-base font-bold leading-none text-charcoal underline-offset-2 cursor-pointer transition-colors duration-200 hover:text-coral"
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
                          className="inline-flex items-center justify-center text-caption sm:text-xs leading-none text-charcoal/50 underline-offset-2 cursor-pointer transition-colors duration-200 hover:text-coral"
                          style={{
                            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                            fontWeight: 400
                          }}
                        >
                          reviews
                        </span>
                      </>
                    ) : (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWriteReview();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleWriteReview();
                          }
                        }}
                        className={`inline-flex items-center justify-center text-sm font-normal text-charcoal underline-offset-2 cursor-pointer transition-colors duration-200 hover:text-coral min-w-[92px] text-center ${compact ? 'lg:order-1 lg:mb-1' : ''}`}
                        style={{
                          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                          fontWeight: 400
                        }}
                      >
                        Be the first to review
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center justify-center gap-2 ${compact ? 'lg:flex-col lg:items-center lg:gap-1.5' : ''}`}>
                    <div
                      className={`flex items-center justify-center gap-2 text-charcoal transition-all duration-300 ${compact ? 'lg:order-2' : ''}`}
                      aria-label={hasRating && displayRating !== undefined ? `View ${business.reviews} reviews for ${business.name}` : `Be the first to review ${business.name}`}
                    >
                      <Stars value={hasRating && displayRating !== undefined ? displayRating : 0} color="navbar-bg" size={18} spacing={2.5} />
                    </div>
                  </div>
                </div>

                {/* Percentile chips - Inside wrapper */}
                <div className="flex items-center justify-center gap-1 flex-wrap min-h-[28px] max-h-[56px] py-1 md:bg-off-white/40 md:rounded-[20px] md:border md:border-white/30">
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
          <div className="flex md:hidden items-center justify-center pt-4 border-t border-off-white/30">
            <button
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white rounded-full text-caption sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage/40 border border-sage/50 transition-all active:scale-95 min-h-[48px]"
              onClick={(e) => {
                e.stopPropagation();
                handleWriteReview();
              }}
              aria-label={`Write a review for ${business.name}`}
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Review</span>
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

export default memo(BusinessCard);
export type { Business };
