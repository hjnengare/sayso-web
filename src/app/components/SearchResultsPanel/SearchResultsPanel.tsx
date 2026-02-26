"use client";

import BusinessCard from "../BusinessCard/BusinessCard";
import type { LiveSearchFilters, LiveSearchResult } from "@/app/hooks/useLiveSearch";
import { useMemo } from "react";
import LocationPromptBanner from "../Location/LocationPromptBanner";
import { m, useReducedMotion } from "framer-motion";

const DISTANCE_FILTERS: { label: string; value: number }[] = [
  { label: "1 km", value: 1 },
  { label: "3 km", value: 3 },
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
];

const RATING_FILTERS: { label: string; value: number }[] = [
  { label: "4+", value: 4 },
  { label: "4.5+", value: 4.5 },
];

const skeletonItems = Array.from({ length: 6 }, (_, index) => index);

interface SearchResultsPanelProps {
  query: string;
  loading: boolean;
  error: string | null;
  results: LiveSearchResult[];
  filters: LiveSearchFilters;
  onDistanceChange: (value: number | null) => void;
  onRatingChange: (value: number | null) => void;
  onResetFilters: () => void;
}

export default function SearchResultsPanel({
  query,
  loading,
  error,
  results,
  filters,
  onDistanceChange,
  onRatingChange,
  onResetFilters,
}: SearchResultsPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const filterEase = [0.22, 1, 0.36, 1] as const;
  const hasFilters = Boolean(filters.distanceKm || filters.minRating);
  const hasCoordinateBusinesses = useMemo(
    () =>
      results.some(
        (business) =>
          typeof business.lat === "number" && Number.isFinite(business.lat) &&
          typeof business.lng === "number" && Number.isFinite(business.lng)
      ),
    [results]
  );

  const renderFilterLink = (
    label: string,
    active: boolean,
    onClick: () => void,
    index: number
  ) => (
    <m.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.24, ease: filterEase, delay: index * 0.04 }
      }
      whileHover={prefersReducedMotion ? undefined : { y: -1 }}
      whileTap={prefersReducedMotion ? undefined : { y: 0, scale: 0.99 }}
      className={`text-sm transition-colors duration-200 ${
        active
          ? "text-sage underline underline-offset-4 decoration-1 font-600"
          : "text-charcoal/80 hover:text-sage font-500"
      }`}
    >
      {label}
    </m.button>
  );

  return (
    <div
      className="relative w-full transition-opacity duration-300 ease-in-out"
      aria-live="polite"
    >
      <LocationPromptBanner hasCoordinateBusinesses={hasCoordinateBusinesses} />
      <div className="rounded-[20px] border border-white/[0.12] bg-off-white/80 shadow-inner p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-charcoal/60">
              Search Mode
            </p>
            <h2 className="text-2xl font-semibold text-charcoal">
              Results for "{query}"
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasFilters && (
              <m.button
                type="button"
                onClick={onResetFilters}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: filterEase }}
                whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                whileTap={prefersReducedMotion ? undefined : { y: 0, scale: 0.99 }}
                className="text-sm text-charcoal/80 hover:text-charcoal underline underline-offset-4 decoration-1 font-600 transition-colors duration-200"
              >
                Clear filters
              </m.button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-charcoal/60">
              Distance
            </p>
            <div className="mt-2 flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide">
              {DISTANCE_FILTERS.map((filter, index) => (
                <div key={`distance-${filter.value}-${filter.label}`} className="inline-flex items-center shrink-0">
                  {index > 0 && (
                    <span aria-hidden className="mx-2 text-charcoal/55">
                      |
                    </span>
                  )}
                  {renderFilterLink(
                    filter.label,
                    filters.distanceKm === filter.value,
                    () => onDistanceChange(filters.distanceKm === filter.value ? null : filter.value),
                    index
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-charcoal/60">
              Rating
            </p>
            <div className="mt-2 flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide">
              {RATING_FILTERS.map((filter, index) => (
                <div key={`rating-${filter.value}-${filter.label}`} className="inline-flex items-center shrink-0">
                  {index > 0 && (
                    <span aria-hidden className="mx-2 text-charcoal/55">
                      |
                    </span>
                  )}
                  {renderFilterLink(
                    filter.label,
                    filters.minRating === filter.value,
                    () => onRatingChange(filters.minRating === filter.value ? null : filter.value),
                    index
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <ul className="list-none mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skeletonItems.map((item) => (
              <li
                key={item}
                className="h-56 w-full animate-pulse rounded-2xl bg-slate-200/60"
              />
            ))}
          </ul>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-[16px] border border-coral/30 bg-coral/10 px-4 py-5 text-sm text-coral">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="mt-6 rounded-[16px] border border-charcoal/10 bg-white px-5 py-6 text-sm text-charcoal/70">
            No matches found for "{query}". Try adjusting your spelling or filters.
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <ul className="list-none mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((business, index) => (
              <BusinessCard
                key={business.id}
                business={{
                  ...business,
                  percentiles: undefined,
                  reviews: typeof business.reviews === "number" ? business.reviews : 0,
                  alt: business.name,
                  rating: business.rating ?? business.stats?.average_rating ?? 0,
                  hasRating: Boolean(business.stats?.average_rating),
                }}
                compact
                inGrid
                index={index}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
