// src/components/SpecialDetail/SpecialContactInfo.tsx
"use client";

import { Phone, Globe, MapPin } from "lucide-react";
import { m } from "framer-motion";

interface SpecialContactInfoProps {
    phone?: string | null;
    website?: string | null;
    location?: string;
    onViewMap?: () => void;
    showMapLink?: boolean;
}

export default function SpecialContactInfo({
    phone,
    website,
    location,
    onViewMap,
    showMapLink = false,
}: SpecialContactInfoProps) {
    // Don't render if no contact info available
    if (!phone && !website && !location) {
        return null;
    }

    return (
        <m.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-5 sm:p-6"
        >
            <h3
                className="text-lg font-bold text-charcoal mb-4"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
                Venue Information
            </h3>

            <div className="space-y-3">
                {phone && (
                    <a
                        href={`tel:${phone}`}
                        className="flex items-center gap-3 text-charcoal/80 hover:text-coral transition-colors duration-200 group"
                    >
                        <div className="w-10 h-10 rounded-full bg-coral/10 group-hover:bg-coral/20 flex items-center justify-center flex-shrink-0 transition-colors duration-200">
                            <Phone className="w-4 h-4 text-coral" />
                        </div>
                        <span
                            className="text-sm font-medium"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                            {phone}
                        </span>
                    </a>
                )}

                {website && (
                    <a
                        href={website.startsWith('http') ? website : `https://${website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-charcoal/80 hover:text-sage transition-colors duration-200 group"
                    >
                        <div className="w-10 h-10 rounded-full bg-card-bg/10 group-hover:bg-card-bg/20 flex items-center justify-center flex-shrink-0 transition-colors duration-200">
                            <Globe className="w-4 h-4 text-sage" />
                        </div>
                        <span
                            className="text-sm font-medium truncate"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                            {website.replace(/^https?:\/\//, '')}
                        </span>
                    </a>
                )}

                {location && (
                    <div className="flex items-center gap-3 text-charcoal/80">
                        <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-coral" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p
                                className="text-sm font-medium break-words"
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                                {location}
                            </p>
                            {showMapLink && onViewMap && (
                                <button
                                    onClick={onViewMap}
                                    className="text-xs text-sage hover:text-sage/80 font-medium mt-1"
                                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                                >
                                    View on map
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </m.div>
    );
}
