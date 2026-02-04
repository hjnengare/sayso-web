"use client";

import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Star, Trophy, MapPin, ImageIcon } from "lucide-react";
import Image from "next/image";
import { BusinessOfTheMonth } from "../../types/community";
import { getCategoryPlaceholder, getCategoryPlaceholderFromLabels, isPlaceholderImage } from "../../utils/categoryToPngMapping";
import { getCategorySlugFromBusiness } from "../../utils/subcategoryPlaceholders";

interface BusinessLeaderboardItemProps {
  business: BusinessOfTheMonth;
  index: number;
  rank: number;
}

function BusinessLeaderboardItem({ business, index, rank }: BusinessLeaderboardItemProps) {
  const [imgError, setImgError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const getBadgeStyles = () => {
    switch (rank) {
      case 1:
        return "from-amber-400 to-amber-600 text-white";
      case 2:
        return "from-coral to-coral/80 text-white";
      case 3:
        return "from-charcoal/70 to-charcoal/50 text-white";
      default:
        return "from-charcoal/15 to-charcoal/10 text-charcoal/70";
    }
  };

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
      (business as any).badge
    ], (business as any).interestId);
    return { image: placeholder, isPlaceholder: true };
  }, [
    business.image,
    (business as any).image_url,
    (business as any).uploaded_images,
    categoryKey,
    business.category,
    (business as any).badge,
    (business as any).interestId,
  ]);

  const displayImage = getDisplayImage.image;
  const isPlaceholder = getDisplayImage.isPlaceholder;
  const displayAlt = (business as any).alt || business.name;

  const handleImageError = () => {
    if (!usingFallback && !isPlaceholder) {
      setUsingFallback(true);
      setImgError(false);
    } else {
      setImgError(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] cursor-pointer border border-white/50 backdrop-blur-md ring-1 ring-white/20 hover:shadow-[0_12px_40px_rgb(0,0,0,0.18)] transition-shadow duration-300"
    >
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br ${getBadgeStyles()} rounded-full flex items-center justify-center font-urbanist text-caption sm:text-body-sm font-600 shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex-shrink-0 border border-white/40`}>
            {rank <= 3 ? <Trophy className="w-3 h-3 sm:w-4 sm:h-4" /> : rank}
          </div>
          <div className="w-12 h-12 sm:w-14 sm:h-14 relative rounded-lg overflow-hidden border-2 border-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] ring-2 ring-white/50 flex-shrink-0">
            {!imgError && displayImage ? (
              <Image
                src={usingFallback ? getCategoryPlaceholder(categoryKey) : displayImage}
                alt={displayAlt}
                fill
                sizes="(max-width: 640px) 48px, 56px"
                className="object-cover"
                quality={90}
                onError={handleImageError}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: '#E5E0E5' }}
              >
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-charcoal/20" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-urbanist text-body-sm sm:text-body font-600 text-charcoal truncate">{business.name}</div>
            <div className="font-urbanist text-caption sm:text-body-sm text-charcoal/60 flex items-center gap-1 flex-wrap">
              <span className="font-500 truncate max-w-[120px] sm:max-w-none">{business.category}</span>
              <span className="text-charcoal/60 hidden sm:inline">•</span>
              <span className="hidden sm:flex items-center gap-0.5 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{business.location}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
          <div className="bg-gradient-to-br from-off-white via-off-white to-off-white/90 backdrop-blur-xl px-2 sm:px-3 py-1 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-white/60 ring-1 ring-white/30 flex items-center gap-1">
            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-coral fill-coral" />
            <span className="font-urbanist text-caption sm:text-body-sm font-600 text-charcoal">{business.reviewCount > 0 ? business.rating : "New"}</span>
          </div>
          <span className="font-urbanist text-caption sm:text-body-sm text-charcoal/70 whitespace-nowrap">{business.reviewCount > 0 ? `${business.reviewCount} reviews` : "No reviews yet"}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(BusinessLeaderboardItem);
