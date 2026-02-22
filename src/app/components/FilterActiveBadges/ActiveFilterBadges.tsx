"use client";

import { useState, useRef, useEffect } from "react";
import { X, Star, MapPin, ChevronDown } from "lucide-react";
import { FilterState } from "../FilterModal/FilterModal";
import { m, AnimatePresence } from "framer-motion";

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

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-2">
      {/* Rating Filter Pill with Dropdown */}
      {filters.minRating !== null && (
        <div ref={ratingRef} className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card-bg/10 text-sage border border-sage/30 hover:bg-card-bg/20 transition-colors text-sm font-semibold"
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
              className="ml-1 hover:bg-card-bg/30 rounded-full p-0.5 transition-colors cursor-pointer"
              aria-label="Remove rating filter"
            >
              <X className="w-3 h-3" />
            </span>
          </button>

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
        </div>
      )}

      {/* Distance Filter Pill with Dropdown */}
      {filters.distance && (
        <div ref={distanceRef} className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'distance' ? null : 'distance')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coral/10 text-coral border border-coral/30 hover:bg-coral/20 transition-colors text-sm font-semibold"
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
              className="ml-1 hover:bg-coral/30 rounded-full p-0.5 transition-colors cursor-pointer"
              aria-label="Remove distance filter"
            >
              <X className="w-3 h-3" />
            </span>
          </button>

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
        </div>
      )}

      {/* Clear All Button */}
      {hasActiveFilters && onClearAll && (
        <button
          onClick={onClearAll}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-charcoal/5 text-charcoal/70 hover:bg-charcoal/10 transition-colors text-sm font-medium border border-charcoal/10"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
