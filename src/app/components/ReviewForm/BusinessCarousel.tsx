"use client";

import { useState } from "react";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { isPlaceholderImage, getSubcategoryPlaceholder } from "../../utils/subcategoryPlaceholders";

interface BusinessCarouselProps {
  businessName: string;
  businessImages: string[];
  /** Canonical subcategory slug for placeholder when no photos (e.g. sub_interest_id) */
  subcategorySlug?: string | null;
}

export default function BusinessCarousel({ businessName, businessImages, subcategorySlug }: BusinessCarouselProps) {
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  // Filter out empty strings, null values, and placeholder images from images array
  const validImages = businessImages?.filter((img: string) => {
    return img && img.trim() !== '' && !isPlaceholderImage(img);
  }) || [];
  const hasImages = validImages.length > 0;
  const hasMultipleImages = validImages.length > 1;
  const currentImage = validImages[currentImageIndex];
  const placeholderSrc = getSubcategoryPlaceholder(subcategorySlug ?? undefined);

  // If no valid images, show subcategory placeholder (full photo, same layout as BusinessHeroImage)
  if (!hasImages) {
    return (
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full h-[50vh] sm:h-auto sm:aspect-[16/9] lg:aspect-[21/9] rounded-none overflow-hidden border-none"
      >
        <div className="absolute inset-0 bg-card-bg overflow-hidden">
          <Image
            src={placeholderSrc}
            alt={`${businessName} placeholder`}
            fill
            className="object-cover"
            priority
            quality={70}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
          />
        </div>
      </m.div>
    );
  }

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) handleNextImage();
    if (isRightSwipe) handlePrevImage();
  };

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative w-full h-[50vh] sm:h-auto sm:aspect-[16/9] lg:aspect-[21/9] rounded-none overflow-hidden border-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Blurred background - Instagram style */}
      <AnimatePresence mode="wait">
        <m.div
          key={`bg-${currentImageIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          <Image
            src={currentImage}
            alt=""
            fill
            className="object-cover"
            priority={currentImageIndex === 0}
            quality={20}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
            style={{
              filter: 'blur(40px)',
              opacity: 0.6,
              transform: 'scale(1.2)',
            }}
            aria-hidden="true"
            onError={() => setImageError((prev) => ({ ...prev, [currentImageIndex]: true }))}
          />
        </m.div>
      </AnimatePresence>

      {/* Foreground image - sharp, centered, aspect-ratio preserved */}
      <AnimatePresence mode="wait">
        <m.div
          key={`fg-${currentImageIndex}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Image
            src={currentImage}
            alt={`${businessName} photo ${currentImageIndex + 1}`}
            fill
            className="object-contain"
            priority={currentImageIndex === 0}
            quality={75}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
            onError={() => setImageError((prev) => ({ ...prev, [currentImageIndex]: true }))}
          />
        </m.div>
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

      {/* Error state */}
      {imageError[currentImageIndex] && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-card-bg z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-coral/20 to-coral/10 flex items-center justify-center">
              <Star className="w-10 h-10 sm:w-12 sm:h-12 text-charcoal" strokeWidth={1.5} />
            </div>
            <p className="text-body-sm text-charcoal/70 font-medium uppercase tracking-wide" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              IMAGE UNAVAILABLE
            </p>
          </div>
        </div>
      )}

      {/* Carousel Controls - Only show if multiple images */}
      {hasMultipleImages && (
        <>
          {/* Previous Button */}
          <button
            onClick={handlePrevImage}
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-off-white/95 backdrop-blur-xl flex items-center justify-center shadow-lg hover:bg-white transition-all duration-200 hover:scale-110 border-none"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-charcoal" strokeWidth={2.5} />
          </button>

          {/* Next Button */}
          <button
            onClick={handleNextImage}
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-off-white/95 backdrop-blur-xl flex items-center justify-center shadow-lg hover:bg-white transition-all duration-200 hover:scale-110 border-none"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-charcoal" strokeWidth={2.5} />
          </button>

          {/* Image Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {validImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? 'w-8 bg-white shadow-md'
                    : 'w-2 bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-6 right-6 z-30 px-3 py-1.5 rounded-full bg-charcoal/80 backdrop-blur-xl">
            <span className="text-xs font-semibold text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              {currentImageIndex + 1} / {validImages.length}
            </span>
          </div>
        </>
      )}
    </m.div>
  );
}
