"use client";

import { useOnboarding } from "../../contexts/OnboardingContext";
import { useEffect, useState, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "react-feather";

interface CategoryFilterPillsProps {
  selectedCategoryIds: string[]; // Active filters (user-initiated)
  preferredCategoryIds?: string[]; // User preferences (from onboarding, visual only)
  onToggleCategory: (categoryId: string) => void;
}

export default function CategoryFilterPills({
  selectedCategoryIds,
  preferredCategoryIds = [],
  onToggleCategory,
}: CategoryFilterPillsProps) {
  // Get all available interests catalog from OnboardingContext
  const { interests, loadInterests, isLoading } = useOnboarding();
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(true);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Load interests catalog on mount if not already loaded
  useEffect(() => {
    if (interests.length === 0 && !isLoading) {
      loadInterests();
    }
  }, [interests.length, isLoading, loadInterests]);

  // Check if mobile for animation
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check scroll position and update indicators
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const isScrollable = scrollWidth > clientWidth;

    setShowLeftScroll(isScrollable && scrollLeft > 10);
    setShowRightScroll(isScrollable && scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Check scroll on mount and when interests change
  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [interests]);

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  const loading = isLoading;

  // Show loading skeleton while loading
  if (loading) {
    return (
      <div
        className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide px-4 sm:mx-0 sm:px-0"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
        }}
      >
        <div className="flex items-center gap-2 min-w-max">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-off-white/50 animate-pulse flex-shrink-0"
              style={{ width: '100px', height: '36px' }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Show helpful message if no interests (instead of silently returning null)
  if (interests.length === 0) {
    return (
      <div className="text-sm text-charcoal/50 px-1" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
        No interests yet (complete onboarding to see filters).
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Left Scroll Indicator - Hidden on mobile */}
      {showLeftScroll && !isMobile && (
        <motion.button
          onClick={scrollLeft}
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-navbar-bg rounded-full shadow-md hover:shadow-lg transition-all"
          aria-label="Scroll left"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
        </motion.button>
      )}

      {/* Right Scroll Indicator - Hidden on mobile */}
      {showRightScroll && !isMobile && (
        <motion.button
          onClick={scrollRight}
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center bg-navbar-bg rounded-full shadow-md hover:shadow-lg transition-all"
          aria-label="Scroll right"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronRight className="w-5 h-5 text-white" strokeWidth={2.5} />
        </motion.button>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
        }}
      >
        <div className="flex items-center gap-2 min-w-max">
        {interests.map((interest, index) => {
          const isActive = selectedCategoryIds.includes(interest.id); // Active filter (user-initiated)
          const isPreferred = preferredCategoryIds.includes(interest.id); // User preference (visual only)
          
          // ✅ Visual states (never used for logic):
          // - isActive: filled/bold (explicit filter)
          // - isPreferred: subtle highlight (preference indicator)
          // - Both: filled + indicator

          // Animation variants
          const pillInitial = prefersReducedMotion
            ? { opacity: 0 }
            : isMobile
            ? { opacity: 0, scale: 0.8 }
            : { opacity: 0, y: 10, scale: 0.9 };

          const pillAnimate = prefersReducedMotion
            ? { opacity: 1 }
            : isMobile
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, y: 0, scale: 1 };
          
          return (
            <motion.button
              key={interest.id}
              onClick={() => onToggleCategory(interest.id)}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-urbanist font-600 text-body-sm sm:text-body transition-all duration-200 active:scale-95 flex-shrink-0 whitespace-nowrap relative ${
                isActive
                  ? "bg-coral text-white shadow-lg" // Active filter: filled
                  : isPreferred
                  ? "bg-sage/15 text-sage border-2 border-sage/40 hover:bg-sage/25" // Preferred: subtle highlight
                  : "bg-sage/10 text-charcoal/70 hover:bg-sage/20 hover:text-sage border border-sage/30" // Default: neutral
              }`}
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              initial={pillInitial}
              whileInView={pillAnimate}
              viewport={{ amount: 0.1, once: false }}
              transition={{
                duration: prefersReducedMotion ? 0.2 : isMobile ? 0.3 : 0.4,
                delay: index * 0.03,
                ease: "easeOut",
              }}
            >
              {interest.name}
              {/* ✅ Visual indicator for preferred (when not active) */}
              {isPreferred && !isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-sage rounded-full border border-white" />
              )}
            </motion.button>
          );
        })}
        </div>
      </div>
    </div>
  );
}

