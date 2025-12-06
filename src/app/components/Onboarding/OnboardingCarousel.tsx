"use client";

import { useEffect, useState } from "react";

interface OnboardingCarouselProps {
  images?: string[];
  autoPlayInterval?: number;
}

const DEFAULT_IMAGES: string[] = [
  "/onboarding/art.png",
  "/onboarding/barber-chair.png",
  "/onboarding/barber-shop.png",
  "/onboarding/camping.png",
  "/onboarding/certificate.png",
  "/onboarding/chinese-food.png",
  "/onboarding/doctor.png",
  "/onboarding/dumbbell.png",
  "/onboarding/film-strip.png",
  "/onboarding/flamenco.png",
  "/onboarding/hiking.png",
  "/onboarding/movies.png",
  "/onboarding/pets.png",
];

const sanitizeImageList = (list?: string[]) => {
  const cleaned = (list ?? []).filter(
    (src): src is string => typeof src === "string" && src.trim() !== ""
  );
  return cleaned.length > 0 ? cleaned : DEFAULT_IMAGES;
};

/**
 * OnboardingCarousel Component
 *
 * Mobile-first carousel with:
 * - Stationary circular hero background
 * - Dynamic rotating images
 * - Dot indicators for navigation
 * - Auto-rotation with error handling for missing images
 */
export default function OnboardingCarousel({
  images = DEFAULT_IMAGES,
  autoPlayInterval = 4000,
}: OnboardingCarouselProps) {
  const [carouselImages, setCarouselImages] = useState<string[]>(() => sanitizeImageList(images));
  const [index, setIndex] = useState(0);

  // Keep carousel images in sync with prop changes
  useEffect(() => {
    setCarouselImages(sanitizeImageList(images));
  }, [images]);

  // Clamp index when image list changes
  useEffect(() => {
    if (carouselImages.length === 0) {
      setCarouselImages(DEFAULT_IMAGES);
      return;
    }
    if (index >= carouselImages.length) {
      setIndex(0);
    }
  }, [carouselImages.length, index]);

  // Auto-rotate carousel
  useEffect(() => {
    if (carouselImages.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % carouselImages.length);
    }, autoPlayInterval);
    return () => clearInterval(id);
  }, [carouselImages.length, autoPlayInterval]);

  const goTo = (i: number) => setIndex(i);

  // Calculate which group (dot) the current index belongs to
  const totalDots = 3;
  const imagesPerDot = Math.ceil(carouselImages.length / totalDots) || 1;
  const currentDot = Math.floor(index / imagesPerDot);

  // Handle dot click - go to first image of that group
  const handleDotClick = (dotIndex: number) => {
    goTo(dotIndex * imagesPerDot);
  };

  const handleImageError = (brokenIndex: number) => {
    setCarouselImages((prev) => {
      if (prev.length === 0) return DEFAULT_IMAGES;

      const updated = [...prev];
      const fallback =
        DEFAULT_IMAGES.find((src) => !updated.includes(src)) ?? DEFAULT_IMAGES[0];

      if (fallback === updated[brokenIndex]) {
        updated.splice(brokenIndex, 1);
      } else {
        updated[brokenIndex] = fallback;
      }

      return updated.length > 0 ? updated : DEFAULT_IMAGES;
    });
  };

  return (
    <div className="w-full mx-auto max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-[1600px]">
      <style>{`
        @keyframes appleSlideIn {
          0% {
            opacity: 0;
            transform: translateX(30px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes appleFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .carousel-slide {
          animation: appleSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .carousel-container {
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      
      <div className="relative overflow-hidden rounded-[12px]">
        {/* Stationary circular hero background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center z-0"
        >
          <div className="rounded-full bg-gradient-to-br from-off-white via-off-white to-off-white/95 border-4 border-navbar-bg ring-4 ring-sage/30 w-[220px] h-[220px]" />
        </div>

        {/* Dynamic carousel for images */}
        <div
          className="flex will-change-transform relative z-10 carousel-container"
          style={{ 
            transform: `translateX(-${index * 100}%)`,
          }}
        >
          {carouselImages.map((src, i) => (
            <div
              key={i}
              className="w-full flex-shrink-0 flex items-center justify-center py-6 carousel-slide"
              style={{ animationDelay: `${i === index ? '0s' : '0.2s'}` }}
            >
              <img
                src={src}
                alt={`Onboarding slide ${i + 1}`}
                className="mx-auto w-[260px] h-[260px] object-contain"
                decoding="async"
                loading="eager"
                onError={() => handleImageError(i)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators for slide navigation - 3 dots only */}
      {carouselImages.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          {Array.from({ length: totalDots }).map((_, dotIndex) => (
            <button
              key={dotIndex}
              aria-label={`Go to group ${dotIndex + 1}`}
              onClick={() => handleDotClick(dotIndex)}
              className={`rounded-full transition-all duration-300 border border-white/30 ${
                dotIndex === currentDot 
                  ? "w-8 h-3 bg-gradient-to-r from-coral to-coral/90" 
                  : "w-2.5 h-2.5 bg-charcoal/20 hover:bg-charcoal/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

