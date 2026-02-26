"use client";

import { useState, useRef, useEffect } from "react";
import { X, Star, MapPin, ChevronDown } from "lucide-react";
import { FilterState } from "../FilterModal/FilterModal";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";

interface ActiveFilterBadgesProps {
  filters: FilterState;
  onRemoveFilter: (filterType: 'minRating' | 'distance') => void;
  onUpdateFilter: (filterType: 'minRating' | 'distance', value: number | string | null) => void;
  onClearAll?: () => void;
}

export default function ActiveFilterBadges({
  filters,
  onRemoveFilter,
  onUpdateFilter,
  onClearAll,
}: ActiveFilterBadgesProps) {
  const [openDropdown, setOpenDropdown] = useState<'rating' | 'distance' | null>(null);
  const ratingRef = useRef<HTMLDivElement>(null);
  const distanceRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const filterEase = [0.22, 1, 0.36, 1] as const;

  const hasActiveFilters = filters.minRating !== null || filters.distance !== null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        openDropdown === 'rating' &&
        ratingRef.current &&
        !ratingRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
      if (
        openDropdown === 'distance' &&
        distanceRef.current &&
        !distanceRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  if (!hasActiveFilters) return null;

  const ratingOptions = [5, 4, 3, 2, 1];
  const distanceOptions = ["1 km", "5 km", "10 km", "25 km"];
  const showRatingControl = filters.minRating !== null;
  const showDistanceControl = Boolean(filters.distance);
  const showClearAllControl = hasActiveFilters && Boolean(onClearAll);

  return (
    <m.div
      className="flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide px-4 sm:px-6 py-2"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.24, ease: filterEase }}
    >
      {/* Rating Filter Pill with Dropdown */}
      {showRatingControl && (
        <m.div
          ref={ratingRef}
          className="relative inline-flex items-center shrink-0"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.24, ease: filterEase, delay: 0.03 }
          }
        >
          <m.button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
            aria-pressed={openDropdown === 'rating'}
            whileHover={prefersReducedMotion ? undefined : { y: -1 }}
            whileTap={prefersReducedMotion ? undefined : { y: 0, scale: 0.99 }}
            className="inline-flex items-center gap-1.5 text-sm text-sage underline underline-offset-4 decoration-1 font-600 hover:text-sage/80 transition-colors duration-200"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            aria-label="Edit rating filter"
          >
            <Star className="w-3.5 h-3.5" />
            <span>{filters.minRating}+ Rating</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'rating' ? 'rotate-180' : ''}`} />
            <span
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFilter('minRating');
                setOpenDropdown(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveFilter('minRating');
                  setOpenDropdown(null);
                }
              }}
              role="button"
              tabIndex={0}
              className="ml-1 rounded-full p-0.5 transition-colors cursor-pointer text-current/80 hover:text-current"
              aria-label="Remove rating filter"
            >
              <X className="w-3 h-3" />
            </span>
          </m.button>

          <AnimatePresence>
            {openDropdown === 'rating' && (
              <m.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 left-0 z-50 bg-white rounded-2xl shadow-lg border border-charcoal/10 p-2 min-w-[140px]"
              >
                <div className="space-y-1">
                  {ratingOptions.map((rating) => (
                    <button
                      key={rating}
                      onClick={() => {
                        onUpdateFilter('minRating', rating);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                        filters.minRating === rating
                          ? 'bg-card-bg text-white'
                          : 'text-charcoal hover:bg-card-bg/10'
                      }`}
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                      <Star className="w-4 h-4" />
                      <span className="font-medium">{rating}+ Stars</span>
                    </button>
                  ))}
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      )}

      {showRatingControl && (showDistanceControl || showClearAllControl) && (
        <span aria-hidden className="mx-2 shrink-0 text-charcoal/55">
          |
        </span>
      )}

      {/* Distance Filter Pill with Dropdown */}
      {showDistanceControl && (
        <m.div
          ref={distanceRef}
          className="relative inline-flex items-center shrink-0"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.24, ease: filterEase, delay: 0.07 }
          }
        >
          <m.button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'distance' ? null : 'distance')}
            aria-pressed={openDropdown === 'distance'}
            whileHover={prefersReducedMotion ? undefined : { y: -1 }}
            whileTap={prefersReducedMotion ? undefined : { y: 0, scale: 0.99 }}
            className="inline-flex items-center gap-1.5 text-sm text-coral underline underline-offset-4 decoration-1 font-600 hover:text-coral/80 transition-colors duration-200"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            aria-label="Edit distance filter"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Within {filters.distance}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === 'distance' ? 'rotate-180' : ''}`} />
            <span
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFilter('distance');
                setOpenDropdown(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveFilter('distance');
                  setOpenDropdown(null);
                }
              }}
              role="button"
              tabIndex={0}
              className="ml-1 rounded-full p-0.5 transition-colors cursor-pointer text-current/80 hover:text-current"
              aria-label="Remove distance filter"
            >
              <X className="w-3 h-3" />
            </span>
          </m.button>

          <AnimatePresence>
            {openDropdown === 'distance' && (
              <m.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 left-0 z-50 bg-white rounded-2xl shadow-lg border border-charcoal/10 p-2 min-w-[140px]"
              >
                <div className="space-y-1">
                  {distanceOptions.map((distance) => (
                    <button
                      key={distance}
                      onClick={() => {
                        onUpdateFilter('distance', distance);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                        filters.distance === distance
                          ? 'bg-coral text-white'
                          : 'text-charcoal hover:bg-coral/10'
                      }`}
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">{distance}</span>
                    </button>
                  ))}
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      )}

      {showDistanceControl && showClearAllControl && (
        <span aria-hidden className="mx-2 shrink-0 text-charcoal/55">
          |
        </span>
      )}

      {/* Clear All Button */}
      {showClearAllControl && (
        <m.button
          type="button"
          onClick={onClearAll}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.24, ease: filterEase, delay: 0.11 }
          }
          whileHover={prefersReducedMotion ? undefined : { y: -1 }}
          whileTap={prefersReducedMotion ? undefined : { y: 0, scale: 0.99 }}
          className="shrink-0 text-sm text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-500"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Clear all
        </m.button>
      )}
    </m.div>
  );
}
