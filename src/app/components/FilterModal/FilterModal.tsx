"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Sliders,
  Star,
  Move,
  Truck,
  Navigation,
  MapPin,
} from "react-feather";

export interface FilterState {
  categories?: string[];
  minRating: number | null;
  distance: string | null;
}

interface FilterModalProps {
  isOpen: boolean;          // controls enter/exit transition
  isVisible: boolean;       // mount/unmount
  onClose: () => void;
  /** Callback fired when modal closes with the current filter state */
  onFiltersChange?: (filters: FilterState) => void;
  /** element to anchor under (the search input wrapper) */
  anchorRef?: React.RefObject<HTMLElement>;
  /** Initial filter state to display */
  initialFilters?: FilterState;
}

const sf = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
} as const;

export default function FilterModal({
  isOpen,
  isVisible,
  onClose,
  onFiltersChange,
  anchorRef,
  initialFilters,
}: FilterModalProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(initialFilters?.minRating || null);
  const [selectedDistance, setSelectedDistance] = useState<string | null>(initialFilters?.distance || null);

  // Track if user has made any changes in this session
  const hasChangesRef = useRef(false);

  // Update state when initialFilters change (external updates)
  useEffect(() => {
    if (initialFilters) {
      setSelectedRating(initialFilters.minRating || null);
      setSelectedDistance(initialFilters.distance || null);
      hasChangesRef.current = false; // Reset change tracking when external filters update
    }
  }, [initialFilters]);

  const panelRef = useRef<HTMLDivElement>(null);

  // computed position for anchored panel
  const [style, setStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 360,
  });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef?.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const isMobile = window.innerWidth < 768; // Use md breakpoint (768px)
    
    // On mobile, use negative gap to account for border and eliminate visual space
    const gap = isMobile ? -2 : 8; // Negative gap on mobile to overlap border, small gap on desktop
    const horizontalPadding = isMobile ? 16 : 16; // Consistent padding on both sides

    // Always use full device width minus padding
    const left = horizontalPadding;
    const width = window.innerWidth - (horizontalPadding * 2);

    // Place directly under the anchor (account for page scroll)
    const top = rect.bottom + gap;

    setStyle({ top, left, width });
  }, [anchorRef]);

  useEffect(() => {
    if (!isVisible) return;
    updatePosition();

    const onWin = () => updatePosition();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);

    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [isVisible, updatePosition]);

  // Scroll modal into view when it opens
  useEffect(() => {
    if (!isVisible || !isOpen) return;

    // Small delay to ensure modal is rendered and positioned
    const timer = setTimeout(() => {
      const anchor = anchorRef?.current;
      if (anchor) {
        // Scroll to anchor element with some padding
        const rect = anchor.getBoundingClientRect();
        const scrollTop = window.scrollY + rect.top - 20; // 20px padding from top
        window.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isVisible, isOpen, anchorRef]);

  // Body scroll lock when modal is open
  useEffect(() => {
    if (!isVisible || !isOpen) return;

    // Save original styles
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    
    // Get current scroll position
    const scrollY = window.scrollY;

    // Lock body scroll - prevent both scroll and touch scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      // Restore original styles
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isVisible, isOpen]);

  // Apply filters when modal closes (batched application)
  const handleClose = useCallback(() => {
    // Only trigger onFiltersChange if user made changes
    if (hasChangesRef.current && onFiltersChange) {
      onFiltersChange({
        minRating: selectedRating,
        distance: selectedDistance,
      });
    }
    onClose();
  }, [selectedRating, selectedDistance, onFiltersChange, onClose]);

  // Track rating changes
  const handleRatingChange = useCallback((rating: number | null) => {
    setSelectedRating(rating);
    hasChangesRef.current = true;
  }, []);

  // Track distance changes
  const handleDistanceChange = useCallback((distance: string | null) => {
    setSelectedDistance(distance);
    hasChangesRef.current = true;
  }, []);

  // Outside click + ESC (no body scroll lock)
  useEffect(() => {
    if (!isVisible) return;

    const onOutside = (e: Event) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      handleClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    // small delay so the opening click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", onOutside);
      document.addEventListener("touchstart", onOutside);
      document.addEventListener("keydown", onEsc);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isVisible, handleClose, anchorRef]);

  if (!isVisible) return null;

  const distanceOptions = [
    { distance: "1 km", Icon: Move },
    { distance: "5 km", Icon: Truck },
    { distance: "10 km", Icon: Truck },
    { distance: "25 km", Icon: Navigation },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none"
      aria-hidden={!isOpen}
      style={sf}
    >
      {/* Anchored panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Search filters"
        aria-modal="true"
        tabIndex={-1}
        className={`pointer-events-auto rounded-[20px] overflow-hidden
                    bg-off-white
                    border border-white/30 shadow-2xl
                    transition-all duration-200
                    flex flex-col
                    ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}`}
        style={{
          position: "fixed",
          top: style.top,
          left: style.left,
          width: style.width || (typeof window !== 'undefined' ? `calc(100vw - 32px)` : 400),
          maxWidth: "calc(100vw - 32px)", // 16px padding on each side
          height: "50dvh",
          maxHeight: "50dvh",
          display: 'flex',
          flexDirection: 'column',
          outline: "none",
        }}
      >
        {/* header */}
        <div className="relative flex items-center justify-between px-4 sm:px-5 md:px-6 pt-4 pb-3 border-b border-white/30 bg-off-white shadow-sm transition-all duration-300 flex-shrink-0">
          <div className="relative z-10 flex items-center gap-2">
            <Sliders className="w-4 h-4 sm:w-4 sm:h-4 text-warning-600" />
            <h2
              className="text-base sm:text-sm font-semibold text-charcoal"
              style={{ fontFamily: '"Urbanist", system-ui, sans-serif', letterSpacing: '-0.01em' }}
            >
              Filters
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="relative z-10 w-10 h-10 sm:w-9 sm:h-9 rounded-full border border-charcoal/10 bg-off-white/70 hover:bg-sage/10 hover:text-sage text-charcoal/80 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-sage/30 touch-manipulation"
            aria-label="Close filters"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* body */}
        <div
          className="px-4 sm:px-5 md:px-6 py-4 space-y-3 sm:space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0"
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
          onWheel={(e) => {
            // Prevent scroll propagation to body
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Prevent touch scroll propagation to body
            e.stopPropagation();
          }}
        >
          {/* Rating */}
          <section className="rounded-[20px] bg-off-white/70 border border-charcoal/10 p-3 sm:p-4 animate-fade-in-up [animation-delay:0.05s]">
            <h3
              className="text-base sm:text-sm font-semibold text-charcoal mb-3 sm:mb-3 flex items-center gap-2"
              style={{ fontFamily: '"Urbanist", system-ui, sans-serif', letterSpacing: '-0.01em' }}
            >
              <Star className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-warning-600" />
              Minimum Rating
            </h3>
            <div className="flex flex-wrap gap-2 sm:gap-2">
              {[5, 4, 3, 2, 1].map((r) => {
                const active = selectedRating === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRatingChange(active ? null : r)}
                    className={`px-3 sm:px-3 py-2.5 sm:py-2 rounded-full text-sm sm:text-xs flex items-center gap-2 border transition-all min-h-[44px] sm:min-h-0 touch-manipulation
                      ${
                        active
                          ? "bg-sage text-white border-sage shadow-sm"
                          : "bg-off-white text-charcoal border-charcoal/10 hover:border-sage/40 hover:bg-sage/5 active:bg-sage/10"
                      }
                    focus:outline-none focus:ring-2 focus:ring-sage/30`}
                    aria-pressed={active}
                    aria-label={`${r}+ stars`}
                  >
                    <div className="flex">
                      {[...Array(r)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 sm:w-4 sm:h-4 ${active ? "text-white" : "text-sage"}`} />
                      ))}
                    </div>
                    <span>{r}+</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Distance */}
          <section className="rounded-[20px] bg-off-white/70 border border-charcoal/10 p-3 sm:p-4 animate-fade-in-up [animation-delay:0.1s]">
            <h3
              className="text-base sm:text-sm font-semibold text-charcoal mb-3 sm:mb-3 flex items-center gap-2"
              style={{ fontFamily: '"Urbanist", system-ui, sans-serif', letterSpacing: '-0.01em' }}
            >
              <MapPin className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-warning-600" />
              Distance
            </h3>
            <div className="flex flex-wrap gap-2 sm:gap-2">
              {distanceOptions.map(({ distance, Icon }) => {
                const active = selectedDistance === distance;
                return (
                  <button
                    key={distance}
                    type="button"
                    onClick={() => handleDistanceChange(active ? null : distance)}
                    className={`px-3 sm:px-3 py-2.5 sm:py-2 rounded-full text-sm sm:text-xs flex items-center gap-2 border transition-all whitespace-nowrap min-h-[44px] sm:min-h-0 touch-manipulation
                      ${
                        active
                          ? "bg-coral text-white border-coral shadow-sm"
                          : "bg-off-white text-charcoal border-charcoal/10 hover:border-coral/40 hover:bg-coral/5 active:bg-coral/10"
                      }
                    focus:outline-none focus:ring-2 focus:ring-coral/30`}
                    aria-pressed={active}
                  >
                    <Icon className={`w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0 ${active ? "text-white" : "text-coral"}`} />
                    <span>{distance}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
