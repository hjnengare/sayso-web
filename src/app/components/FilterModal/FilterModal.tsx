"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Sliders,
  Coffee,
  ShoppingBag,
  Monitor,
  Tool,
  Star,
  Move,
  Truck,
  Navigation,
  MapPin,
  Home,
  Scissors,
  Briefcase,
  Compass,
  Film,
  Image,
  Heart,
  Package,
} from "react-feather";

export interface FilterState {
  categories: string[];
  minRating: number | null;
  distance: string | null;
}

interface FilterModalProps {
  isOpen: boolean;          // controls enter/exit transition
  isVisible: boolean;       // mount/unmount
  onClose: () => void;
  onApplyFilters?: (filters: FilterState) => void;
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
  onApplyFilters,
  anchorRef,
  initialFilters,
}: FilterModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialFilters?.categories || []);
  const [selectedRating, setSelectedRating] = useState<number | null>(initialFilters?.minRating || null);
  const [selectedDistance, setSelectedDistance] = useState<string | null>(initialFilters?.distance || null);

  // Update state when initialFilters change
  useEffect(() => {
    if (initialFilters) {
      setSelectedCategories(initialFilters.categories || []);
      setSelectedRating(initialFilters.minRating || null);
      setSelectedDistance(initialFilters.distance || null);
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
    
    const gap = isMobile ? 8 : 8; // Small space below the input
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

  // Body scroll lock when modal is open
  useEffect(() => {
    if (!isVisible) return;

    // Lock body scroll
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      // Restore body scroll
      document.body.style.overflow = originalStyle;
    };
  }, [isVisible]);

  // Outside click + ESC (no body scroll lock)
  useEffect(() => {
    if (!isVisible) return;

    const onOutside = (e: Event) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();

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
  }, [isVisible, onClose, anchorRef]);

  const handleApply = () => {
    onApplyFilters?.({
      categories: selectedCategories,
      minRating: selectedRating,
      distance: selectedDistance,
    });
    onClose();
  };

  const handleClearAll = () => {
    setSelectedCategories([]);
    setSelectedRating(null);
    setSelectedDistance(null);
  };

  if (!isVisible) return null;

  const categoryOptions = [
    { id: 'food-drink', name: "Food & Drink", Icon: Coffee },
    { id: 'beauty-wellness', name: "Beauty & Wellness", Icon: Scissors },
    { id: 'professional-services', name: "Professional Services", Icon: Briefcase },
    { id: 'outdoors-adventure', name: "Outdoors & Adventure", Icon: Compass },
    { id: 'experiences-entertainment', name: "Entertainment & Experiences", Icon: Film },
    { id: 'arts-culture', name: "Arts & Culture", Icon: Image },
    { id: 'family-pets', name: "Family & Pets", Icon: Heart },
    { id: 'shopping-lifestyle', name: "Shopping & Lifestyle", Icon: Package },
  ];

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
        className={`pointer-events-auto rounded-none sm:rounded-xl md:rounded-2xl overflow-hidden
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
          // Reserve generous space at the bottom on mobile so footer buttons stay above the address bar
          maxHeight: typeof window !== 'undefined' && window.innerWidth < 768
            ? `calc(100vh - ${style.top + 80}px - env(safe-area-inset-bottom, 0px))`
            : `calc(100vh - ${style.top + 40}px)`, // Slight extra gap on larger screens
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
            onClick={onClose}
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
            maxHeight: 'calc(100vh - 180px)', // Reserve space for header and footer on mobile
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
          {/* Category */}
          <section className="rounded-xl bg-off-white/70 border border-charcoal/10 p-3 sm:p-4 animate-fade-in-up [animation-delay:0.05s]">
            <h3
              className="text-base sm:text-sm font-semibold text-charcoal mb-3 sm:mb-3 flex items-center gap-2"
              style={{ fontFamily: '"Urbanist", system-ui, sans-serif', letterSpacing: '-0.01em' }}
            >
              <ShoppingBag className="w-4 h-4 sm:w-4 sm:h-4 text-warning-600" />
              Category
            </h3>
            <div className="flex flex-wrap gap-2 sm:gap-2">
              {categoryOptions.map(({ id, name, Icon }) => {
                const active = selectedCategories.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setSelectedCategories((prev) =>
                        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                      )
                    }
                    className={`px-3 sm:px-3 py-2.5 sm:py-2 rounded-full text-sm sm:text-xs flex items-center gap-2 border transition-all min-h-[44px] sm:min-h-0 touch-manipulation
                      ${
                        active
                          ? "bg-sage text-white border-sage shadow-sm"
                          : "bg-off-white text-charcoal border-charcoal/10 hover:border-sage/40 hover:bg-sage/5 active:bg-sage/10"
                      }
                    focus:outline-none focus:ring-2 focus:ring-sage/30`}
                    aria-pressed={active}
                  >
                    <Icon className={`w-4 h-4 sm:w-3.5 sm:h-3.5 flex-shrink-0 ${active ? "text-white" : "text-sage"}`} />
                    <span className="whitespace-nowrap">{name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Rating */}
          <section className="rounded-xl bg-off-white/70 border border-charcoal/10 p-3 sm:p-4 animate-fade-in-up [animation-delay:0.1s]">
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
                    onClick={() => setSelectedRating(active ? null : r)}
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
          <section className="rounded-xl bg-off-white/70 border border-charcoal/10 p-3 sm:p-4 animate-fade-in-up [animation-delay:0.15s]">
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
                    onClick={() => setSelectedDistance(active ? null : distance)}
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

        {/* footer */}
        <div 
          className="flex gap-3 px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-t border-white/60 bg-off-white/80 backdrop-blur-sm flex-shrink-0"
          style={{
            paddingBottom: typeof window !== 'undefined' && window.innerWidth < 768 
              ? `max(1rem, calc(1rem + env(safe-area-inset-bottom, 0px) + 32px))` 
              : undefined,
          }}
        >
            <button
            onClick={handleClearAll}
            className="flex-1 rounded-full bg-off-white text-charcoal border border-charcoal/15 hover:bg-charcoal/5 active:bg-charcoal/10 font-semibold py-3 sm:py-2.5 px-4 text-base sm:text-sm md:text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-sage/30 min-h-[48px] sm:min-h-0 touch-manipulation"
            style={{ fontFamily: '"Urbanist", system-ui, sans-serif', letterSpacing: '-0.01em' }}
          >
            Clear
          </button>
          <button
            onClick={handleApply}
            className="flex-1 rounded-full bg-sage hover:bg-sage/90 active:bg-sage/80 text-white font-semibold py-3 sm:py-2.5 px-4 text-base sm:text-sm md:text-xs border border-sage transition-colors focus:outline-none focus:ring-2 focus:ring-sage/30 min-h-[48px] sm:min-h-0 touch-manipulation"
            style={{ fontFamily: '"Urbanist", system-ui, sans-serif', letterSpacing: '-0.01em' }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
