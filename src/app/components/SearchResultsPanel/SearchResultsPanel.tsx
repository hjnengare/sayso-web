"use client";

import BusinessCard from "../BusinessCard/BusinessCard";
import type { LiveSearchFilters, LiveSearchResult } from "@/app/hooks/useLiveSearch";
import { Fragment, useMemo } from "react";
import LocationPromptBanner from "../Location/LocationPromptBanner";

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

  const renderPill = (
    label: string,
    active: boolean,
    onClick: () => void
  ) => (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
        active
          ? "border-sage bg-sage/15 shadow-sm text-charcoal"
          : "border-charcoal/10 bg-off-white text-charcoal/80 hover:border-charcoal/30"
      }`}
    >
      {label}
    </button>
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
              <button
                type="button"
                onClick={onResetFilters}
                className="rounded-full border border-charcoal/30 bg-white/80 px-4 py-1.5 text-sm font-semibold text-charcoal/80 shadow-sm transition hover:border-charcoal hover:text-charcoal"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-charcoal/60">
              Distance
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DISTANCE_FILTERS.map((filter) => (
                <Fragment key={`distance-${filter.value}-${filter.label}`}>
                  {renderPill(
                    filter.label,
                    filters.distanceKm === filter.value,
                    () => onDistanceChange(filters.distanceKm === filter.value ? null : filter.value)
                  )}
                </Fragment>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-charcoal/60">
              Rating
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {RATING_FILTERS.map((filter) => (
                <Fragment key={`rating-${filter.value}-${filter.label}`}>
                  {renderPill(
                    filter.label,
                    filters.minRating === filter.value,
                    () => onRatingChange(filters.minRating === filter.value ? null : filter.value)
                  )}
                </Fragment>
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
