"use client";

import React, { memo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Star } from "lucide-react";
import Image from "next/image";
import { Scissors, Coffee, UtensilsCrossed, Wine, Dumbbell, Activity, Heart, Book, ShoppingBag, Home, Briefcase, MapPin, Music, Film, Camera, Car, GraduationCap, CreditCard, Tag } from "lucide-react";
import { ImageIcon } from "lucide-react";
import { getCategoryPlaceholder, isPlaceholderImage } from "../../utils/categoryToPngMapping";
import { getCategorySlugFromBusiness } from "../../utils/subcategoryPlaceholders";

interface SimilarBusinessCardProps {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  image_url?: string;
  uploaded_images?: string[];
  category: string;
  location: string;
  address?: string;
  description?: string;
  rating?: number;
  totalRating?: number;
  reviews?: number;
  total_reviews?: number;
  verified?: boolean;
  priceRange?: string;
  price_range?: string;
  compact?: boolean;
  distanceKm?: number;
  sub_interest_id?: string | null;
  subInterestId?: string;
  subInterestLabel?: string;
}

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
  if (searchTerm.includes('photo') || searchTerm.includes('photography') || searchTerm.includes('camera')) {
    return Camera;
  }
  
  // Travel & Transport
  if (searchTerm.includes('car') || searchTerm.includes('auto') || searchTerm.includes('vehicle') || searchTerm.includes('transport')) {
    return Car;
  }
  if (searchTerm.includes('travel') || searchTerm.includes('hotel') || searchTerm.includes('accommodation')) {
    return MapPin;
  }
  
  // Home & Lifestyle
  if (searchTerm.includes('home') || searchTerm.includes('house') || searchTerm.includes('property') || searchTerm.includes('real estate')) {
    return Home;
  }
  
  // Default
  return Tag;
};

