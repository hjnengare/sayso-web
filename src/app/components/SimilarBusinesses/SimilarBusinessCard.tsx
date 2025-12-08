"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Star, MapPin } from "react-feather";
import { getCategoryPng, isPngIcon } from "../../utils/categoryToPngMapping";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import OptimizedImage from "../Performance/OptimizedImage";
import Stars from "../Stars/Stars";

const formatCategoryLabel = (value?: string) => {
  if (!value) return "Explore";
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

interface SimilarBusinessCardProps {
  id: string;
  name: string;
  image?: string;
  image_url?: string;
  uploaded_image?: string;
  category: string;
  location: string;
  address?: string;
  rating?: number;
  totalRating?: number;
  reviews?: number;
  total_reviews?: number;
  verified?: boolean;
  priceRange?: string;
  price_range?: string;
}

export default function SimilarBusinessCard({
  id,
  name,
  image,
  image_url,
  uploaded_image,
  category,
  location,
  address,
  rating,
  totalRating,
  reviews,
  total_reviews,
  verified,
  priceRange,
  price_range,
}: SimilarBusinessCardProps) {
  const router = useRouter();
  
  // Determine display image
  const displayImage = uploaded_image || image_url || image || getCategoryPng(category);
  const isImagePng = isPngIcon(displayImage) || displayImage.includes('/png/');
  const displayRating = rating || totalRating || 0;
  const displayReviews = reviews || total_reviews || 0;
  const hasRating = displayRating > 0;
  const displayCategoryLabel = formatCategoryLabel(category);

  const handleCardClick = () => {
    router.push(`/business/${id}`);
  };

  return (
    <div
      className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-visible group cursor-pointer w-full flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-premiumElevated transition-all duration-300 hover:border-white/80 hover:-translate-y-1 hover:shadow-premiumElevatedHover h-auto sm:h-auto md:w-[340px]"
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
      {/* Glass depth overlay - Enhanced */}
      <div className="absolute inset-0 bg-gradient-to-br from-off-white/8 via-transparent to-transparent pointer-events-none z-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none z-0" />
      
      {/* MEDIA - Full bleed with premium overlay */}
      <div
        className="relative overflow-hidden z-10 cursor-pointer rounded-t-[12px] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 border-b border-white/60 backdrop-blur-xl h-[490px] sm:h-[320px] md:h-[240px]"
        onClick={handleCardClick}
      >
        <div className="relative w-full h-full">
          {isImagePng || displayImage.includes('/png/') || displayImage.endsWith('.png') ? (
            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85">
            <OptimizedImage
              src={displayImage}
              alt={name}
                width={320}
                height={350}
                sizes="(max-width: 768px) 540px, 340px"
                className="w-32 h-32 md:w-36 md:h-36 object-contain"
              priority={false}
              quality={90}
            />
          </div>
        ) : (
            <div className="relative w-full h-full overflow-hidden">
              <OptimizedImage
              src={displayImage}
              alt={name}
                width={340}
                height={400}
                sizes="(max-width: 768px) 540px, 340px"
                className="w-full h-full object-cover"
              priority={false}
                quality={90}
            />
          </div>
        )}
        
          {/* Premium glass badges */}
        {verified && (
            <div className="absolute left-4 top-4 z-20">
            <VerifiedBadge />
          </div>
        )}
        
          {hasRating && displayRating !== undefined && (
            <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/40">
              <Star className="w-3.5 h-3.5 text-navbar-bg fill-navbar-bg" aria-hidden />
              <span className="text-sm font-semibold text-charcoal" style={{ 
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', 
                fontWeight: 600
            }}>
              {Number(displayRating).toFixed(1)}
            </span>
          </div>
        )}

          {!hasRating && (
            <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/40">
              <span className="text-sm font-semibold text-charcoal" style={{ 
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', 
                fontWeight: 600
              }}>
                New
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CONTENT - Minimal, premium spacing */}
      <div
        className="px-4 sm:px-5 pt-2 pb-2 flex-1 relative flex-shrink-0 flex flex-col justify-between bg-sage/10 z-10 rounded-b-[12px]"
      >
        <div className="flex-1 flex flex-col">
          {/* Info Wrapper */}
          <div className="relative overflow-hidden">
            {/* Content - Centered */}
            <div className="flex flex-col items-center text-center relative z-10 space-y-1">
              {/* Business Name - Inside wrapper */}
              <div className="flex items-center justify-center w-full min-w-0 h-[3.5rem] sm:h-[4rem]">
          <h3
                  className="text-h2 sm:text-h1 font-bold text-charcoal text-center leading-[1.3] truncate tracking-tight transition-colors duration-300 group-hover:text-navbar-bg/90 w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
            style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              fontWeight: 700,
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'optimizeLegibility',
                    letterSpacing: '-0.01em'
            }}
            title={name}
          >
            {name}
          </h3>
        </div>

              {/* Category and Location - Combined with bullet separator */}
              <div
                className="flex items-center justify-center gap-1.5 text-caption sm:text-xs text-charcoal/60 h-5 min-h-[20px] max-h-[20px]"
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
                {(address || location) && (
                  <>
                    <span aria-hidden>·</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${location || address || ''}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-caption sm:text-xs font-normal text-charcoal/60 transition-colors duration-200 hover:text-navbar-bg/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/30 rounded-full px-2 py-1 min-w-0"
                      aria-label={`Open ${name} in maps`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MapPin className="w-3 h-3 text-navbar-bg/90 stroke-[2.5] transition-colors duration-200 group-hover:text-navbar-bg/90 flex-shrink-0" />
                      <span className="truncate max-w-[8rem] sm:max-w-[10rem]">{location || address}</span>
                    </a>
                  </>
                )}
        </div>

              {/* Reviews - Refined */}
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="inline-flex items-center justify-center gap-1 min-h-[20px]">
                  {hasRating && displayRating !== undefined && displayReviews > 0 ? (
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
                        {displayReviews}
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
                      className="inline-flex items-center justify-center text-sm font-normal underline-offset-2 min-w-[92px] text-center transition-colors duration-200 text-charcoal cursor-pointer hover:text-coral"
                      style={{
                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                        fontWeight: 400
                      }}
                    >
                      Be the first to review
            </span>
          )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="flex items-center justify-center gap-2 text-charcoal transition-all duration-300"
                    aria-label={hasRating && displayRating !== undefined ? `View ${displayReviews} reviews for ${name}` : `Be the first to review ${name}`}
                  >
                    <Stars value={hasRating && displayRating !== undefined ? displayRating : 0} color="navbar-bg" size={18} spacing={2.5} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

