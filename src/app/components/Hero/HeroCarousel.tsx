// src/components/Hero/HeroCarousel.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SearchInput from "../SearchInput/SearchInput";
import FilterModal, { FilterState } from "../FilterModal/FilterModal";
import ActiveFilterBadges from "../FilterActiveBadges/ActiveFilterBadges";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";
import HeroSkeleton from "./HeroSkeleton";
import { useAuth } from '../../contexts/AuthContext';

interface HeroSlide {
  id: string;
  image: string;
  title: string;
  description: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "1",
    image: "/hero/arno-smit-qY_yTu7YBT4-unsplash.jpg",
    title: "Discover Local Gems",
    description: "Explore amazing local businesses, restaurants, and experiences in your city",
  },
  {
    id: "2",
    image: "/hero/caroline-lm-8BkF0sTC6Uo-unsplash.jpg",
    title: "What's Trending Now",
    description: "See what everyone is talking about right now",
  },
  {
    id: "3",
    image: "/hero/devon-janse-van-rensburg-ODZIiIsn490-unsplash.jpg",
    title: "Personalized For You",
    description: "Get recommendations tailored to your interests",
  },
  {
    id: "4",
    image: "/hero/edward-franklin-Nb_Q-M3Cdzg-unsplash.jpg",
    title: "Connect with Locals",
    description: "Support local businesses and discover hidden treasures",
  },
];

const FONT_STACK = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

