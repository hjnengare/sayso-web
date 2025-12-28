"use client";

import { X, Star, MapPin } from "react-feather";
import { FilterState } from "../FilterModal/FilterModal";

interface ActiveFilterBadgesProps {
  filters: FilterState;
  onRemoveFilter: (filterType: 'minRating' | 'distance') => void;
  onClearAll?: () => void;
}

export default function ActiveFilterBadges({
  filters,
  onRemoveFilter,
  onClearAll,
}: ActiveFilterBadgesProps) {
  const hasActiveFilters = filters.minRating !== null || filters.distance !== null;

  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-2">
      {filters.minRating !== null && (
        <button
          onClick={() => onRemoveFilter('minRating')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage/10 text-sage border border-sage/30 hover:bg-sage/20 transition-colors text-sm font-semibold"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          aria-label={`Remove ${filters.minRating}+ rating filter`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>{filters.minRating}+ Rating</span>
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {filters.distance && (
        <button
          onClick={() => onRemoveFilter('distance')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coral/10 text-coral border border-coral/30 hover:bg-coral/20 transition-colors text-sm font-semibold"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          aria-label={`Remove ${filters.distance} distance filter`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Within {filters.distance}</span>
          <X className="w-3.5 h-3.5" />
        </button>
      )}
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