function SimilarBusinessCard({
  id,
  slug,
  name,
  image,
  image_url,
  uploaded_images,
  category,
  location,
  address,
  description,
  rating,
  totalRating,
  reviews,
  total_reviews,
  verified,
  priceRange,
  price_range,
  compact = false,
  distanceKm,
  sub_interest_id,
  subInterestId,
  subInterestLabel,
}: SimilarBusinessCardProps) {
  const router = useRouter();
  
  const [imgError, setImgError] = React.useState(false);
  const [usingFallback, setUsingFallback] = React.useState(false);

  // Use canonical subcategory slug (sub_interest_id → subInterestId → … → category) for placeholder
  const categorySlug = getCategorySlugFromBusiness({ sub_interest_id, subInterestId, category });
  const placeholderSrc = getCategoryPlaceholder(categorySlug || undefined);

  const rawImage = (uploaded_images && uploaded_images.length > 0 && !isPlaceholderImage(uploaded_images[0]) ? uploaded_images[0] : null)
    || (image_url && !isPlaceholderImage(image_url) ? image_url : null)
    || (image && !isPlaceholderImage(image) ? image : null);
  const isPlaceholder = !rawImage;
  const displayImage = rawImage || placeholderSrc;

  const handleImageError = () => {
    if (!usingFallback && !isPlaceholder) {
      setUsingFallback(true);
      setImgError(false);
    } else {
      setImgError(true);
    }
  };

  // Use slug for SEO-friendly URLs, fallback to ID
  const businessIdentifier = slug || id;

  const handleCardClick = () => {
    router.push(`/business/${businessIdentifier}`);
  };

  return (
    <div
      className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden group cursor-pointer w-full flex flex-col border border-white/60 backdrop-blur-xl shadow-md transition-all duration-300 hover:border-white/80 hover:-translate-y-1 hover:shadow-lg md:w-[340px] md:h-[416px]"
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
      {/* Image Section */}
      <div className="relative w-full h-[300px] lg:h-[260px] overflow-hidden rounded-t-[12px]">
        {/* Rating badge */}
        {typeof rating === "number" && rating > 0 && (
          <div className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-2.5 py-1 text-charcoal shadow-md border border-white/40">
            <Star className="w-4 h-4 text-charcoal fill-charcoal" strokeWidth={2.5} aria-hidden />
            <span
              className="text-xs font-semibold text-charcoal"
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
            >
              {Number(rating).toFixed(1)}
            </span>
          </div>
        )}

        {!imgError ? (
          <div className="relative w-full h-full overflow-hidden bg-card-bg">
            {/* Blurred background */}
            <div className="absolute inset-0">
              <Image
                src={usingFallback ? placeholderSrc : displayImage}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 540px, 340px"
                priority={false}
                quality={50}
                loading="lazy"
                style={{
                  filter: 'blur(40px)',
                  opacity: 0.6,
                  transform: 'scale(1.2)',
                }}
                aria-hidden="true"
              />
            </div>

            {/* Foreground image */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src={usingFallback ? placeholderSrc : displayImage}
                alt={name}
                fill
                className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.02] group-active:scale-[0.98] motion-reduce:transition-none"
                sizes="(max-width: 768px) 540px, 340px"
                priority={false}
                quality={90}
                loading="lazy"
                onError={handleImageError}
              />
            </div>
            {/* Premium depth overlay */}
            <div
              className="absolute inset-0 pointer-events-none z-[1] transition-opacity duration-500 ease-out group-hover:opacity-0 motion-reduce:transition-none"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.02) 30%, transparent 60%)",
              }}
              aria-hidden="true"
            />
          </div>
        ) : (
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{ backgroundColor: '#E5E0E5' }}
          >
            <ImageIcon className="w-16 h-16 text-charcoal/20" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="px-4 py-4 bg-gradient-to-b from-card-bg/95 to-card-bg flex flex-col gap-2 rounded-b-[12px]">
        {/* Name */}
        <h3
          className="text-base sm:text-lg font-bold text-charcoal leading-tight line-clamp-1 transition-colors duration-300 group-hover:text-navbar-bg/90"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            fontWeight: 700,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
          }}
          title={name}
        >
          {name}
        </h3>

        {/* Meta: rating / reviews (subtle) */}
        {(typeof rating === "number" && rating > 0) || (typeof reviews === "number" && reviews > 0) ? (
          <div className="flex items-center justify-center gap-2 text-xs text-charcoal/60 -mt-0.5">
            {typeof rating === "number" && rating > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-coral fill-coral" aria-hidden />
                <span className="font-semibold text-charcoal/70">{Number(rating).toFixed(1)}</span>
              </span>
            )}
            {typeof reviews === "number" && reviews > 0 && (
              <span className="text-charcoal/60">
                {reviews} {reviews === 1 ? "review" : "reviews"}
              </span>
            )}
          </div>
        ) : null}

        {/* Description */}
        {description && (
          <p
            className="text-sm text-charcoal/70 line-clamp-2 leading-snug"
            style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              fontWeight: 400,
            }}
          >
            {description}
          </p>
        )}

        {/* Location */}
        {(location || address) && (
          <div className="flex items-center gap-1.5 text-xs text-charcoal/60 mt-1">
            {(() => {
              const CategoryIcon = getCategoryIcon(category, categorySlug || subInterestId, subInterestLabel);
              return (
                <div className="w-8 h-8 rounded-full bg-navbar-bg/50 flex items-center justify-center flex-shrink-0">
                  <CategoryIcon className="w-4 h-4 text-white/80" strokeWidth={2.5} />
            </div>
              );
            })()}
            <span className="truncate">{address || location}</span>
            {typeof distanceKm === "number" && distanceKm > 0 && (
              <span className="flex-shrink-0 text-charcoal/50">
                • {distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km
              </span>
            )}
          </div>
        )}

        {/* Go to Business Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white rounded-full text-sm font-semibold hover:from-navbar-bg/90 hover:to-navbar-bg/80 active:scale-95 transition-all duration-200 shadow-md border border-sage/50 focus:outline-none focus:ring-2 focus:ring-sage/40"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            fontWeight: 600,
          }}
        >
          <span>Go to business</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when parent list updates
export default memo(SimilarBusinessCard);