export default function HeroCarousel() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isHeroReady, setIsHeroReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLElement>(null);
  const currentIndexRef = useRef(currentIndex);
  const slides = HERO_SLIDES;

  // Mark hero as ready once auth state is known
  useEffect(() => {
    if (!authLoading) {
      setIsHeroReady(true);
    }
  }, [authLoading]);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>({ minRating: null, distance: null });
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // respect reduced motion
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const next = useCallback(() => {
    setProgress(0); // Reset progress when advancing
    setCurrentIndex((prev) => {
      const newIndex = (prev + 1) % slides.length;
      currentIndexRef.current = newIndex;
      return newIndex;
    });
  }, [slides.length]);
  const prev = useCallback(() => {
    setProgress(0); // Reset progress when going back
    setCurrentIndex((prev) => {
      const newIndex = (prev - 1 + slides.length) % slides.length;
      currentIndexRef.current = newIndex;
      return newIndex;
    });
  }, [slides.length]);

  // Update ref when currentIndex changes
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Progress animation for each slide
  useEffect(() => {
    if (prefersReduced || paused) {
      // Clear progress timer when paused
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
      return;
    }

    // Reset progress when slide changes
    setProgress(0);

    // Animate progress from 0 to 100 over 8 seconds (more natural speed)
    const interval = 50; // Update every 50ms for smooth animation
    const totalDuration = 8000; // 8 seconds per slide for a more natural pace
    const steps = totalDuration / interval;
    let currentStep = 0;

    progressRef.current = setInterval(() => {
      currentStep++;
      const newProgress = Math.min((currentStep / steps) * 100, 100);
      setProgress(newProgress);

      // When progress reaches 100%, advance to next slide
      if (newProgress >= 100) {
        if (progressRef.current) {
          clearInterval(progressRef.current);
          progressRef.current = null;
        }
        // Use the ref version of next to avoid dependency issues
        setCurrentIndex((prev) => {
          const newIndex = (prev + 1) % slides.length;
          currentIndexRef.current = newIndex;
          return newIndex;
        });
        setProgress(0);
      }
    }, interval);

    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
    };
  }, [prefersReduced, paused, currentIndex, slides.length]);

  // pause when tab is hidden
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // keyboard navigation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setPaused(true);
        next();
      } else if (e.key === "ArrowLeft") {
        setPaused(true);
        prev();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // swipe gestures (mobile)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let deltaX = 0;
    const threshold = 40;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      deltaX = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      deltaX = e.touches[0].clientX - startX;
    };
    const onTouchEnd = () => {
      if (Math.abs(deltaX) > threshold) {
        setPaused(true);
        if (deltaX < 0) next();
        else prev();
      }
      startX = 0;
      deltaX = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [next, prev]);

  const handleUpdateFilter = (filterType: 'minRating' | 'distance', value: number | string | null) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({ minRating: null, distance: null });
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setProgress(0); // Reset progress when manually navigating
    setPaused(true);
  };

  // Filter handlers
  const openFilters = () => {
    if (isFilterVisible) return;
    setIsFilterVisible(true);
    setTimeout(() => setIsFilterOpen(true), 10);
  };

  const closeFilters = () => {
    setIsFilterOpen(false);
    setTimeout(() => setIsFilterVisible(false), 150);
  };

  const handleFiltersChange = (f: FilterState) => {
    // Navigate to explore page with filters applied via URL params
    const params = new URLSearchParams();
    if (f.categories && f.categories.length > 0) {
      params.set('categories', f.categories.join(','));
    }
    if (f.minRating !== null) {
      params.set('min_rating', f.minRating.toString());
    }
    if (f.distance) {
      params.set('distance', f.distance);
    }

    const queryString = params.toString();
    const exploreUrl = queryString ? `/explore?${queryString}` : '/explore';
    router.push(exploreUrl);
    closeFilters();
  };

  const handleSubmitQuery = (query: string) => {
    // Navigate to explore page with search query
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('search', query.trim());
    }
    const queryString = params.toString();
    const exploreUrl = queryString ? `/explore?${queryString}` : '/explore';
    router.push(exploreUrl);
  };

  // Show skeleton while auth is loading
  if (!isHeroReady) {
    return <HeroSkeleton />;
  }

  return (
    <>
      {/* Active Filter Badges - Show on top of carousel */}
      <div className="relative w-full px-4">
        <ActiveFilterBadges
          filters={filters}
          onRemoveFilter={(filterType) => handleUpdateFilter(filterType, null)}
          onUpdateFilter={handleUpdateFilter}
          onClearAll={handleClearFilters}
        />
      </div>

      {/* Hero Container with padding */}
      <div className="relative w-full px-0 sm:px-2 py-2 md:px-2">
        {/* Hero Section with rounded corners - 75vh responsive height */}
        <section
          ref={containerRef as React.RefObject<HTMLElement>}
          className="relative h-[65vh] sm:h-[70vh] lg:h-[80vh] w-full overflow-hidden outline-none rounded-none sm:rounded-[20px] min-h-[400px] shadow-md"
          aria-label="Hero carousel"
          tabIndex={0}
          style={{ fontFamily: FONT_STACK }}
        >
          {/* Liquid Glass Ambient Lighting */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-sage/10 pointer-events-none rounded-none sm:rounded-[20px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] pointer-events-none rounded-none sm:rounded-[20px]" />
      <div className="absolute inset-0 backdrop-blur-[1px] bg-off-white/5 mix-blend-overlay pointer-events-none rounded-none sm:rounded-[20px]" />
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          aria-hidden={index !== currentIndex}
          className={`absolute inset-0 w-auto h-auto overflow-hidden transition-opacity duration-1000 ease-in-out will-change-transform rounded-none sm:rounded-[20px] ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
           {/* Full Background Image - All Screen Sizes */}
           <div className="absolute inset-0 rounded-none sm:rounded-[20px] overflow-hidden">
             <Image
               src={slide.image}
               alt={slide.title}
               fill
               priority={index === 0}
               quality={95}
               className="object-cover scale-[1.02]"
               style={{ filter: "brightness(0.95) contrast(1.05) saturate(1.1)" }}
               sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
             />
             {/* Multi-layered overlay for optimal text readability */}
             <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
             <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
             <div className="absolute inset-0 bg-black/20" />
           </div>

           {/* Left-aligned Text - Aligned with navbar left edge */}
           <div className="absolute inset-0 z-20 flex items-center justify-center w-full">
             <div className="w-full flex flex-col items-center justify-center text-center">
               <h2 
                 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-off-white drop-shadow-lg mb-4"
                 style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
               >
                 Discover Local Gems
               </h2>
               <p 
                 className="text-base sm:text-lg lg:text-xl text-off-white/90 drop-shadow-md max-w-xl mb-6"
                 style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}
               >
                 Explore amazing local businesses, restaurants, and experiences in your city
               </p>
               
               {/* Conditional CTA Button: Sign In for unauthenticated, Discover for authenticated */}
               {!user ? (
                 <Link
                   href="/login"
                   className="group relative inline-block rounded-full py-3 px-12 text-base font-semibold text-white text-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2 min-w-[180px]"
                   style={{
                     fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                     fontWeight: 600,
                   }}
                 >
                   <span className="relative z-10">Sign In</span>
                 </Link>
               ) : (
                 <Link
                   href="/trending"
                   className="group relative inline-block rounded-full py-3 px-12 text-base font-semibold text-white text-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2 min-w-[180px]"
                   style={{
                     fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                     fontWeight: 600,
                   }}
                 >
                   <span className="relative z-10">Discover</span>
                 </Link>
               )}
             </div>
           </div>
        </div>
      ))}

      {/* Accessible live region (announces slide title) */}
      <div className="sr-only" aria-live="polite">
        {slides[currentIndex]?.title}
      </div>

      {/* Minimal Progress Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
        {/* Dot Indicators */}
        <div className="flex items-center gap-2.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-500 ease-in-out rounded-full focus:outline-none focus:ring-2 focus:ring-white/50 hover:scale-110 ${
                index === currentIndex
                  ? "w-8 h-2 bg-white shadow-lg"
                  : "w-2 h-2 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? "true" : "false"}
            />
          ))}
        </div>
      </div>
        </section>
      </div>

      {/* Filter Modal Portal */}
      {isFilterVisible && (
        <div className="fixed inset-0 z-50">
          <FilterModal
            isOpen={isFilterOpen}
            isVisible={isFilterVisible}
            onClose={closeFilters}
            onFiltersChange={handleFiltersChange}
            initialFilters={filters}
          />
        </div>
      )}
    </>
  );
}
