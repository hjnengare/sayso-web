"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Fontdiner_Swanky } from "next/font/google";
import { useBusinesses } from "../../hooks/useBusinesses";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import SimilarBusinessCard from "./SimilarBusinessCard";
import StaggeredContainer from "../Animations/StaggeredContainer";
import AnimatedElement from "../Animations/AnimatedElement";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
import {
  sortByPersonalization,
  type BusinessForScoring,
  type UserPreferences as PersonalizationPreferences,
} from "../../lib/services/personalizationService";

interface SimilarBusinessesProps {
  currentBusinessId: string;
  category: string;
  location?: string;
  interestId?: string | null;
  subInterestId?: string | null;
  limit?: number;
}

type SearchStrategy = 'both' | 'category' | 'location' | 'interest';

export default function SimilarBusinesses({
  currentBusinessId,
  category,
  location,
  interestId,
  subInterestId,
  limit = 3,
}: SimilarBusinessesProps) {
  const [searchStrategy, setSearchStrategy] = useState<SearchStrategy>('both');
  const hasTriedFallbacksRef = useRef(false);
  const lastPropsRef = useRef({ currentBusinessId, category, location, interestId, subInterestId });
  
  // Get user preferences for personalization
  const { interests, subcategories, dealbreakers } = useUserPreferences();
  const userPreferences: PersonalizationPreferences = useMemo(() => ({
    interestIds: interests.map(i => i.id),
    subcategoryIds: subcategories.map(s => s.id),
    dealbreakerIds: dealbreakers.map(d => d.id),
  }), [interests, subcategories, dealbreakers]);
  
  // Reset strategy when props change
  useEffect(() => {
    const propsChanged = 
      lastPropsRef.current.currentBusinessId !== currentBusinessId ||
      lastPropsRef.current.category !== category ||
      lastPropsRef.current.location !== location ||
      lastPropsRef.current.interestId !== interestId ||
      lastPropsRef.current.subInterestId !== subInterestId;
    
    if (propsChanged) {
      console.log('[SimilarBusinesses] Props changed, resetting strategy', {
        old: lastPropsRef.current,
        new: { currentBusinessId, category, location, interestId, subInterestId },
      });
      setSearchStrategy('both');
      hasTriedFallbacksRef.current = false;
      lastPropsRef.current = { currentBusinessId, category, location, interestId, subInterestId };
    }
  }, [currentBusinessId, category, location, interestId, subInterestId]);

  // Strategy 1: Try with both category and location (most relevant)
  const { 
    businesses: businessesBoth, 
    loading: loadingBoth
  } = useBusinesses({
    category,
    location,
    limit: limit + 1,
    sortBy: "total_rating",
    sortOrder: "desc",
    skip: searchStrategy !== 'both',
  });

  // Strategy 2: Fallback to category only
  const { 
    businesses: businessesCategory, 
    loading: loadingCategory 
  } = useBusinesses({
    category,
    limit: limit + 1,
    sortBy: "total_rating",
    sortOrder: "desc",
    skip: searchStrategy !== 'category',
  });

  // Strategy 3: Fallback to location only (if location exists)
  const { 
    businesses: businessesLocation, 
    loading: loadingLocation 
  } = useBusinesses({
    location,
    limit: limit + 1,
    sortBy: "total_rating",
    sortOrder: "desc",
    skip: searchStrategy !== 'location' || !location,
  });

  // Strategy 4: Fallback to same interest_id (sibling categories/subcategories within same interest)
  const { 
    businesses: businessesInterest, 
    loading: loadingInterest 
  } = useBusinesses({
    interestIds: interestId ? [interestId] : undefined,
    limit: limit + 1,
    sortBy: "total_rating",
    sortOrder: "desc",
    skip: searchStrategy !== 'interest' || !interestId,
  });

  // Determine which businesses to use based on current strategy
  const rawBusinesses = useMemo(() => {
    if (searchStrategy === 'both') return businessesBoth || [];
    if (searchStrategy === 'category') return businessesCategory || [];
    if (searchStrategy === 'location') return businessesLocation || [];
    if (searchStrategy === 'interest') return businessesInterest || [];
    return [];
  }, [searchStrategy, businessesBoth, businessesCategory, businessesLocation, businessesInterest]);

  const loading = useMemo(() => {
    if (searchStrategy === 'both') return loadingBoth;
    if (searchStrategy === 'category') return loadingCategory;
    if (searchStrategy === 'location') return loadingLocation;
    if (searchStrategy === 'interest') return loadingInterest;
    return false;
  }, [searchStrategy, loadingBoth, loadingCategory, loadingLocation, loadingInterest]);

  // Filter out current business, remove duplicates, apply personalization, and limit results
  const similarBusinesses = useMemo(() => {
    if (!rawBusinesses || rawBusinesses.length === 0) return [];
    
    // Create a Map to track unique businesses by ID
    const uniqueBusinessesMap = new Map<string, typeof rawBusinesses[0]>();
    
    // Filter out current business and collect unique businesses
    rawBusinesses.forEach((b) => {
      // Check if this business is the current one by comparing both ID and slug
      const isCurrentBusiness = 
        b.id === currentBusinessId || 
        (b.slug && b.slug === currentBusinessId);
      
      // Only add if it's not the current business and not already in the map
      if (!isCurrentBusiness && !uniqueBusinessesMap.has(b.id)) {
        uniqueBusinessesMap.set(b.id, b);
      }
    });
    
    // Convert Map values to array
    let filtered = Array.from(uniqueBusinessesMap.values());
    
    // Apply personalization if user has preferences
    if (userPreferences.interestIds.length > 0 || userPreferences.subcategoryIds.length > 0) {
      const businessesForScoring: BusinessForScoring[] = filtered.map(b => ({
        id: b.id,
        interest_id: b.interestId || null,
        sub_interest_id: b.subInterestId || null,
        category: b.category,
        price_range: b.priceRange,
        average_rating: b.totalRating,
        total_reviews: b.reviews,
        distance_km: typeof b.distance === 'number' ? b.distance : (typeof b.distance === 'string' ? parseFloat(b.distance) || null : null),
        percentiles: b.percentiles || null,
        verified: b.verified,
        created_at: undefined,
        updated_at: undefined,
      }));
      
      // Sort by personalization score
      const sorted = sortByPersonalization(businessesForScoring, userPreferences);
      
      // Map back to original business objects
      const sortedMap = new Map(sorted.map(b => [b.id, b]));
      filtered = filtered
        .filter(b => sortedMap.has(b.id))
        .sort((a, b) => {
          const indexA = sorted.findIndex(s => s.id === a.id);
          const indexB = sorted.findIndex(s => s.id === b.id);
          return indexA - indexB;
        });
    }
    
    // Limit results and add href
    return filtered
      .slice(0, limit)
      .map((b) => ({
        ...b,
        href: `/business/${b.slug || b.id}`,
      }));
  }, [rawBusinesses, currentBusinessId, limit, userPreferences]);

  // Handle fallback strategies when current strategy returns no results
  useEffect(() => {
    // Only try fallbacks after initial load completes
    if (loading) return;

    const hasResults = similarBusinesses && similarBusinesses.length > 0;
    const hasRawResults = rawBusinesses && rawBusinesses.length > 0;

    // Log current state
    console.log('[SimilarBusinesses] Strategy check:', {
      strategy: searchStrategy,
      rawBusinessesCount: rawBusinesses?.length || 0,
      filteredBusinessesCount: similarBusinesses?.length || 0,
      hasResults,
      hasRawResults,
      category,
      location,
      currentBusinessId,
      triedFallbacks: hasTriedFallbacksRef.current,
    });

    // If we have results, log success and stop
    if (hasResults) {
      console.log('[SimilarBusinesses] ✓ Success! Found similar businesses:', {
        strategy: searchStrategy,
        count: similarBusinesses.length,
        usedFallback: hasTriedFallbacksRef.current,
        businesses: similarBusinesses.map(b => ({ 
          id: b.id, 
          name: b.name, 
          category: b.category, 
          location: b.location 
        })),
      });
      return;
    }

    // No results - try fallback strategies
    if (!hasResults) {
      if (searchStrategy === 'both') {
        console.log('[SimilarBusinesses] ⚠ No results with category+location, falling back to category only');
        setSearchStrategy('category');
        hasTriedFallbacksRef.current = true;
      } else if (searchStrategy === 'category' && location) {
        console.log('[SimilarBusinesses] ⚠ No results with category only, falling back to location only');
        setSearchStrategy('location');
        hasTriedFallbacksRef.current = true;
      } else if (searchStrategy === 'location' && interestId) {
        console.log('[SimilarBusinesses] ⚠ No results with location only, falling back to same interest (sibling categories/subcategories)');
        setSearchStrategy('interest');
        hasTriedFallbacksRef.current = true;
      } else {
        // All strategies exhausted
        console.log('[SimilarBusinesses] ✗ All strategies exhausted. No similar businesses found.', {
          category,
          location,
          interestId,
          subInterestId,
          currentBusinessId,
          triedStrategies: [
            'both', 
            'category', 
            location ? 'location' : null,
            interestId ? 'interest' : null
          ].filter(Boolean),
        });
      }
    }
  }, [loading, rawBusinesses, similarBusinesses, searchStrategy, category, location, interestId, subInterestId, currentBusinessId]);

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
            <div className="inline-flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/50 font-bold">Similar Businesses</p>
              </div>
              <h2 id="similar-businesses-heading" className="sr-only">You Might Also Like</h2>
              <WavyTypedTitle
                text="You Might Also Like"
                as="h2"
                className={`${swanky.className} text-2xl sm:text-3xl font-bold text-charcoal`}
                typingSpeedMs={40}
                startDelayMs={300}
                waveVariant="subtle"
                loopWave={true}
                style={{ 
                  fontFamily: swanky.style.fontFamily,
                }}
              />
            </div>
          </div>
        </div>
        <ul className="list-none flex flex-col sm:flex-row sm:justify-between gap-4 md:gap-6 relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6">
          {[...Array(limit)].map((_, i) => (
            <li key={i} className="flex-1 min-w-0">
              <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden w-full flex flex-col border border-white/60 backdrop-blur-xl shadow-md animate-pulse md:w-[340px] md:h-[416px]">
                {/* Image Section Skeleton */}
                <div className="relative w-full h-[300px] lg:h-[260px] overflow-hidden rounded-t-[20px] bg-gradient-to-br from-off-white/90 via-off-white/85 to-off-white/90" />
                {/* Content Section Skeleton */}
                <div className="px-4 py-4 bg-gradient-to-b from-card-bg/95 to-card-bg flex flex-col gap-2 rounded-b-[20px]">
                  <div className="h-5 w-3/4 bg-charcoal/10 rounded-lg mx-auto" />
                  <div className="h-4 w-full bg-charcoal/5 rounded mt-1" />
                  <div className="h-4 w-2/3 bg-charcoal/5 rounded" />
                  <div className="h-3 w-1/2 bg-charcoal/5 rounded mt-1" />
                  <div className="mt-3 h-10 w-full bg-charcoal/10 rounded-full" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }


  // Don't render if no results after all strategies
  if (!loading && (!similarBusinesses || similarBusinesses.length === 0)) {
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
            <h2 id="similar-businesses-heading" className="sr-only">You Might Also Like</h2>
            <WavyTypedTitle
              text="You Might Also Like"
              as="h2"
              className={`${swanky.className} text-2xl sm:text-3xl font-bold text-charcoal`}
              typingSpeedMs={40}
              startDelayMs={300}
              waveVariant="subtle"
              loopWave={true}
              style={{ 
                fontFamily: swanky.style.fontFamily,
              }}
            />
          </div>
        </div>
      </div>

      <StaggeredContainer>
        <ul className="list-none flex flex-col sm:flex-row sm:justify-between gap-4 md:gap-6 relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6">
          {similarBusinesses.map((business, index) => (
            <AnimatedElement key={business.id} index={index} direction="bottom">
              <li className="flex-1 min-w-0">
                <SimilarBusinessCard
                  id={business.id}
                  slug={business.slug}
                  name={business.name}
                  image={business.image}
                  image_url={business.image_url}
                  uploaded_image={business.uploaded_image}
                  category={business.category}
                  location={business.location}
                  address={business.address}
                  description={business.description}
                  rating={business.rating}
                  totalRating={business.totalRating}
                  reviews={business.reviews}
                  verified={business.verified}
                  priceRange={business.priceRange}
                  compact={true}
                />
              </li>
            </AnimatedElement>
          ))}
        </ul>
      </StaggeredContainer>
    </section>
  );
}
