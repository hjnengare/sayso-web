// src/components/BusinessOfTheMonthCard/BusinessOfTheMonthCard.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Image as ImageIcon, Star, Edit, Bookmark, Share2, MapPin, Award } from "react-feather";
import Stars from "../Stars/Stars";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import Tooltip from "../Tooltip/Tooltip";
import { BusinessOfTheMonth } from "../../data/communityHighlightsData";
import { getCategoryPng, getCategoryPngFromLabels, isPngIcon } from "../../utils/categoryToPngMapping";

export default function BusinessOfTheMonthCard({ business }: { business: BusinessOfTheMonth }) {
  const idForSnap = useMemo(() => `business-month-${business.id}`, [business.id]);
  const [imgError, setImgError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

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
    <Award className="w-4 h-4 text-white" aria-hidden />
  );

  return (
    <li
      id={idForSnap}
      className="list-none snap-start snap-always w-[100vw] sm:w-auto sm:min-w-[25%] md:min-w-[25%] xl:min-w-[25%] flex-shrink-0"
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        fontWeight: 600,
      }}
    >
      <div
        className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-visible group cursor-pointer h-[650px] sm:h-auto flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-premiumElevated transition-all duration-300 hover:border-white/80 hover:-translate-y-1 hover:shadow-premiumElevatedHover"
        style={{ "--width": "540", "--height": "650" } as React.CSSProperties}
      >
        {/* Glass depth overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-off-white/8 via-transparent to-transparent pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none z-0" />
        {/* Media */}
        <div className="relative overflow-hidden rounded-t-[12px] flex-1 sm:flex-initial z-10 border-b border-white/60">
          <div className="relative w-full h-[490px] sm:h-[320px] md:h-[220px]">
            {!imgError && displayImage ? (
              isImagePng || displayImage.includes('/png/') || displayImage.endsWith('.png') || usingFallback ? (
                // Display PNG files as icons with page background
                <div className="w-full h-[490px] sm:h-[320px] md:h-[220px] flex items-center justify-center bg-off-white/90 rounded-t-[12px]">
                <Image
                    src={usingFallback ? getCategoryPng(business.category) : displayImage}
                    alt={displayAlt}
                    width={128}
                    height={128}
                    className="w-28 h-28 sm:w-28 sm:h-28 object-contain"
                    priority={false}
                    loading="lazy"
                    quality={85}
                    onError={handleImageError}
                    sizes="128px"
                  />
                </div>
              ) : (
                // Regular full image for uploaded business images
                <Image
                  src={displayImage}
                  alt={displayAlt}
                  width={400}
                  height={320}
                  className="h-[490px] sm:h-[320px] md:h-[220px] w-full object-cover rounded-t-[12px]"
                  priority={false}
                  loading="lazy"
                  quality={85}
                  onError={handleImageError}
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              )
            ) : (
              // Final fallback - show icon placeholder
              <div className="w-full h-[490px] sm:h-[320px] md:h-[220px] flex items-center justify-center bg-off-white/90 rounded-t-[12px]">
                <div className="w-28 h-28 sm:w-28 sm:h-28 flex items-center justify-center">
                  <Image
                    src={getCategoryPng(business.category)}
                    alt={displayAlt}
                    width={128}
                    height={128}
                    className="w-full h-full object-contain"
                    priority={false}
                    loading="lazy"
                    quality={85}
                    onError={() => {
                      // Even PNG fallback failed
                      setImgError(true);
                    }}
                    sizes="128px"
                  />
                </div>
              </div>
            )}
            {/* Show error icon only if all fallbacks failed */}
            {imgError && (
              <div className="absolute inset-0 flex items-center justify-center bg-sage/10 text-sage rounded-t-[12px]">
                <ImageIcon className="w-12 h-12 md:w-16 md:h-16 text-sage/70" />
              </div>
            )}
          </div>


          {/* Achievement badge */}
          <div className="absolute left-2 bottom-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${badgeStyle(
                business.badge
              )}`}
              aria-label={`${ribbonText} ${business.badge}`}
              title={`${ribbonText} — ${business.badge}`}
            >
              {badgeIcon()}
              <span>{ribbonText}</span>
            </span>
          </div>

          {/* Verified */}
          {business.verified && (
            <div className="absolute left-2 top-2 z-10">
              <VerifiedBadge />
            </div>
          )}

          {/* rating badge */}
          <span className="absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-[12px] bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/40">
            <Star className="w-3.5 h-3.5 text-navbar-bg fill-navbar-bg" />
            <span className="text-sm font-semibold" style={{
              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              fontWeight: 600,
            }}>
              {hasReviews ? Number(displayTotal).toFixed(1) : "New"}
            </span>
          </span>

          {/* actions - desktop only */}
          <div
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 flex-col gap-2 transition-all duration-300 ease-out translate-x-12 opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100"
          >
            <button
              className="w-10 h-10 bg-off-white/95 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40"
              onClick={(e) => {
                e.stopPropagation();
                // Handle write review
              }}
              aria-label={`Write a review for ${business.name}`}
              title="Write a review"
            >
              <Edit className="w-4 h-4 text-primary" />
            </button>
            <button
              className="w-10 h-10 bg-off-white/95 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40"
              onClick={(e) => {
                e.stopPropagation();
                // Handle bookmark
              }}
              aria-label={`Save ${business.name}`}
              title="Save"
            >
              <Bookmark className="w-4 h-4 text-primary" />
            </button>
            <button
              className="w-10 h-10 bg-off-white/95 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 border border-white/40"
              onClick={(e) => {
                e.stopPropagation();
                // Handle share
              }}
              aria-label={`Share ${business.name}`}
              title="Share"
            >
              <Share2 className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-4 pt-4 pb-6 relative flex-shrink-0 z-10 bg-gradient-to-br from-sage/12 via-sage/8 to-sage/10 rounded-b-[12px] border-t border-white/30">
          <div className="mb-2 cursor-pointer w-full min-w-0 h-[3.5rem] sm:h-[4rem] flex items-center justify-center">
            <Tooltip content={business.name} position="top">
              <h3 className="text-h2 sm:text-h1 font-bold text-charcoal group-hover:text-coral/90 transition-colors duration-300 text-center truncate w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap" style={{ 
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', 
                fontWeight: 700,
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textRendering: 'optimizeLegibility',
                letterSpacing: '-0.01em'
              }}>
                {business.name}
              </h3>
            </Tooltip>
          </div>

          <div className="mb-3 flex items-center justify-center gap-1.5 text-caption sm:text-xs text-charcoal/60 cursor-pointer" style={{ 
            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
            fontWeight: 400,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
            letterSpacing: '0.01em'
          }}>
            <span>{business.category}</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-charcoal/60" />
              <span>{business.location}</span>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-center gap-2 cursor-pointer">
            <Stars value={business.rating} color="navbar-bg" />
            {hasReviews ? (
              <>
                <p className="text-body-sm sm:text-base font-bold leading-none text-charcoal" style={{ 
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
                  fontWeight: 700,
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textRendering: 'optimizeLegibility'
                }}>
                  {business.reviews}
                </p>
                <p className="text-caption sm:text-xs leading-none text-charcoal/50" style={{ 
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
                  fontWeight: 400,
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textRendering: 'optimizeLegibility'
                }}>reviews</p>
              </>
            ) : (
              <p className="text-sm sm:text-xs leading-none text-charcoal/60" style={{ 
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
                fontWeight: 600,
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textRendering: 'optimizeLegibility'
              }}>No reviews yet</p>
            )}
          </div>

          {/* Mobile actions - always visible on card */}
          <div className="flex md:hidden items-center justify-center gap-3 mt-3">
            <button
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white rounded-full text-caption sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage/40 border border-sage/50 transition-all active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                // Handle write review
              }}
              aria-label={`Write a review for ${business.name}`}
              style={{ 
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", 
                fontWeight: 600,
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textRendering: 'optimizeLegibility'
              }}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Review</span>
            </button>
            <button
              className="w-9 h-9 bg-gradient-to-br from-off-white via-white to-off-white/95 backdrop-blur-xl rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sage/40 border border-white/40 transition-all active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                // Handle bookmark
              }}
              aria-label={`Save ${business.name}`}
            >
              <Bookmark className="w-4 h-4 text-charcoal" />
            </button>
            <button
              className="w-9 h-9 bg-gradient-to-br from-off-white via-white to-off-white/95 backdrop-blur-xl rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sage/40 border border-white/40 transition-all active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                // Handle share
              }}
              aria-label={`Share ${business.name}`}
            >
              <Share2 className="w-4 h-4 text-charcoal" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
