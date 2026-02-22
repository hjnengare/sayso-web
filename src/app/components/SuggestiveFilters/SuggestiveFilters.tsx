"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Star, MapPin, X } from "lucide-react";
import { FilterState } from "../FilterModal/FilterModal";

interface SuggestiveFiltersProps {
  filters: FilterState;
  onUpdateFilter: (filterType: 'minRating' | 'distance', value: number | string | null) => void;
}

export default function SuggestiveFilters({
  filters,
  onUpdateFilter,
}: SuggestiveFiltersProps) {
  const [isVisible, setIsVisible] = useState(true);

  const ratingOptions = [
    { value: 5, label: "5★ Only", icon: "⭐" },
    { value: 4, label: "4★+", icon: "⭐" },
    { value: 3, label: "3★+", icon: "⭐" },
  ];

  const distanceOptions = [
    { value: "1 km", label: "Within 1km", icon: "📍" },
    { value: "5 km", label: "Within 5km", icon: "📍" },
    { value: "10 km", label: "Within 10km", icon: "📍" },
  ];

  const containerVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
      opacity: 1,
      height: "auto",
      transition: {
        duration: 0.3,
        staggerChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: { duration: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.2 },
    },
  };

  // Don't render if user has hidden the suggestions
  if (!isVisible) return null;

  // Don't render if both filters are already active
  const hasNoActiveFilters = !filters.minRating && !filters.distance;
  if (!hasNoActiveFilters) return null;

  return (
    <div className="px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-xs font-medium text-charcoal/60 px-1"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Quick filters
        </p>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 rounded-full text-charcoal/60 hover:text-charcoal/70 hover:bg-charcoal/5 transition-colors"
          aria-label="Hide filter suggestions"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Rating Filters Row */}
      <AnimatePresence>
        {!filters.minRating && (
          <m.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mb-3"
          >
            <p
              className="text-xs font-medium text-charcoal/70 mb-2 px-1"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Rating
            </p>
            <div className="flex flex-wrap gap-2">
              {ratingOptions.map((option) => (
                <m.button
                  key={option.value}
                  variants={itemVariants}
                  onClick={() => onUpdateFilter('minRating', option.value)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-off-white border border-sage/30 text-sage hover:bg-card-bg/10 hover:border-sage/50 transition-all text-sm font-semibold shadow-sm"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Star className="w-4 h-4" fill="currentColor" />
                  <span>{option.label}</span>
                </m.button>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Distance Filters Row */}
      <AnimatePresence>
        {!filters.distance && (
          <m.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <p
              className="text-xs font-medium text-charcoal/70 mb-2 px-1"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Distance
            </p>
            <div className="flex flex-wrap gap-2">
              {distanceOptions.map((option) => (
                <m.button
                  key={option.value}
                  variants={itemVariants}
                  onClick={() => onUpdateFilter('distance', option.value)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-off-white border border-coral/30 text-coral hover:bg-coral/10 hover:border-coral/50 transition-all text-sm font-semibold shadow-sm"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MapPin className="w-4 h-4" />
                  <span>{option.label}</span>
                </m.button>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
