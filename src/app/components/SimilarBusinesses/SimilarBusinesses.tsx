"use client";

import { useState, useEffect } from "react";
import SimilarBusinessCard from "./SimilarBusinessCard";
import StaggeredContainer from "../Animations/StaggeredContainer";
import AnimatedElement from "../Animations/AnimatedElement";
import WavyTypedTitle from "@/app/components/Animations/WavyTypedTitle";

interface SimilarBusinessesProps {
  currentBusinessId: string;
  category: string;
  location?: string;
  interestId?: string | null;
  subInterestId?: string | null;
  limit?: number;
}

interface SimilarBusiness {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  image_url?: string;
  uploaded_images?: string[];
  category: string;
  location: string;
  address?: string;
  description?: string;
  rating?: number;
  totalRating?: number;
  reviews?: number;
  verified?: boolean;
  priceRange?: string;
  href?: string;
  similarity_score?: number;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  subInterestId?: string;
  subInterestLabel?: string;
}

export default function SimilarBusinesses({
  currentBusinessId,
  category,
  location,
  interestId,
  subInterestId,
  limit = 3,
}: SimilarBusinessesProps) {
  const [similarBusinesses, setSimilarBusinesses] = useState<SimilarBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchSimilarBusinesses() {
      try {
        setLoading(true);
        setError(null);

        // Call the new similar businesses API endpoint
        const response = await fetch(
          `/api/businesses/${currentBusinessId}/similar?limit=${limit}&radius_km=50`,
          {
            cache: 'no-store', // Always fetch fresh data
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            // Business not found or no similar businesses
            if (isMounted) {
              setSimilarBusinesses([]);
              setLoading(false);
            }
            return;
          }
          // Get error details from response body
          const errorText = await response.text();
          let errorMessage = `Failed to fetch similar businesses: ${response.statusText}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.details || errorJson.message || errorMessage;
            console.error('[SimilarBusinesses] API error details:', errorJson);
          } catch {
            // If response isn't JSON, use the text as-is
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (isMounted) {
          const businesses = (data.businesses || []) as SimilarBusiness[];
          setSimilarBusinesses(businesses);
          setLoading(false);

          // Best-effort: if we have coordinates but no address, resolve an address.
          // (Mobile-first: no hover dependency; keeps UI readable.)
          const needsReverse = businesses.filter(
            (b) =>
              (!b.address || b.address.trim() === "") &&
              typeof b.latitude === "number" &&
              typeof b.longitude === "number"
          );

          if (needsReverse.length > 0) {
            Promise.all(
              needsReverse.map(async (b) => {
                try {
                  const r = await fetch("/api/geocode/reverse", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ latitude: b.latitude, longitude: b.longitude }),
                  });
                  if (!r.ok) return { id: b.id, address: undefined as string | undefined };
                  const j = (await r.json()) as { success?: boolean; address?: string };
                  if (!j?.success || !j.address) return { id: b.id, address: undefined as string | undefined };
                  return { id: b.id, address: j.address as string };
                } catch {
                  return { id: b.id, address: undefined as string | undefined };
                }
              })
            ).then((resolved) => {
              if (!isMounted) return;
              setSimilarBusinesses((prev) => {
                if (!prev?.length) return prev;
                const map = new Map(resolved.filter((x) => x.address).map((x) => [x.id, x.address!] as const));
                if (map.size === 0) return prev;
                return prev.map((b) => {
                  const addr = map.get(b.id);
                  if (!addr) return b;
                  return { ...b, address: addr };
                });
              });
            });
          }
        }
      } catch (err: any) {
        console.error('[SimilarBusinesses] Error fetching similar businesses:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load similar businesses');
          setSimilarBusinesses([]);
          setLoading(false);
        }
      }
    }

    fetchSimilarBusinesses();

    return () => {
      isMounted = false;
    };
  }, [currentBusinessId, limit]);


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
                <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/70 font-bold">Similar Businesses</p>
              </div>
              <h2 id="similar-businesses-heading" className="sr-only">You Might Also Like</h2>
            <WavyTypedTitle
              text="You Might Also Like"
              as="h3"
              className="font-urbanist text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal"
                typingSpeedMs={40}
                startDelayMs={300}
                waveVariant="subtle"
                loopWave={true}
                style={{
                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                }}
              />
            </div>
          </div>
        </div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6">
          <ul className="list-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(limit)].map((_, i) => (
              <li key={i}>
              <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden w-full flex flex-col border-none backdrop-blur-xl shadow-md animate-pulse h-full min-h-[416px]">
                {/* Image Section Skeleton */}
                <div className="relative w-full h-[300px] lg:h-[260px] overflow-hidden rounded-t-[12px] bg-gradient-to-br from-off-white/90 via-off-white/85 to-off-white/90" />
                {/* Content Section Skeleton */}
                <div className="px-4 py-4 bg-gradient-to-b from-card-bg/95 to-card-bg flex flex-col gap-2 rounded-b-[12px]">
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
        </div>
      </section>
    );
  }


  // Don't render if no results
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
              <p className="text-[11px] uppercase tracking-[0.15em] text-charcoal/70 font-bold">Similar Businesses</p>
            </div>
            <h2 id="similar-businesses-heading" className="sr-only">You Might Also Like</h2>
            <WavyTypedTitle
              text="You Might Also Like"
              as="h2"
              className="font-urbanist text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal"
              typingSpeedMs={40}
              startDelayMs={300}
              waveVariant="subtle"
              loopWave={false}
              triggerOnTypingComplete={false}
              enableScrollTrigger={true}
              style={{
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            />
          </div>
        </div>
      </div>

      <StaggeredContainer>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6">
          <ul className="list-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {similarBusinesses.map((business, index) => (
              <AnimatedElement key={business.id} index={index} direction="bottom">
                <li>
                <SimilarBusinessCard
                  id={business.id}
                  slug={business.slug}
                  name={business.name}
                  image={business.image}
                  image_url={business.image_url}
                  uploaded_images={business.uploaded_images}
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
                  distanceKm={business.distance_km}
                  subInterestId={business.subInterestId}
                  subInterestLabel={business.subInterestLabel}
                />
                </li>
              </AnimatedElement>
            ))}
          </ul>
        </div>
      </StaggeredContainer>
    </section>
  );
}
