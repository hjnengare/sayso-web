"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ExternalLink, Maximize2, Copy, Check, X, Navigation, Share2, Car, Footprints, Clock } from "lucide-react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import Logo from "../Logo/Logo";
import AddressPill from "./AddressPill";

// Dynamically import Mapbox to avoid SSR issues
const MapboxMap = dynamic(() => import("./MapboxMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-off-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-coral/15 flex items-center justify-center animate-pulse">
                    <MapPin className="w-7 h-7 text-coral" />
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-coral animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-coral animate-pulse" style={{ animationDelay: '200ms' }} />
                    <div className="w-2 h-2 rounded-full bg-coral animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
            </div>
        </div>
    ),
});

interface BusinessLocationProps {
    name: string;
    address?: string | null;
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
    isUserUploaded?: boolean;
}

// Haversine formula to calculate distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Estimate travel time
const estimateTravelTime = (distanceKm: number, mode: 'drive' | 'walk'): string => {
    if (mode === 'walk') {
        const walkingSpeed = 5; // km/h
        const minutes = Math.round((distanceKm / walkingSpeed) * 60);
        if (minutes < 60) return `${minutes} min walk`;
        const hours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        return remainingMins > 0 ? `${hours}h ${remainingMins}m walk` : `${hours}h walk`;
    } else {
        const drivingSpeed = 40; // km/h average in city
        const minutes = Math.round((distanceKm / drivingSpeed) * 60);
        if (minutes < 60) return `${minutes} min drive`;
        const hours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        return remainingMins > 0 ? `${hours}h ${remainingMins}m drive` : `${hours}h drive`;
    }
};

