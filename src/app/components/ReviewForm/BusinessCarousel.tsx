"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "react-feather";

interface BusinessCarouselProps {
  businessName: string;
  businessImages: string[];
}

export default function BusinessCarousel({ businessName, businessImages }: BusinessCarouselProps) {
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  // Helper to check if image is a PNG placeholder (for business cards, not carousel)
  const isPngPlaceholder = (url: string) => {
    return url.startsWith('/png/') || url.includes('/png/');
  };

  // Filter out empty strings, null values, and PNG placeholders from images array
  const validImages = businessImages?.filter((img: string) => {
    return img && img.trim() !== '' && !isPngPlaceholder(img);
  }) || [];
  const hasImages = validImages.length > 0;

  // If no valid images, show a placeholder matching BusinessHeroImage
  if (!hasImages) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] rounded-[20px] overflow-hidden border border-white/60 ring-1 ring-white/30"
      >
        <div className="absolute inset-0 bg-card-bg flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
              <Star className="w-10 h-10 sm:w-12 sm:h-12 text-navbar-bg/90" strokeWidth={1.5} />
            </div>
            <p className="text-body-sm text-charcoal/70 font-medium uppercase tracking-wide" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              NO PHOTOS YET
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (index: number) => setCurrentImageIndex(index);

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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] rounded-[20px] overflow-hidden border border-white/60 ring-1 ring-white/30"
    >
      <div
        className="relative w-full h-full"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out h-full"
          style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
        >
          {validImages.map((img, idx) => (
            <div
              key={idx}
              className="w-full flex-shrink-0 h-full relative overflow-hidden"
            >
              {/* Blurred background - Instagram style */}
              <div className="absolute inset-0">
                <Image
                  src={img}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
                  quality={50}
                  priority={idx === 0}
                  onError={() => setImageError((prev) => ({ ...prev, [idx]: true }))}
                  style={{
                    filter: 'blur(40px)',
                    opacity: 0.6,
                    transform: 'scale(1.2)',
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* Foreground image - sharp, centered, aspect-ratio preserved */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src={img}
                  alt={`${businessName} photo ${idx + 1}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
                  quality={90}
                  priority={idx === 0}
                  onError={() => setImageError((prev) => ({ ...prev, [idx]: true }))}
                />
              </div>

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              {imageError[idx] && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-card-bg">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                      <Star className="w-10 h-10 sm:w-12 sm:h-12 text-navbar-bg/90" strokeWidth={1.5} />
                    </div>
                    <p className="text-body-sm text-charcoal/70 font-medium uppercase tracking-wide" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      NO PHOTOS YET
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation Arrows - Only show if more than one image */}
        {validImages.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-off-white/90 hover:bg-off-white backdrop-blur-xl flex items-center justify-center transition-all duration-200 z-20 group text-charcoal hover:text-charcoal border border-white/40 hover:border-white/60"
              aria-label="Previous image"
            >
              <ChevronLeft className="group-hover:scale-110 transition-transform" size={22} strokeWidth={2.5} />
            </button>

            <button
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-off-white/90 hover:bg-off-white backdrop-blur-xl flex items-center justify-center transition-all duration-200 z-20 group text-charcoal hover:text-charcoal border border-white/40 hover:border-white/60"
              aria-label="Next image"
            >
              <ChevronRight className="group-hover:scale-110 transition-transform" size={22} strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* Image Counter - Only show if more than one image */}
        {validImages.length > 1 && (
          <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-off-white/95 backdrop-blur-xl z-20 border border-white/40">
            <span className="text-body-sm font-semibold text-charcoal" style={{ 
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', 
              fontWeight: 600
            }}>
              {currentImageIndex + 1} / {validImages.length}
            </span>
          </div>
        )}
      </div>

      {/* Dots - Only show if more than one image */}
      {validImages.length > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-4 px-4">
          {validImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleDotClick(idx)}
              className={`transition-all duration-300 ${idx === currentImageIndex
                  ? "w-8 h-2 bg-sage rounded-full"
                  : "w-2 h-2 bg-sage/30 rounded-full hover:bg-sage/50"
                }`}
              aria-label={`Go to image ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
