"use client";

import { useEffect, useState, useMemo } from "react";
import { useBusinesses } from "../../hooks/useBusinesses";
import SimilarBusinessCard from "./SimilarBusinessCard";
import { Briefcase } from "react-feather";

interface SimilarBusinessesProps {
  currentBusinessId: string;
  category: string;
  location?: string;
  limit?: number;
}

export default function SimilarBusinesses({
  currentBusinessId,
  category,
  location,
  limit = 6,
}: SimilarBusinessesProps) {
  const { businesses, loading } = useBusinesses({
    category,
    location,
    limit: limit + 1, // Fetch one extra to account for excluding current business
    sortBy: "total_rating",
    sortOrder: "desc",
  });

  // Filter out current business, remove duplicates, and limit results
  const similarBusinesses = useMemo(() => {
    if (!businesses || businesses.length === 0) return [];
    
    // Create a Map to track unique businesses by ID
    const uniqueBusinessesMap = new Map<string, typeof businesses[0]>();
    
    // First pass: filter out current business and collect unique businesses
    businesses.forEach((b) => {
      if (b.id !== currentBusinessId && !uniqueBusinessesMap.has(b.id)) {
        uniqueBusinessesMap.set(b.id, b);
      }
    });
    
    // Convert Map values to array, limit results, and add href
    return Array.from(uniqueBusinessesMap.values())
      .slice(0, limit)
      .map((b) => ({
        ...b,
        href: `/business/${b.id}`,
      }));
  }, [businesses, currentBusinessId, limit]);

  if (loading) {
    return (
      <section className="space-y-8 py-8 relative" aria-labelledby="similar-businesses-heading">
        {/* Premium background decoration */}
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-sage/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-br from-coral/15 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="flex justify-center relative z-10">
          <div className="flex flex-col gap-4 items-center">
            <div className="inline-flex items-center gap-3">
              <h3
                id="similar-businesses-heading"
                className="text-charcoal font-semibold"
                style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}
              >
                Similar Businesses
              </h3>
            </div>
          </div>
        </div>
        <ul className="list-none grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-2 relative z-10">
          {[...Array(6)].map((_, i) => (
            <li key={i}>
              <div className="h-[240px] bg-gradient-to-br from-off-white/90 via-off-white/85 to-off-white/90 rounded-xl border border-white/60 backdrop-blur-xl shadow-lg animate-pulse" />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (!similarBusinesses || similarBusinesses.length === 0) {
    return null;
  }

  return (
    <section className="space-y-8 py-8 relative" aria-labelledby="similar-businesses-heading">
      {/* Premium background decoration */}
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-sage/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-br from-coral/15 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="flex justify-center relative z-10">
        <div className="flex flex-col gap-4 items-center">
          <div className="inline-flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/50 font-bold">Similar Businesses</p>
            </div>
            <h2
              id="similar-businesses-heading"
              className="text-2xl sm:text-3xl font-bold text-charcoal"
              style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}
            >
              You Might Also Like
            </h2>
          </div>
        </div>
      </div>

      <ul className="list-none grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-2 relative z-10">
        {similarBusinesses.map((business) => (
          <li key={business.id}>
            <SimilarBusinessCard
              id={business.id}
              name={business.name}
              image={business.image}
              image_url={business.image_url}
              uploaded_image={business.uploaded_image}
              category={business.category}
              location={business.location}
              rating={business.rating}
              totalRating={business.totalRating}
              reviews={business.reviews}
              verified={business.verified}
              priceRange={business.priceRange}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

