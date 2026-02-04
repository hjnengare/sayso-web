// src/components/BusinessOfTheMonthCard/BusinessOfTheMonthCard.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Star, Edit, Bookmark, Share2, Award } from "lucide-react";
import { Scissors, Coffee, UtensilsCrossed, Wine, Dumbbell, Activity, Heart, Book, ShoppingBag, Home, Briefcase, MapPin, Music, Film, Camera, Car, GraduationCap, CreditCard, Tag } from "lucide-react";
import Stars from "../Stars/Stars";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import Tooltip from "../Tooltip/Tooltip";
import { BusinessOfTheMonth } from "../../types/community";
import { getCategoryPlaceholder, isPlaceholderImage } from "../../utils/categoryToPngMapping";
import { getSubcategoryLabel } from "../../utils/subcategoryPlaceholders";
import { useSavedItems } from "../../contexts/SavedItemsContext";
import { useToast } from "../../contexts/ToastContext";

// Map categories to lucide-react icons (normalize only for icon selection)
const getCategoryIcon = (category: string): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
  const normalizedCategory = (category || '').toLowerCase();
  const searchTerm = normalizedCategory;
  // ...existing icon logic...
  if (searchTerm.includes('salon') || searchTerm.includes('hairdresser') || searchTerm.includes('nail')) return Scissors;
  if (searchTerm.includes('cafe') || searchTerm.includes('coffee')) return Coffee;
  if (searchTerm.includes('restaurant') || searchTerm.includes('dining') || searchTerm.includes('food') || searchTerm.includes('drink')) return UtensilsCrossed;
  if (searchTerm.includes('bar') || searchTerm.includes('pub')) return Wine;
  if (searchTerm.includes('gym') || searchTerm.includes('fitness') || searchTerm.includes('workout')) return Dumbbell;
  if (searchTerm.includes('spa') || searchTerm.includes('wellness') || searchTerm.includes('massage')) return Activity;
  if (searchTerm.includes('health') || searchTerm.includes('medical')) return Heart;
  if (searchTerm.includes('shop') || searchTerm.includes('store') || searchTerm.includes('retail') || searchTerm.includes('fashion') || searchTerm.includes('clothing')) return ShoppingBag;
  if (searchTerm.includes('book') || searchTerm.includes('library')) return Book;
  if (searchTerm.includes('education') || searchTerm.includes('school') || searchTerm.includes('learn')) return GraduationCap;
  if (searchTerm.includes('finance') || searchTerm.includes('bank') || searchTerm.includes('insurance')) return CreditCard;
  if (searchTerm.includes('business') || searchTerm.includes('office') || searchTerm.includes('professional')) return Briefcase;
  if (searchTerm.includes('music') || searchTerm.includes('concert') || searchTerm.includes('venue')) return Music;
  if (searchTerm.includes('movie') || searchTerm.includes('cinema') || searchTerm.includes('theater') || searchTerm.includes('theatre')) return Film;
  if (searchTerm.includes('art') || searchTerm.includes('gallery') || searchTerm.includes('museum')) return Camera;
  if (searchTerm.includes('travel') || searchTerm.includes('transport') || searchTerm.includes('hotel')) return MapPin;
  if (searchTerm.includes('car') || searchTerm.includes('auto') || searchTerm.includes('vehicle')) return Car;
  if (searchTerm.includes('home') || searchTerm.includes('decor') || searchTerm.includes('furniture')) return Home;
  return Tag;
};

