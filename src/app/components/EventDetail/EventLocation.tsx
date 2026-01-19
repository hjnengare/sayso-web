"use client";
// src/components/EventDetail/EventLocation.tsx

import { MapPin } from "lucide-react";

interface EventLocationProps {
    name: string;
    venue?: string | null;
    city?: string;
    latitude?: number | null;
    longitude?: number | null;
}

export default function EventLocation({
    name,
    venue,
    city,
    latitude,
    longitude,
}: EventLocationProps) {
    const hasCoordinates = latitude != null && longitude != null;
    const displayLocation = venue || city || "";

    if (!displayLocation && !hasCoordinates) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md overflow-hidden">
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
                            Event Location
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
