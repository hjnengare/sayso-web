// src/components/SpecialDetail/SpecialLocation.tsx
"use client";

import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import Mapbox to avoid SSR issues
const MapboxMap = dynamic(() => import("../BusinessDetail/MapboxMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-off-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-coral/15 flex items-center justify-center animate-pulse">
                    <MapPin className="w-7 h-7 text-coral" />
                </div>
            </div>
        </div>
    ),
});

interface SpecialLocationProps {
    name: string;
    venue?: string | null;
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
}

export default function SpecialLocation({
    name,
    venue,
    location,
    latitude,
    longitude,
}: SpecialLocationProps) {
    const hasCoordinates = latitude != null && longitude != null;
    const displayLocation = venue || location || "";

    if (!displayLocation && !hasCoordinates) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md overflow-hidden">
            {hasCoordinates && (
                <div className="h-[300px] sm:h-[400px] relative">
                    <MapboxMap
                        latitude={latitude!}
                        longitude={longitude!}
                        name={name}
                    />
                </div>
            )}
            <div className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-5 h-5 text-coral" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3
                            className="text-sm font-semibold text-charcoal/70 mb-1.5"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                            Venue Location
                        </h3>
                        {displayLocation && (
                            <p
                                className="text-base font-medium text-charcoal break-words"
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                                {displayLocation}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