export default function BusinessOfTheMonthCard({ business, index: _index = 0 }: { business: BusinessOfTheMonth; index?: number }) {
  const router = useRouter();
  const { toggleSavedItem, isItemSaved } = useSavedItems();
  const { showToast } = useToast();
  
  const idForSnap = useMemo(() => `business-month-${business.id}`, [business.id]);
  const [imgError, setImgError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // Get business identifier for routing (slug or ID)
  const businessIdentifier = (business as any).slug || business.id;
  const reviewRoute = `/business/${businessIdentifier}/review`;
  const businessProfileRoute = (business as any).href || `/business/${businessIdentifier}`;
  const isSaved = isItemSaved(business.id);

  const hasReviews = business.reviewCount > 0;
  const ribbonText = useMemo(() => {
    const reasonLabel = (business as any).ui_hints?.reason?.label;
    const src = reasonLabel || (business as any).monthAchievement || business.badge || "Featured";
    return src.replace(/^Best\s+/i, "Featured ");
  }, [(business as any).monthAchievement, (business as any).ui_hints?.reason?.label, business.badge]);

  // Image fallback logic with edge case handling
  const getDisplayImage = useMemo(() => {
    // Priority 1: Check for uploaded business images array
    const uploadedImages = (business as any).uploaded_images;
    if (uploadedImages && Array.isArray(uploadedImages) && uploadedImages.length > 0) {
      const firstImage = uploadedImages[0];
      if (firstImage &&
          typeof firstImage === 'string' &&
          firstImage.trim() !== '' &&
          !isPlaceholderImage(firstImage)) {
        return { image: firstImage, isPlaceholder: false };
      }
    }

    // Priority 2: Check image_url (API compatibility)
    const imageUrl = business.image || (business as any).image_url;
    if (imageUrl &&
        typeof imageUrl === 'string' &&
        imageUrl.trim() !== '' &&
        !isPlaceholderImage(imageUrl)) {
      return { image: imageUrl, isPlaceholder: false };
    }

    // Priority 3: Subcategory placeholder — use canonical slug so we get the correct image, not default
    const categorySlug = (business as any).sub_interest_id ?? (business as any).subInterestId ?? business.category;
    const placeholder = getCategoryPlaceholder(categorySlug);
    return { image: placeholder, isPlaceholder: true };
  }, [business]);

  const displayImage = getDisplayImage.image;
  const isPlaceholder = getDisplayImage.isPlaceholder;
  const displayAlt = (business as any).alt || business.name;
  const displayTotal =
    (typeof business.totalRating === "number" && business.totalRating > 0 && business.totalRating) ||
    (typeof business.rating === "number" && business.rating > 0 && business.rating) ||
    (typeof business?.stats?.average_rating === "number" && business.stats.average_rating > 0 && business.stats.average_rating) ||
    0;

  // Handle image error - fallback to placeholder if uploaded image fails
  const handleImageError = () => {
    if (!usingFallback && !isPlaceholder) {
      setUsingFallback(true);
      setImgError(false);
    } else {
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

  return (
    <li
      id={idForSnap}
      className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto sm:w-[260px] md:w-[340px] list-none"
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontWeight: 600,
      }}
    >
      <div
        className="relative px-1 pt-1 pb-2 sm:pb-0 bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-visible group cursor-pointer w-full flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-md sm:h-auto"
        style={{
          maxWidth: "540px",
        } as React.CSSProperties}
        role="link"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
       
        {/* MEDIA - Full bleed with premium overlay */}
        <div
          className="relative overflow-hidden z-10 cursor-pointer backdrop-blur-xl h-[280px] sm:h-[220px] md:h-[240px]"
          onClick={handleCardClick}
        >
          <div 
            className="relative w-full h-full"
          >
            {!imgError && displayImage ? (
              <div className="relative w-full h-full overflow-hidden rounded-[12px] shadow-sm">
                <Image
                  src={usingFallback ? getCategoryPlaceholder((business as any).sub_interest_id ?? (business as any).subInterestId ?? business.category) : displayImage}
                  alt={displayAlt}
                  fill
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 50vw, 340px"
                  className="object-cover"
                  priority={false}
                  quality={75}
                  onError={handleImageError}
                />
              </div>
            ) : (
              <div
                className="relative w-full h-full flex items-center justify-center rounded-[12px]"
                style={{ backgroundColor: '#E5E0E5' }}
              >
                <ImageIcon className="w-16 h-16 text-charcoal/20" aria-hidden="true" />
              </div>
            )}
          </div>


          {/* Premium glass badges */}
          {(business as any).verified && (
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
            <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/40">
              <Star className="rounded-full p-1 w-6 h-6 text-charcoal fill-charcoal" strokeWidth={2.5} aria-hidden />
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
              className="w-12 h-10 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md"
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
              className="w-12 h-10 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md"
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
              className="w-12 h-10 bg-navbar-bg rounded-full flex items-center justify-center hover:bg-navbar-bg/90 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40 shadow-md"
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
          className="px-4 py-3 sm:px-5 sm:pt-1 md:pt-2 lg:pt-3 pb-0 flex-1 relative flex-shrink-0 flex flex-col md:justify-start justify-between bg-sage/10 z-10 rounded-b-[12px]"
        >
          <div className="flex-1 flex flex-col">
            {/* Info Wrapper */}
            <div className="relative overflow-hidden">
              {/* Content - Centered */}
              <div className="flex flex-col items-center text-center relative z-10 space-y-1">
                {/* Business Name - Inside wrapper */}
                <div className="flex items-center justify-center w-full min-w-0">
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
                {/* Category with icon */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  {/* Category row with icon - Pill badge style */}
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5">
                    {(() => {
                      const categorySlug = (business as any).sub_interest_id ?? (business as any).subInterestId ?? business.category;
                      const categoryLabel = (business as any).subInterestLabel ?? getSubcategoryLabel(categorySlug);
                      const CategoryIcon = getCategoryIcon(categoryLabel);
                      return (
                        <>
                          <div className="w-8 h-8 rounded-full bg-off-white/20 flex items-center justify-center flex-shrink-0">
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
                            {categoryLabel}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Reviews - Refined */}
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className="inline-flex items-center justify-center gap-1 min-h-[12px]">
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
                          {business.reviewCount}
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
                    aria-label={hasReviews ? `View ${business.reviewCount} reviews for ${business.name}` : `Be the first to review ${business.name}`}
                  >
                    <Stars value={hasReviews && displayTotal > 0 ? displayTotal : 0} color="charcoal" size={18} spacing={2.5} />
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
