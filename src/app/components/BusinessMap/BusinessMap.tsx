"use client";

import { MapPin, ExternalLink } from "react-feather";
import { useMemo } from "react";

interface BusinessMapProps {
  name: string;
  address?: string | null;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export default function BusinessMap({
  name,
  address,
  location,
  latitude,
  longitude,
}: BusinessMapProps) {
  // Build the query for Google Maps
  const mapQuery = useMemo(() => {
    if (address) {
      return encodeURIComponent(`${name}, ${address}`);
    }
    if (location) {
      return encodeURIComponent(`${name}, ${location}`);
    }
    if (latitude && longitude) {
      return `${latitude},${longitude}`;
    }
    return null;
  }, [name, address, location, latitude, longitude]);

  // Google Maps embed URL
  const mapEmbedUrl = useMemo(() => {
    if (latitude && longitude) {
      // Use coordinates for precise location
      return `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=${latitude},${longitude}&zoom=15`;
    }
    if (mapQuery) {
      // Use address/location search
      return `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=${mapQuery}&zoom=15`;
    }
    return null;
  }, [latitude, longitude, mapQuery]);

  // Google Maps search URL (for fallback link)
  const mapSearchUrl = useMemo(() => {
    if (mapQuery) {
      return `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
    }
    return null;
  }, [mapQuery]);

  // If no location data available, don't render
  if (!mapQuery && !latitude && !longitude) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden border border-white/60 backdrop-blur-xl shadow-md">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-white/60 bg-gradient-to-br from-sage/10 via-sage/8 to-sage/10">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-navbar-bg flex-shrink-0" />
            <h3
              className="text-base sm:text-lg font-bold text-charcoal"
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 700,
              }}
            >
              Location
            </h3>
          </div>
          {(address || location) && (
            <p
              className="text-sm text-charcoal/70 mt-1 ml-7"
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              }}
            >
              {address || location}
            </p>
          )}
        </div>

        {/* Map Container */}
        <div className="relative w-full h-[300px] sm:h-[400px] md:h-[450px] bg-off-white/50">
          {mapEmbedUrl && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
            // Google Maps Embed (requires API key)
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={mapEmbedUrl}
              title={`Map showing location of ${name}`}
              className="w-full h-full"
            />
          ) : mapSearchUrl ? (
            // Fallback: Static map image or clickable link
            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-off-white/90 via-off-white/80 to-off-white/70">
              <a
                href={mapSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3 p-6 hover:opacity-80 transition-opacity"
              >
                <div className="w-16 h-16 bg-navbar-bg/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-navbar-bg" />
                </div>
                <div className="text-center">
                  <p
                    className="text-sm font-semibold text-charcoal mb-1"
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      fontWeight: 600,
                    }}
                  >
                    View on Google Maps
                  </p>
                  <p
                    className="text-xs text-charcoal/60"
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    }}
                  >
                    {address || location || 'Click to view location'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-navbar-bg">
                  <span>Open Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </a>
            </div>
          ) : null}
        </div>

        {/* Footer with link to Google Maps */}
        {mapSearchUrl && (
          <div className="px-4 sm:px-5 py-3 border-t border-white/60 bg-gradient-to-br from-sage/10 via-sage/8 to-sage/10">
            <a
              href={mapSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-navbar-bg hover:text-navbar-bg/80 transition-colors"
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              <span>Open in Google Maps</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

