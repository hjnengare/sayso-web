// src/components/BusinessDetail/BusinessHeroImage.tsx
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { getSubcategoryPlaceholder } from "../../utils/subcategoryPlaceholders";
import { isPlaceholderImage } from "../../utils/subcategoryPlaceholders";

interface BusinessHeroImageProps {
  image: string;
  alt: string;
  rating: number;
  verified?: boolean;
  images?: string[]; // Array of all images for carousel
  uploaded_images?: string[]; // Uploaded images array
  /** Canonical subcategory slug for placeholder when no photos (e.g. sub_interest_id) */
  subcategorySlug?: string | null;
  sharedLayoutId?: string;
}

export default function BusinessHeroImage({
  image,
  alt,
  rating,
  verified = false,
  images = [],
  uploaded_images = [],
  subcategorySlug,
  sharedLayoutId,
}: BusinessHeroImageProps) {
  // Combine all available images (exclude placeholders so we show real photos only)
  const allImages = useMemo(() => {
    const imageSet = new Set<string>();

    // Priority 1: uploaded_images array
    if (uploaded_images && uploaded_images.length > 0) {
      uploaded_images.forEach(img => {
        if (img && img.trim() && !isPlaceholderImage(img)) imageSet.add(img);
      });
    }

    // Priority 2: images array
    if (images && images.length > 0) {
      images.forEach(img => {
        if (img && img.trim() && !isPlaceholderImage(img)) imageSet.add(img);
      });
    }

    // Priority 3: single image prop
    if (image && image.trim() && !isPlaceholderImage(image)) {
      imageSet.add(image);
    }

    return Array.from(imageSet);
  }, [image, images, uploaded_images]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasMultipleImages = allImages.length > 1;
  const currentImage = allImages[currentImageIndex] || image;
  const hasImage = currentImage && currentImage.trim() !== '';
  const placeholderSrc = getSubcategoryPlaceholder(subcategorySlug ?? undefined);

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? allImages.length - 1 : prev - 1
    );
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === allImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <motion.div
      layoutId={sharedLayoutId}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative w-full h-[50vh] sm:h-auto sm:aspect-[16/9] lg:aspect-[21/9] rounded-none overflow-hidden border border-white/60 ring-1 ring-white/30"
    >
      {hasImage ? (
        <>
          {/* Blurred background - Instagram style */}
          <AnimatePresence mode="wait">
            <motion.div
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
                priority={false}
                loading="lazy"
                quality={20}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
                style={{
                  filter: 'blur(40px)',
                  opacity: 0.6,
                  transform: 'scale(1.2)',
                }}
                aria-hidden="true"
              />
            </motion.div>
          </AnimatePresence>

          {/* Foreground image - sharp, centered, aspect-ratio preserved */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`fg-${currentImageIndex}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Image
                src={currentImage}
                alt={alt}
                fill
                className="object-contain"
                priority={currentImageIndex === 0}
                quality={75}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
              />
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        </>
      ) : (
        <div className="absolute inset-0 bg-card-bg overflow-hidden">
          <Image
            src={placeholderSrc}
            alt={alt}
            fill
            className="object-cover"
            priority
            quality={70}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
          />
        </div>
      )}

      {/* Verified Badge */}
      {verified && (
        <div className="absolute top-6 left-6 z-20">
          <span className="px-4 py-2 rounded-full text-body-sm font-600 backdrop-blur-xl border bg-sage/90 text-white border-sage/50" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            Verified
          </span>
        </div>
      )}

      {/* Rating Badge - matching BusinessCard style */}
      <div className="absolute top-6 right-6 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/40">
        <Star className="w-3.5 h-3.5 text-coral fill-coral" aria-hidden />
        <span className="text-body-sm font-semibold text-charcoal" style={{
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          fontWeight: 600
        }}>
          {Number(rating).toFixed(1)}
        </span>
      </div>

      {/* Carousel Controls - Only show if multiple images */}
      {hasMultipleImages && (
        <>
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-off-white/95 backdrop-blur-xl flex items-center justify-center shadow-lg hover:bg-white transition-all duration-200 hover:scale-110 border border-white/60"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-charcoal" strokeWidth={2.5} />
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-off-white/95 backdrop-blur-xl flex items-center justify-center shadow-lg hover:bg-white transition-all duration-200 hover:scale-110 border border-white/60"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-charcoal" strokeWidth={2.5} />
          </button>

          {/* Image Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {allImages.map((_, index) => (
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
            <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              {currentImageIndex + 1} / {allImages.length}
            </span>
          </div>
        </>
      )}

    </motion.div>
  );
}
