"use client";

import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Star, ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { BusinessOfTheMonth } from "../../types/community";
import { getCategoryPlaceholder, getCategoryPlaceholderFromLabels, isPlaceholderImage } from "../../utils/categoryToPngMapping";
import { getCategorySlugFromBusiness } from "../../utils/subcategoryPlaceholders";

interface BusinessOfMonthPodiumProps {
  topBusinesses: BusinessOfTheMonth[];
}

// Helper component for business image with fallback logic
function BusinessImage({ business, size }: { business: BusinessOfTheMonth; size: 'small' | 'medium' | 'large' }) {
  const [imgError, setImgError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // Image fallback logic - matches BusinessCard pattern (sub_interest_id → subInterestId → … → category)
  const categoryKey = getCategorySlugFromBusiness(business as any) || "default";
  const getDisplayImage = useMemo(() => {
    const uploadedImages = (business as any).uploaded_images;
    if (uploadedImages && Array.isArray(uploadedImages) && uploadedImages.length > 0) {
      const firstImageUrl = uploadedImages[0];
      if (firstImageUrl &&
        typeof firstImageUrl === 'string' &&
        firstImageUrl.trim() !== '' &&
        !isPlaceholderImage(firstImageUrl)) {
        return { image: firstImageUrl, isPlaceholder: false };
      }
    }

    const imageUrl = (business as any).image_url;
    if (imageUrl &&
      typeof imageUrl === 'string' &&
      imageUrl.trim() !== '' &&
      !isPlaceholderImage(imageUrl)) {
      return { image: imageUrl, isPlaceholder: false };
    }

    if (business.image &&
      typeof business.image === 'string' &&
      business.image.trim() !== '' &&
      !isPlaceholderImage(business.image)) {
      return { image: business.image, isPlaceholder: false };
    }

    const placeholder = getCategoryPlaceholderFromLabels([
      (business as any).subInterestId,
      (business as any).subInterestLabel,
      business.category,
      categoryKey,
      business.monthAchievement
    ], (business as any).interestId);
    return { image: placeholder, isPlaceholder: true };
  }, [
    business.image,
    (business as any).image_url,
    (business as any).uploaded_images,
    categoryKey,
    business.category,
    business.monthAchievement,
    (business as any).interestId,
  ]);

  const displayImage = getDisplayImage.image;
  const isPlaceholder = getDisplayImage.isPlaceholder;
  const displayAlt = business.alt || business.name;

  const handleImageError = () => {
    if (!usingFallback && !isPlaceholder) {
      setUsingFallback(true);
      setImgError(false);
    } else {
      setImgError(true);
    }
  };

  const sizeClasses = {
    small: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
    medium: 'w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32',
    large: 'w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32',
  };

  return (
    <div className={`${sizeClasses[size]} relative rounded-[12px] overflow-hidden`}>
      {!imgError && displayImage ? (
        <Image
          src={usingFallback ? getCategoryPlaceholder(categoryKey) : displayImage}
          alt={displayAlt}
          fill
          sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
          className="object-cover"
          quality={90}
          onError={handleImageError}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ backgroundColor: '#E5E0E5' }}
        >
          <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-charcoal/20" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function BusinessOfMonthPodium({ topBusinesses }: BusinessOfMonthPodiumProps) {
  if (!topBusinesses || topBusinesses.length === 0) {
    return null;
  }

  // Ensure we have at least 3 businesses, pad with empty slots if needed
  const businesses = [
    topBusinesses[0],
    topBusinesses[1] || null,
    topBusinesses[2] || null,
  ];

  return (
    <div className="flex flex-row justify-center items-end gap-1.5 sm:gap-3 md:gap-4 lg:gap-6 mb-6 sm:mb-8 md:mb-12 pt-6 sm:pt-8 md:pt-10 px-2 sm:px-4 md:px-6 max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">
      {/* 2nd Place */}
      {businesses[1] && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-center group cursor-pointer flex-1 w-full max-w-[100px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[200px] order-1"
        >
          {businesses[1].href ? (
            <Link href={businesses[1].href} className="block">
              <div className="relative mb-2 sm:mb-3">
                <div className="flex items-center justify-center mx-auto">
                  <BusinessImage business={businesses[1]} size="small" />
                </div>
              <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-coral to-coral/80 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-2 border-white ring-2 ring-white/50">
              <span className="text-body-sm sm:text-body font-bold text-white">2</span>
            </div> 
              </div>

              <div className="font-urbanist text-xs sm:text-body-sm md:text-body font-700 text-charcoal mb-1 line-clamp-2 px-1 sm:px-2 max-w-full min-h-[2rem] sm:min-h-[2.5rem] md:min-h-[3rem] break-words flex items-start justify-center gap-1">
                
                <span className="line-clamp-2">{businesses[1].name}</span>
              </div>

              <div className="font-urbanist text-caption sm:text-body-sm text-charcoal/60 mb-2 flex items-center justify-center gap-1">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-coral fill-coral" />
                <span className="font-700 text-charcoal">{businesses[1].totalRating?.toFixed(1) || "0.0"}</span>
                <span className="text-charcoal/70">({businesses[1].reviews || 0})</span>
              </div>

              {/* Professional Podium Block */}
              <div className="relative mt-auto">
                <div className="bg-gradient-to-b from-coral/50 to-coral/30 rounded-t-xl h-20 sm:h-28 md:h-32 w-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                </div>
              </div>
            </Link>
          ) : (
            <div>
              <div className="relative mb-2 sm:mb-3">
                <div className="relative flex items-center justify-center mx-auto">
                  <BusinessImage business={businesses[1]} size="small" />
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-coral to-coral/80 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-2 border-white ring-2 ring-white/50">
                    <span className="text-body-sm sm:text-body font-bold text-white">2</span>
                  </div>
                </div>
              </div>

              <div className="font-urbanist text-xs sm:text-body-sm md:text-body font-700 text-charcoal mb-1 line-clamp-2 px-1 sm:px-2 max-w-full min-h-[2rem] sm:min-h-[2.5rem] md:min-h-[3rem] break-words flex items-start justify-center gap-1">
                <span className="shrink-0 font-800 text-charcoal">2</span>
                <span className="line-clamp-2">{businesses[1].name}</span>
              </div>

              <div className="font-urbanist text-caption sm:text-body-sm text-charcoal/60 mb-2 flex items-center justify-center gap-1">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-coral fill-coral" />
                <span className="font-700 text-charcoal">{businesses[1].totalRating?.toFixed(1) || "0.0"}</span>
                <span className="text-charcoal/70">({businesses[1].reviews || 0})</span>
              </div>

              {/* Professional Podium Block */}
              <div className="relative mt-auto">
                <div className="bg-gradient-to-b from-coral to-coral/70 rounded-t-xl h-20 sm:h-28 md:h-32 w-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 1st Place */}
      {businesses[0] && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-center group cursor-pointer flex-1 w-full max-w-[120px] sm:max-w-[160px] md:max-w-[200px] lg:max-w-[240px] order-2"
        >
          {businesses[0].href ? (
            <Link href={businesses[0].href} className="block">
              <div className="relative mb-2 sm:mb-3">
                <div className="flex items-center justify-center mx-auto">
                  <BusinessImage business={businesses[0]} size="medium" />
                </div>
                <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.3)] border-2 border-white ring-2 ring-white/50">
                  <Trophy className="text-h3 sm:text-h2 text-white" />
                </div>
              </div>

              <div className="font-urbanist text-sm sm:text-body md:text-h3 font-700 text-charcoal mb-1 line-clamp-2 px-1 sm:px-2 max-w-full min-h-[2rem] sm:min-h-[2.5rem] md:min-h-[3rem] break-words flex items-start justify-center gap-1">
                <span className="shrink-0 inline-flex items-center gap-1 font-800 text-charcoal">
                
                </span>
                <span className="line-clamp-2">{businesses[0].name}</span>
              </div>

              <div className="font-urbanist text-caption sm:text-body-sm text-charcoal/60 mb-2 flex items-center justify-center gap-1">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-coral fill-coral" />
                <span className="font-700 text-charcoal">{businesses[0].totalRating?.toFixed(1) || "0.0"}</span>
                <span className="text-charcoal/70">({businesses[0].reviews || 0})</span>
              </div>

              {/* Professional Podium Block */}
              <div className="relative mt-auto">
                <div className="bg-gradient-to-b from-sage/60 to-sage/35 rounded-t-xl h-24 sm:h-36 md:h-48 w-full shadow-[0_12px_40px_rgba(0,0,0,0.2)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                </div>
              </div>
            </Link>
          ) : (
            <div>
              <div className="relative mb-2 sm:mb-3">
                <div className="relative flex items-center justify-center mx-auto">
                  <BusinessImage business={businesses[0]} size="medium" />
                  <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.3)] border-2 border-white ring-2 ring-white/50">
                    <Trophy className="text-h3 sm:text-h2 text-white" />
                  </div>
                </div>
              </div>

              <div className="font-urbanist text-sm sm:text-body md:text-h3 font-700 text-charcoal mb-1 line-clamp-2 px-1 sm:px-2 max-w-full min-h-[2rem] sm:min-h-[2.5rem] md:min-h-[3rem] break-words flex items-start justify-center gap-1">
                <span className="shrink-0 inline-flex items-center gap-1 font-800 text-charcoal">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
                  <span>1</span>
                </span>
                <span className="line-clamp-2">{businesses[0].name}</span>
              </div>

              <div className="font-urbanist text-caption sm:text-body-sm text-charcoal/60 mb-2 flex items-center justify-center gap-1">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-coral fill-coral" />
                <span className="font-700 text-charcoal">{businesses[0].totalRating?.toFixed(1) || "0.0"}</span>
                <span className="text-charcoal/70">({businesses[0].reviews || 0})</span>
              </div>

              {/* Professional Podium Block */}
              <div className="relative mt-auto">
                <div className="bg-gradient-to-b from-sage to-sage/70 rounded-t-xl h-24 sm:h-36 md:h-48 w-full shadow-[0_12px_40px_rgba(0,0,0,0.2)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 3rd Place */}
      {businesses[2] && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="text-center group cursor-pointer flex-1 w-full max-w-[100px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[200px] order-3"
        >
          {businesses[2].href ? (
            <Link href={businesses[2].href} className="block">
              <div className="relative mb-2 sm:mb-3">
                <div className="flex items-center justify-center mx-auto">
                  <BusinessImage business={businesses[2]} size="small" />
                </div>
                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-charcoal/70 to-charcoal/50 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-2 border-white ring-2 ring-white/50">
                  <span className="text-body-sm sm:text-body font-bold text-white ">3</span>
                </div>
              </div>

              <div className="font-urbanist text-body-sm sm:text-body font-700 text-charcoal mb-1 truncate px-2 max-w-full overflow-hidden min-h-[1.5rem] sm:min-h-[1.75rem] flex items-center justify-center gap-1">
              
                <span className="truncate">{businesses[2].name}</span>
              </div>

              <div className="font-urbanist text-caption sm:text-body-sm text-charcoal/60 mb-2 flex items-center justify-center gap-1">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-coral fill-coral" />
                <span className="font-700 text-charcoal">{businesses[2].totalRating?.toFixed(1) || "0.0"}</span>
                <span className="text-charcoal/70">({businesses[2].reviews || 0})</span>
              </div>

              {/* Professional Podium Block */}
              <div className="relative mt-auto">
                <div className="bg-gradient-to-b from-charcoal/40 to-charcoal/20 rounded-t-xl h-16 sm:h-24 md:h-28 w-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                </div>
              </div>
            </Link>
          ) : (
            <div>
              <div className="relative mb-2 sm:mb-3">
                <div className="relative flex items-center justify-center mx-auto ring-3 sm:ring-4 ring-charcoal/20">
                  <BusinessImage business={businesses[2]} size="small" />
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-charcoal/70 to-charcoal/50 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-2 border-white ring-2 ring-white/50">
                    <span className="text-body-sm sm:text-body font-bold text-white">3</span>
                  </div>
                </div>
              </div>

              <div className="font-urbanist text-body-sm sm:text-body font-700 text-charcoal mb-1 truncate px-2 max-w-full overflow-hidden min-h-[1.5rem] sm:min-h-[1.75rem] flex items-center justify-center gap-1">
                <span className="shrink-0 font-800 text-charcoal">3</span>
                <span className="truncate">{businesses[2].name}</span>
              </div>

              <div className="font-urbanist text-caption sm:text-body-sm text-charcoal/60 mb-2 flex items-center justify-center gap-1">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-coral fill-coral" />
                <span className="font-700 text-charcoal">{businesses[2].totalRating?.toFixed(1) || "0.0"}</span>
                <span className="text-charcoal/70">({businesses[2].reviews || 0})</span>
              </div>

              {/* Professional Podium Block */}
              <div className="relative mt-auto">
                <div className="bg-gradient-to-b from-charcoal/60 to-charcoal/40 rounded-t-xl h-16 sm:h-24 md:h-28 w-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default memo(BusinessOfMonthPodium);