export default function BusinessLocation({
    name,
    address,
    location,
    latitude,
    longitude,
    isUserUploaded = false,
}: BusinessLocationProps) {
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [shareSupported, setShareSupported] = useState(false);

    const hasCoordinates = latitude != null && longitude != null;
    const displayLocation = address || location || "";

    // Check if Web Share API is supported
    useEffect(() => {
        setShareSupported(typeof navigator !== 'undefined' && !!navigator.share);
    }, []);

    // Get user's location for distance calculation
    useEffect(() => {
        if (hasCoordinates && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            setIsLoadingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    setUserLocation({ lat: userLat, lng: userLng });
                    const dist = calculateDistance(userLat, userLng, latitude!, longitude!);
                    setDistance(dist);
                    setIsLoadingLocation(false);
                },
                () => {
                    setIsLoadingLocation(false);
                },
                { timeout: 5000, maximumAge: 300000 }
            );
        }
    }, [hasCoordinates, latitude, longitude]);

    const getDirectionsUrl = (mode: 'driving' | 'walking' = 'driving') => {
        if (latitude && longitude) {
            if (typeof navigator !== 'undefined' && navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")) {
                return `maps://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=${mode === 'walking' ? 'w' : 'd'}`;
            }
            return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=${mode}`;
        }
        const query = address || location || "";
        const encodedQuery = encodeURIComponent(`${name} ${query}`);
        if (typeof navigator !== 'undefined' && navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")) {
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

    const shareLocation = async () => {
        if (!shareSupported) return;

        const shareData = {
            title: name,
            text: `Check out ${name} at ${displayLocation}`,
            url: latitude && longitude
                ? `https://www.google.com/maps?q=${latitude},${longitude}`
                : `https://www.google.com/maps/search/${encodeURIComponent(`${name} ${displayLocation}`)}`,
        };

        try {
            await navigator.share(shareData);
        } catch (err) {
            console.error("Failed to share:", err);
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
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-[20px] ring-1 ring-white/20 shadow-md overflow-hidden"
            >
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-white/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-coral/10 flex items-center justify-center">
                                <MapPin className="w-4.5 h-4.5 text-coral" />
                            </div>
                            <h3
                                className="text-base font-semibold text-charcoal"
                                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                            >
                                Location
                            </h3>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-1">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={copyAddress}
                                className="p-2 rounded-full hover:bg-white/30 transition-colors"
                                aria-label="Copy address"
                            >
                                <AnimatePresence mode="wait">
                                    {copied ? (
                                        <motion.div
                                            key="check"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                        >
                                            <Check className="w-4 h-4 text-charcoal/70" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="copy"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                        >
                                            <Copy className="w-4 h-4 text-charcoal/60" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>

                            {shareSupported && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={shareLocation}
                                    className="p-2 rounded-full hover:bg-white/30 transition-colors"
                                    aria-label="Share location"
                                >
                                    <Share2 className="w-4 h-4 text-charcoal/60" />
                                </motion.button>
                            )}
                        </div>
                    </div>

                    {/* Address with distance */}
                    <div className="mt-2 ml-11.5">
                        {/* Always show primary address/location */}
                        {(location || address) && (
                            <p
                                className="text-sm text-charcoal/80 font-medium"
                                style={{ fontFamily: 'Urbanist, sans-serif' }}
                            >
                                {location || address}
                            </p>
                        )}
                        {/* Show secondary address if it's different from primary */}
                        {address && location && address !== location && (
                            <p
                                className="text-sm text-charcoal/60 mt-0.5"
                                style={{ fontFamily: 'Urbanist, sans-serif' }}
                            >
                                {address}
                            </p>
                        )}
                        {/* If only location exists but no address, show a note */}
                        {location && !address && (
                            <p
                                className="text-xs text-charcoal/50 mt-1 italic"
                                style={{ fontFamily: 'Urbanist, sans-serif' }}
                            >
                                Street address will appear here
                            </p>
                        )}

                        {/* Address Copy Pill - Always show if address or coordinates available */}
                        {(address || latitude || longitude) && (
                            <motion.div
                                initial={{ opacity: 0, y: -3 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3"
                            >
                                <AddressPill
                                    address={address}
                                    latitude={latitude}
                                    longitude={longitude}
                                    isUserUploaded={isUserUploaded}
                                />
                            </motion.div>
                        )}

                        {/* Distance & Travel Time - Premium Design */}
                        {distance !== null && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 flex flex-wrap items-center gap-2"
                            >
                                {/* Distance Pill */}
                                <span
                                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-off-white border border-charcoal/10 text-charcoal/80 text-sm font-medium transition-all hover:border-charcoal/20 hover:bg-off-white/80"
                                    style={{ fontFamily: 'Urbanist, sans-serif' }}
                                >
                                    <Navigation className="w-4 h-4 text-sage" />
                                    <span className="font-600">{distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}</span>
                                    <span className="text-charcoal/60">away</span>
                                </span>

                                {/* Drive Time Pill */}
                                <span
                                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-off-white border border-charcoal/10 text-charcoal/80 text-sm font-medium transition-all hover:border-charcoal/20 hover:bg-off-white/80"
                                    style={{ fontFamily: 'Urbanist, sans-serif' }}
                                >
                                    <Car className="w-4 h-4 text-coral" />
                                    <span className="font-600">{estimateTravelTime(distance, 'drive')}</span>
                                </span>

                                {/* Walk Time Pill - Only if close */}
                                {distance < 3 && (
                                    <span
                                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-off-white border border-charcoal/10 text-charcoal/80 text-sm font-medium transition-all hover:border-charcoal/20 hover:bg-off-white/80"
                                        style={{ fontFamily: 'Urbanist, sans-serif' }}
                                    >
                                        <Footprints className="w-4 h-4 text-sage/70" />
                                        <span className="font-600">{estimateTravelTime(distance, 'walk')}</span>
                                    </span>
                                )}
                            </motion.div>
                        )}

                        {isLoadingLocation && hasCoordinates && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2 mt-2"
                            >
                                <div className="w-3 h-3 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
                                <span className="text-sm text-charcoal/70" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                                    Calculating distance...
                                </span>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Map Container or Fallback */}
                {hasCoordinates ? (
                    <>
                        <div
                            className="relative w-full h-[240px] sm:h-[300px] md:h-[380px] overflow-hidden cursor-pointer group"
                            onClick={() => setIsMapModalOpen(true)}
                        >
                            <MapboxMap
                                latitude={latitude}
                                longitude={longitude}
                                name={name}
                                interactive={false}
                            />
                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/10 transition-colors duration-300 flex items-center justify-center">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileHover={{ opacity: 1, scale: 1 }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                >
                                    <div className="px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full shadow-lg flex items-center gap-2">
                                        <Maximize2 className="w-4 h-4 text-charcoal" />
                                        <span className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                                            View larger
                                        </span>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-4 sm:px-6 py-3 border-t border-white/20">
                            <div className="flex items-center gap-2">
                                <motion.a
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    href={getDirectionsUrl('driving')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-coral text-white rounded-full text-sm font-semibold hover:bg-coral/90 transition-colors"
                                    style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                                >
                                    <Navigation className="w-4 h-4" />
                                    Get directions
                                </motion.a>

                                <motion.a
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    href={getDirectionsUrl('walking')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/30 hover:bg-white/50 transition-colors"
                                    aria-label="Walking directions"
                                >
                                    <Footprints className="w-4 h-4 text-charcoal" />
                                </motion.a>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="px-4 sm:px-6 py-8">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-charcoal/5 flex items-center justify-center mx-auto mb-4">
                                <MapPin className="w-8 h-8 text-charcoal/30" />
                            </div>
                            <p
                                className="text-sm text-charcoal/60 mb-4"
                                style={{ fontFamily: 'Urbanist, sans-serif' }}
                            >
                                Map coordinates not available
                            </p>
                            <motion.a
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                href={getDirectionsUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-coral text-white rounded-full text-sm font-semibold hover:bg-coral/90 transition-colors"
                                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Search on map
                            </motion.a>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Full-Screen Map Modal */}
            <AnimatePresence>
                {isMapModalOpen && hasCoordinates && typeof window !== "undefined" && createPortal(
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[9999] bg-charcoal/95 backdrop-blur-sm"
                        onClick={() => setIsMapModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="relative w-full h-full flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="px-4 sm:px-6 py-4 bg-charcoal/90 backdrop-blur-md border-b border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <Logo variant="mobile" />
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setIsMapModalOpen(false)}
                                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                        aria-label="Close map"
                                    >
                                        <X className="w-5 h-5" />
                                    </motion.button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2
                                        className="text-lg font-semibold text-white truncate"
                                        style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                                    >
                                        {name}
                                    </h2>
                                    {displayLocation && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <p
                                                className="text-sm text-white/70 truncate"
                                                style={{ fontFamily: 'Urbanist, sans-serif' }}
                                            >
                                                {displayLocation}
                                            </p>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={copyAddress}
                                                className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                                aria-label="Copy address"
                                            >
                                                {copied ? (
                                                    <Check className="w-4 h-4 text-charcoal/70" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-white/50" />
                                                )}
                                            </motion.button>
                                        </div>
                                    )}
                                    {distance !== null && (
                                        <div className="flex items-center gap-3 mt-2">
                                            <span
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage/20 text-charcoal/70 text-sm font-medium"
                                                style={{ fontFamily: 'Urbanist, sans-serif' }}
                                            >
                                                <Navigation className="w-3 h-3" />
                                                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                                            </span>
                                            <span className="text-sm text-white/50" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                                                {estimateTravelTime(distance, 'drive')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Full Map */}
                            <div className="flex-1 relative">
                                <MapboxMap
                                    latitude={latitude}
                                    longitude={longitude}
                                    name={name}
                                    interactive={true}
                                />
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="px-4 sm:px-6 py-4 bg-charcoal/90 backdrop-blur-md border-t border-white/10">
                                <div className="flex items-center gap-3">
                                    <motion.a
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        href={getDirectionsUrl('driving')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-coral text-white rounded-full text-sm font-semibold hover:bg-coral/90 transition-colors"
                                        style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                                    >
                                        <Car className="w-4 h-4" />
                                        Drive
                                    </motion.a>
                                    <motion.a
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        href={getDirectionsUrl('walking')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/10 text-white rounded-full text-sm font-semibold hover:bg-white/20 transition-colors"
                                        style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                                    >
                                        <Footprints className="w-4 h-4" />
                                        Walk
                                    </motion.a>
                                    {shareSupported && (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={shareLocation}
                                            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                            aria-label="Share"
                                        >
                                            <Share2 className="w-5 h-5 text-white" />
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>,
                    document.body
                )}
            </AnimatePresence>
        </>
    );
}
