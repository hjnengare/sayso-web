"use client";

import { useState } from "react";
import Image from "next/image";
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

  // If no valid images, show a placeholder with star icon
  if (!hasImages) {
    return (
      <div className="mb-0 md:mb-8 mx-0 md:mx-0 relative h-[60vh]">
        <div className="relative overflow-hidden rounded-2xl md:rounded-lg bg-card-bg h-full flex flex-col items-center justify-center">
          <div className="w-full h-full md:h-auto flex flex-col items-center justify-center gap-3">
            <Star size={80} className="text-coral/30" strokeWidth={1.2} />
            <span className="text-sm font-semibold tracking-wide uppercase text-charcoal/50">
              No Photos Yet
            </span>
          </div>
        </div>
      </div>
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
    <div className="mb-0 md:mb-8 mx-0 md:mx-0 relative h-[60vh]">
      <div
        className="relative overflow-hidden rounded-2xl md:rounded-lg bg-card-bg h-full"
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
              className="w-full flex-shrink-0 h-full bg-sage/10 relative overflow-hidden"
            >
              <Image
                src={img}
                alt={`${businessName} photo ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1100px"
                quality={90}
                priority={idx === 0}
                onError={() => setImageError((prev) => ({ ...prev, [idx]: true }))}
                style={{ objectPosition: 'center' }}
              />
              {imageError[idx] && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-sage/5">
                  <Star size={64} className="text-sage" fill="currentColor" />
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
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-card-bg/90 hover:bg-navbar-bg/90 backdrop-blur-sm flex items-center justify-center transition-all duration-200 z-10 group text-charcoal hover:text-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="group-hover:scale-110 transition-transform" size={22} />
            </button>

            <button
              onClick={handleNextImage}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-card-bg/90 hover:bg-navbar-bg/90 backdrop-blur-sm flex items-center justify-center transition-all duration-200 z-10 group text-charcoal hover:text-white"
              aria-label="Next image"
            >
              <ChevronRight className="group-hover:scale-110 transition-transform" size={22} />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute top-3 md:top-4 right-3 md:right-4 px-3 py-1.5 rounded-full bg-charcoal/70 backdrop-blur-sm z-10">
          <span className="text-sm sm:text-xs md:text-sm font-500 text-white">
            {currentImageIndex + 1} / {validImages.length}
          </span>
        </div>
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
    </div>
  );
}
