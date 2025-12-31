"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, ExternalLink, Maximize2, Copy, Check, X } from "react-feather";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";

// Dynamically import Mapbox to avoid SSR issues
const MapboxMap = dynamic(() => import("./MapboxMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-off-white/50 flex items-center justify-center">
            <div className="text-charcoal/60 text-sm">Loading map...</div>
        </div>
    ),
});

interface BusinessLocationProps {
    name: string;
    address?: string | null;
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
}

export default function BusinessLocation({
    name,
    address,
    location,
    latitude,
    longitude,
}: BusinessLocationProps) {
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const hasCoordinates = latitude != null && longitude != null;
    const displayLocation = address || location || "";

    const getDirectionsUrl = () => {
        if (latitude && longitude) {
            // Use coordinates for precise location
            if (navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")) {
                return `maps://maps.apple.com/?q=${latitude},${longitude}`;
            }
            return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        }
        // Fallback to address/location search
        const query = address || location || "";
        const encodedQuery = encodeURIComponent(`${name} ${query}`);
        if (navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")) {
            return `maps://maps.apple.com/?q=${encodedQuery}`;
        }
        return `https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`;
    };

    const copyAddress = async () => {
        const textToCopy = address || location || "";
        if (textToCopy) {
            try {
                await navigator.clipboard.writeText(textToCopy);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error("Failed to copy:", err);
            }
        }
    };

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isMapModalOpen) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isMapModalOpen]);

    if (!hasCoordinates && !displayLocation) {
        return null;
    }

    return (
        <>
            <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-[20px] ring-1 ring-white/20 shadow-md overflow-hidden">
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-white/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-coral" />
                            <h3
                                className="text-base font-semibold text-charcoal"
                                style={{
                                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                    fontWeight: 600,
                                }}
                            >
                                Location
                            </h3>
                        </div>
                    </div>
                    {location && (
                        <p
                            className="text-sm text-charcoal/80 mt-1 ml-7"
                            style={{
                                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                            }}
                        >
                            {location}
                        </p>
                    )}
                    {address && (
                        <p
                            className="text-sm text-charcoal/70 mt-0.5 ml-7"
                            style={{
                                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                            }}
                        >
                            {address}
                        </p>
                    )}
                </div>

                {/* Map Container or Fallback */}
                {hasCoordinates ? (
                    <>
                        <div className="relative w-full h-[300px] sm:h-[400px] overflow-hidden">
                            <MapboxMap
                                latitude={latitude}
                                longitude={longitude}
                                name={name}
                            />
                        </div>

                        {/* Actions */}
                        <div className="px-4 sm:px-6 py-3 border-t border-white/20 flex items-center justify-between gap-3">
                            <button
                                onClick={() => setIsMapModalOpen(true)}
                                className="flex items-center gap-2 text-sm font-semibold text-charcoal hover:text-coral transition-colors"
                                style={{
                                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                    fontWeight: 600,
                                }}
                            >
                                <Maximize2 className="w-4 h-4" />
                                View larger map
                            </button>
                            <a
                                href={getDirectionsUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm font-semibold text-charcoal hover:text-coral transition-colors"
                                style={{
                                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                    fontWeight: 600,
                                }}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Get directions
                            </a>
                        </div>
                    </>
                ) : (
                    <div className="px-4 sm:px-6 py-6">
                        <div className="text-center py-8">
                            <MapPin className="w-12 h-12 text-charcoal/40 mx-auto mb-3" />
                            <p
                                className="text-sm text-charcoal/70 mb-4"
                                style={{
                                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                }}
                            >
                                Map not available yet
                            </p>
                            <a
                                href={getDirectionsUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-full text-sm font-semibold hover:bg-coral/90 transition-colors"
                                style={{
                                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                    fontWeight: 600,
                                }}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Get directions
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Full-Screen Map Modal */}
            {isMapModalOpen && hasCoordinates && typeof window !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-charcoal/95 backdrop-blur-sm"
                    onClick={() => setIsMapModalOpen(false)}
                >
                    <div
                        className="relative w-full h-full flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-4 sm:px-6 py-4 bg-charcoal/90 border-b border-white/10 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <h2
                                    className="text-lg font-semibold text-white truncate"
                                    style={{
                                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                        fontWeight: 600,
                                    }}
                                >
                                    {name}
                                </h2>
                                {displayLocation && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <p
                                            className="text-sm text-white/80 truncate"
                                            style={{
                                                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                            }}
                                        >
                                            {displayLocation}
                                        </p>
                                        <button
                                            onClick={copyAddress}
                                            className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                            aria-label="Copy address"
                                        >
                                            {copied ? (
                                                <Check className="w-4 h-4 text-coral" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-white/60" />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setIsMapModalOpen(false)}
                                className="ml-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                aria-label="Close map"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Full Map */}
                        <div className="flex-1 relative">
                            <MapboxMap
                                latitude={latitude}
                                longitude={longitude}
                                name={name}
                            />
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="px-4 sm:px-6 py-4 bg-charcoal/90 border-t border-white/10 flex items-center justify-between gap-3">
                            <a
                                href={getDirectionsUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-coral text-white rounded-full text-sm font-semibold hover:bg-coral/90 transition-colors"
                                style={{
                                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                    fontWeight: 600,
                                }}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Get directions
                            </a>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
