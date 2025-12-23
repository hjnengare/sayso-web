// src/components/BusinessOfTheMonthCard/BusinessOfTheMonthCard.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Star, Edit, Bookmark, Share2, MapPin, Award } from "react-feather";
import Stars from "../Stars/Stars";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import Tooltip from "../Tooltip/Tooltip";
import { BusinessOfTheMonth } from "../../data/communityHighlightsData";
import { getCategoryPng, getCategoryPngFromLabels, isPngIcon } from "../../utils/categoryToPngMapping";
import { useSavedItems } from "../../contexts/SavedItemsContext";
import { useToast } from "../../contexts/ToastContext";

export default function BusinessOfTheMonthCard({ business }: { business: BusinessOfTheMonth }) {
  const router = useRouter();
  const { toggleSavedItem, isItemSaved } = useSavedItems();
  const { showToast } = useToast();
  
  const idForSnap = useMemo(() => `business-month-${business.id}`, [business.id]);
  const [imgError, setImgError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  
  // Image rotation state
  const [imageRotation, setImageRotation] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = useRef(0);
  
  // Get business identifier for routing (slug or ID)
  const businessIdentifier = (business as any).slug || business.id;
  const reviewRoute = `/business/${businessIdentifier}/review`;
  const businessProfileRoute = business.href || `/business/${businessIdentifier}`;
  const isSaved = isItemSaved(business.id);

  const hasReviews = business.reviews > 0;
  const ribbonText = useMemo(() => {
    const src = business.monthAchievement || "";
    return src.replace(/^Best\s+/i, "Featured ");
  }, [business.monthAchievement]);

  // Image fallback logic with edge case handling
  const getDisplayImage = useMemo(() => {
    // Priority 1: Check for uploaded business image (not a PNG icon)
    const uploadedImage = (business as any).uploaded_image || (business as any).uploadedImage;
    if (uploadedImage && 
        typeof uploadedImage === 'string' && 
        uploadedImage.trim() !== '' &&
        !isPngIcon(uploadedImage) &&
        !uploadedImage.includes('/png/')) {
      return { image: uploadedImage, isPng: false };
    }

    // Priority 2: Check image_url (API compatibility)
    const imageUrl = business.image || (business as any).image_url;
    if (imageUrl && 
        typeof imageUrl === 'string' && 
        imageUrl.trim() !== '' &&
        !isPngIcon(imageUrl)) {
      return { image: imageUrl, isPng: false };
    }

    // Priority 3: Fallback to PNG based on specific labels (monthAchievement/category) for banners
    const categoryPng = getCategoryPngFromLabels([business.monthAchievement, business.category]);
    return { image: categoryPng, isPng: true };
  }, [business]);

  const displayImage = getDisplayImage.image;
  const isImagePng = getDisplayImage.isPng;
  const displayAlt = business.alt || business.name;
  const displayTotal = typeof business.totalRating === "number" ? business.totalRating : (business as any).rating || 0;

  // Handle image error - fallback to PNG if uploaded image fails
  const handleImageError = () => {
    if (!usingFallback && !isImagePng) {
      // If uploaded image fails, try category PNG
      setUsingFallback(true);
      setImgError(false); // Reset to try fallback
    } else {
      // PNG also failed or we're already using fallback
      setImgError(true);
    }
  };

  const badgeStyle = (badge: string) => {
    switch (badge) {
      case "winner":
        return "bg-gradient-to-r from-amber-500 to-yellow-600 text-white";
      case "runner-up":
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
      case "featured":
        return "bg-gradient-to-r from-sage to-sage/80 text-white";
      default:
        return "bg-sage/10 text-sage";
    }
  };

  const badgeIcon = () => (
    <Award className="w-4 h-4 text-white" strokeWidth={2.5} aria-hidden />
  );

  // Handle save/bookmark
  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const success = await toggleSavedItem(business.id);
    if (success) {
      // Toast is handled by SavedItemsContext
    }
  };

  // Handle write review
  const handleWriteReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    router.push(reviewRoute);
  };

  // Handle share
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const shareUrl = `${window.location.origin}${businessProfileRoute}`;
      const shareText = `Check out ${business.name} on sayso!`;
      
      if (navigator.share) {
        await navigator.share({
          title: business.name,
          text: shareText,
          url: shareUrl,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard!', 'success');
      }
    } catch (error) {
      // User cancelled or error occurred
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  // Handle card click - navigate to business page
  const handleCardClick = () => {
    router.push(businessProfileRoute);
  };

  // Desktop: Rotate image on hover
  const handleMouseEnter = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      const rotationAngle = (business.id.charCodeAt(0) % 2 === 0 ? 1.5 : -1.5);
      setImageRotation(rotationAngle);
    }
  };

  const handleMouseLeave = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setImageRotation(0);
    }
  };

  // Mobile: Track scroll direction for image rotation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isMobileDevice = window.innerWidth < 768;
    if (!isMobileDevice) return;

    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;
      
      if (Math.abs(scrollDelta) < 5) {
        return;
      }
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      if (scrollDelta > 0) {
        setImageRotation(0.8);
      } else {
        setImageRotation(-0.8);
      }
      
      lastScrollY.current = currentScrollY;
      
      scrollTimeoutRef.current = setTimeout(() => {
        setImageRotation(0);
      }, 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <li
      id={idForSnap}
      className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] xl:min-w-[25%] list-none"
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontWeight: 600,
      }}
    >
      <div
        className="relative px-2 sm:px-2 pt-2 pb-0 bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-visible group cursor-pointer w-full flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-md h-[650px] sm:h-auto md:w-[340px]"
        style={{
          maxWidth: "540px",
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
       
        {/* MEDIA - Full bleed with premium overlay */}
        <div
          className="relative overflow-hidden z-10 cursor-pointer backdrop-blur-xl h-[490px] sm:h-[320px] md:h-[240px]"
          onClick={handleCardClick}
        >
          <div 
            className="relative w-full h-full"
            style={{
              transform: `perspective(1000px) rotateZ(${imageRotation}deg)`,
              transformStyle: 'preserve-3d',
              transition: 'transform 0.4s cubic-bezier(0.33, 0.85, 0.4, 0.96)',
              willChange: 'transform',
              padding: '8px',
              boxSizing: 'border-box',
            }}
          >
            {!imgError && displayImage ? (
              isImagePng || displayImage.includes('/png/') || displayImage.endsWith('.png') || usingFallback ? (
                <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85 rounded-[20px] shadow-sm">
                  <Image
                    src={usingFallback ? getCategoryPng(business.category) : displayImage}
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
                <div className="relative w-full h-full overflow-hidden rounded-[20px] shadow-sm">
                  <Image
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
                  <Image
                    src={getCategoryPng(business.category)}
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

          {/* Achievement badge */}
          <div className="absolute left-4 bottom-4 z-20">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold shadow-md ${badgeStyle(
                business.badge
              )}`}
              aria-label={`${ribbonText} ${business.badge}`}
              title={`${ribbonText} — ${business.badge}`}
            >
              {badgeIcon()}
              <span>{ribbonText}</span>
            </span>
          </div>

          {hasReviews && displayTotal > 0 ? (
            <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/40 shadow-md">
              <Star className="rounded-full p-1 w-3.5 h-3.5 text-navbar-bg fill-navbar-bg shadow-md" strokeWidth={2.5} aria-hidden />
              <span className="text-sm font-semibold text-charcoal" style={{ 
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', 
                fontWeight: 600
              }}>
                {Number(displayTotal).toFixed(1)}
              </span>
            </div>
          ) : (
            <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/40 shadow-md">
              <span className="text-sm font-semibold text-charcoal" style={{ 
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', 
                fontWeight: 600
              }}>
                New
              </span>
            </div>
          )}

          {/* Premium floating actions - desktop only */}
          <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-2 transition-all duration-300 ease-out translate-x-12 opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100">
            <button
              className="w-12 h-10 bg-navbar-bg rounded-[20px] flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                handleWriteReview(e);
              }}
              aria-label={`Write a review for ${business.name}`}
              title="Write a review"
            >
              <Edit className="w-4 h-4 text-white" strokeWidth={2.5} />
            </button>
            <button
              className="w-12 h-10 bg-navbar-bg rounded-[20px] flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                handleBookmark(e);
              }}
              aria-label={`${isSaved ? 'Remove from saved' : 'Save'} ${business.name}`}
              title={isSaved ? 'Remove from saved' : 'Save'}
            >
              <Bookmark
                className={`w-4 h-4 ${isSaved ? 'text-white fill-white' : 'text-white'}`}
                strokeWidth={2.5}
              />
            </button>
            <button
              className="w-12 h-10 bg-navbar-bg rounded-[20px] flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                handleShare(e);
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
          className="px-4 sm:px-5 pt-2 pb-2 flex-1 relative flex-shrink-0 flex flex-col justify-between bg-sage/10 z-10 rounded-b-[20px]"
        >
          <div className="flex-1 flex flex-col">
            {/* Info Wrapper */}
            <div className="relative overflow-hidden">
              {/* Content - Centered */}
              <div className="flex flex-col items-center text-center relative z-10 space-y-1">
                {/* Business Name - Inside wrapper */}
                <div className="flex items-center justify-center w-full min-w-0 h-[3.5rem] sm:h-[4rem]">
                  <Tooltip content={business.name} position="top">
                    <button
                      type="button"
                      onClick={handleCardClick}
                      className="group w-full max-w-full min-w-0 text-charcoal transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 rounded-lg px-2 py-1 flex items-center justify-center"
                      aria-label={`View ${business.name} details`}
                    >
                      <h3
                        className="text-h2 sm:text-h1 font-bold text-inherit text-center leading-[1.3] truncate tracking-tight transition-colors duration-300 group-hover:text-navbar-bg/90 w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
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
                  className="flex items-center justify-center gap-1.5 text-caption sm:text-xs text-charcoal/60 h-5 min-h-[20px] max-h-[20px]"
                  style={{
                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    fontWeight: 600,
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'optimizeLegibility',
                    letterSpacing: '0.01em'
                  }}
                >
                  <span className="truncate">{business.category}</span>
                  {((business as any).address || business.location) && (
                    <>
                      <span aria-hidden>·</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.name} ${(business as any).address || business.location || ''}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-caption sm:text-xs font-semibold text-charcoal/60 transition-colors duration-200 hover:text-navbar-bg/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/30 rounded-full px-2 py-1 min-w-0"
                        aria-label={`Open ${business.name} in maps`}
                      >
                        <MapPin className="rounded-full p-1 w-5 h-5 text-navbar-bg/90 stroke-[2.5] transition-colors duration-200 group-hover:text-navbar-bg/90 flex-shrink-0 shadow-md" />
                        <span className="truncate max-w-[8rem] sm:max-w-[10rem]" title={(business as any).address || business.location}>
                          {/* Always prefer address (which includes street number) over location */}
                          {(business as any).address ? (business as any).address : business.location}
                        </span>
                      </a>
                    </>
                  )}
                </div>

                {/* Reviews - Refined */}
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className="inline-flex items-center justify-center gap-1 min-h-[20px]">
                    {hasReviews ? (
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
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWriteReview(e);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(reviewRoute);
                          }
                        }}
                        className="inline-flex items-center justify-center text-sm font-normal underline-offset-2 min-w-[92px] text-center transition-colors duration-200 text-charcoal cursor-pointer hover:text-coral"
                        style={{
                          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                          fontWeight: 400
                        }}
                        title="Be the first to review"
                      >
                        Be the first to review
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-charcoal transition-all duration-300"
                    aria-label={hasReviews ? `View ${business.reviews} reviews for ${business.name}` : `Be the first to review ${business.name}`}
                  >
                    <Stars value={hasReviews && displayTotal > 0 ? displayTotal : 0} color="navbar-bg" size={18} spacing={2.5} />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Mobile actions - Minimal */}
          <div className="flex md:hidden items-center justify-center pt-4 border-t border-off-white/30">
            <button
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-full text-caption sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage/40 border transition-all min-h-[48px] bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white border-sage/50 active:scale-95 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                handleWriteReview(e);
              }}
              aria-label={`Write a review for ${business.name}`}
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              <Edit className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Review</span>
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
