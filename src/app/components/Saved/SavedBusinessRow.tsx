// src/components/Saved/SavedBusinessRow.tsx
"use client";

import { useMemo } from "react";
import { BookmarkCheck } from "lucide-react";
import BusinessCard, { Business } from "../BusinessCard/BusinessCard";
import ScrollableSection from "../ScrollableSection/ScrollableSection";
import { useSavedItems } from "../../contexts/SavedItemsContext";
import LocationPromptBanner from "../Location/LocationPromptBanner";

export default function SavedBusinessRow({
  title,
  businesses,
  showCount = false,
}: {
  title: string;
  businesses: Business[];
  showCount?: boolean;
}) {
  const { savedCount } = useSavedItems();
  const hasCoordinateBusinesses = useMemo(
    () =>
      businesses.some(
        (business) =>
          typeof business.lat === "number" && Number.isFinite(business.lat) &&
          typeof business.lng === "number" && Number.isFinite(business.lng)
      ),
    [businesses]
  );

  if (!businesses || businesses.length === 0) return null;

  return (
    <section
      className="relative font-urbanist"
      aria-label={title}
      data-section
      style={{
        fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <LocationPromptBanner hasCoordinateBusinesses={hasCoordinateBusinesses} />
      <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 
              className="text-h2 font-semibold text-charcoal hover:text-sage transition-all duration-300 px-3 sm:px-4 py-1 hover:bg-sage/5 rounded-lg cursor-default"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              {title}
            </h2>
            {showCount && savedCount > 0 && (
              <span 
                className="px-3 py-1 bg-sage/10 text-sage text-body-sm font-semibold rounded-full"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {savedCount}
              </span>
            )}
          </div>
        </div>

        <ScrollableSection>
          <div className="flex gap-3 pt-2">
            {businesses.map((business) => {
              console.log('SavedBusinessRow - Rendering business:', {
                id: business.id,
                name: business.name,
                hasImage: !!(business.image || business.image_url || (business.uploaded_images && business.uploaded_images.length > 0)),
                hasRating: business.hasRating,
                verified: business.verified
              });
              
              return (
                <div 
                  key={business.id} 
                  className="list-none relative group flex-shrink-0" 
                  style={{ 
                    minWidth: '340px', 
                    width: '340px'
                  }}
                >
                  <BusinessCard business={business} />
                  {/* Saved indicator */}
                  <div className="absolute top-3 right-3 w-8 h-8 bg-gradient-to-br from-sage to-sage/80 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/40 z-10 opacity-90 group-hover:opacity-100 transition-all duration-300">
                    <BookmarkCheck className="w-4 h-4 text-white" fill="white" />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollableSection>
      </div>
    </section>
  );
}
