"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import BusinessCard from "../BusinessCard/BusinessCard";

interface Business {
    id: string;
    slug?: string;
    name: string;
    lat?: number | null;
    lng?: number | null;
    location?: string;
    address?: string;
    category?: string;
    rating?: number;
    alt: string; // Required by BusinessCard
    reviews: number; // Required by BusinessCard (number, not array)
    image?: string;
    image_url?: string;
    uploaded_images?: string[];
    [key: string]: any;
}

interface SearchResultsMapProps {
    businesses: Business[];
    onBusinessClick?: (business: Business) => void;
    userLocation?: { lat: number; lng: number } | null;
    className?: string;
}

/** Inject marker CSS once (hover effects + pulse animation) */
const injectSearchMarkerStyles = () => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('sayso-search-marker-styles')) return;

    const style = document.createElement('style');
    style.id = 'sayso-search-marker-styles';
    style.textContent = `
        @keyframes saysoSearchPulse {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(2.5); opacity: 0.2; }
            100% { transform: scale(4); opacity: 0; }
        }
        .sayso-search-marker {
            cursor: pointer;
            z-index: 1;
        }
        .sayso-search-marker.sayso-selected {
            z-index: 5;
        }
        .sayso-search-marker:hover .sayso-search-pin {
            transform: rotate(-45deg) scale(1.15) !important;
            box-shadow: 0 6px 20px rgba(224,122,95,0.5), 0 3px 8px rgba(0,0,0,0.2) !important;
        }
        .sayso-search-marker:active .sayso-search-pin {
            transform: rotate(-45deg) scale(1.05) !important;
        }
    `;
    document.head.appendChild(style);
};

/** Create a premium pin-shaped marker element */
function createSearchMarker(): HTMLDivElement {
    injectSearchMarkerStyles();

    const el = document.createElement('div');
    el.className = 'sayso-search-marker';

    el.innerHTML = `
        <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
        ">
            <div class="sayso-search-pin" style="
                width: 36px;
                height: 36px;
                background: linear-gradient(145deg, #E8876C 0%, #E07A5F 50%, #D46D52 100%);
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow:
                    0 4px 12px rgba(224,122,95,0.4),
                    0 2px 6px rgba(0,0,0,0.15),
                    inset 0 1px 3px rgba(255,255,255,0.2);
                border: 2.5px solid white;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            ">
                <svg
                    style="transform: rotate(45deg);"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="white"
                    stroke="none"
                >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
            </div>
            <div style="
                width: 16px;
                height: 6px;
                background: radial-gradient(ellipse, rgba(0,0,0,0.2) 0%, transparent 70%);
                border-radius: 50%;
                margin-top: -3px;
            "></div>
            <div class="sayso-pulse-ring" style="
                position: absolute;
                bottom: 1px;
                width: 10px;
                height: 10px;
                background: rgba(224, 122, 95, 0.4);
                border-radius: 50%;
                display: none;
            "></div>
            <div class="sayso-pulse-ring-delayed" style="
                position: absolute;
                bottom: 1px;
                width: 10px;
                height: 10px;
                background: rgba(224, 122, 95, 0.25);
                border-radius: 50%;
                display: none;
            "></div>
        </div>
    `;

    return el;
}

/** Premium popup HTML */
function createSearchPopupHTML(business: Business): string {
    const ratingHTML = business.rating
        ? `<div style="
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #666;
            font-weight: 500;
            margin-bottom: 6px;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#F4A261" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            ${business.rating.toFixed(1)}
          </div>`
        : '';

    return `
        <div style="
            padding: 14px 18px;
            font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
            background: white;
        ">
            <div style="
                font-weight: 700;
                font-size: 15px;
                color: #2D3436;
                margin-bottom: 4px;
                line-height: 1.3;
            ">${business.name}</div>
            ${business.category ? `<div style="
                font-size: 12px;
                color: #888;
                font-weight: 500;
                margin-bottom: ${business.rating ? '4px' : '6px'};
            ">${business.category}</div>` : ''}
            ${ratingHTML}
            <div style="
                font-size: 12px;
                color: #E07A5F;
                display: flex;
                align-items: center;
                gap: 5px;
                font-weight: 600;
            ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                View details
            </div>
        </div>
    `;
}

export default function SearchResultsMap({
    businesses,
    onBusinessClick,
    userLocation,
    className = "",
}: SearchResultsMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const markerElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        if (!mapboxToken) {
            console.warn("Mapbox token not found");
            return;
        }

        mapboxgl.accessToken = mapboxToken;

        // Get center from businesses with coordinates or use default
        const businessesWithCoords = businesses.filter(b => b.lat && b.lng);
        let center: [number, number] = [-18.4241, 33.9249]; // Default to Cape Town
        let zoom = 12;

        if (businessesWithCoords.length > 0) {
            const avgLat = businessesWithCoords.reduce((sum, b) => sum + (b.lat || 0), 0) / businessesWithCoords.length;
            const avgLng = businessesWithCoords.reduce((sum, b) => sum + (b.lng || 0), 0) / businessesWithCoords.length;
            center = [avgLng, avgLat];

            if (businessesWithCoords.length === 1) {
                zoom = 15;
            } else if (businessesWithCoords.length <= 5) {
                zoom = 13;
            }
        } else if (userLocation) {
            center = [userLocation.lng, userLocation.lat];
            zoom = 13;
        }

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: center,
            zoom: zoom,
            interactive: true,
            attributionControl: false,
        });

        map.current.on("load", () => {
            setIsLoaded(true);
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [businesses.length, userLocation]);

    // Update markers when businesses change
    useEffect(() => {
        if (!map.current || !isLoaded) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        markerElementsRef.current.clear();

        // Deduplicate businesses by address/coordinates (keep first occurrence)
        const seen = new Set<string>();
        const uniqueBusinesses = businesses.filter((business) => {
            if (!business.lat || !business.lng) return false;

            const coordKey = `${business.lat.toFixed(5)},${business.lng.toFixed(5)}`;
            const addressKey = business.address || business.location || '';
            const key = addressKey || coordKey;

            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Add markers for businesses with coordinates
        uniqueBusinesses.forEach((business) => {
            if (!business.lat || !business.lng) return;

            const markerElement = createSearchMarker();

            const marker = new mapboxgl.Marker({
                element: markerElement,
                anchor: 'bottom',
            })
                .setLngLat([business.lng, business.lat])
                .setPopup(
                    new mapboxgl.Popup({
                        offset: 25,
                        closeButton: false,
                        closeOnClick: true,
                        maxWidth: '280px',
                    }).setHTML(createSearchPopupHTML(business))
                )
                .addTo(map.current!);

            // Show popup on hover (desktop)
            markerElement.addEventListener('mouseenter', () => {
                if (map.current && !marker.getPopup().isOpen()) {
                    marker.getPopup().addTo(map.current);
                }
            });
            markerElement.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (!markerElement.matches(':hover')) {
                        marker.getPopup().remove();
                    }
                }, 150);
            });

            markerElement.addEventListener('click', () => {
                // Deselect previous
                markerElementsRef.current.forEach((el) => {
                    el.classList.remove('sayso-selected');
                    const pulseRings = el.querySelectorAll('.sayso-pulse-ring, .sayso-pulse-ring-delayed');
                    pulseRings.forEach(ring => {
                        (ring as HTMLElement).style.display = 'none';
                        (ring as HTMLElement).style.animation = 'none';
                    });
                });

                // Select current
                markerElement.classList.add('sayso-selected');
                const pulseRing = markerElement.querySelector('.sayso-pulse-ring') as HTMLElement;
                const pulseRingDelayed = markerElement.querySelector('.sayso-pulse-ring-delayed') as HTMLElement;
                if (pulseRing) {
                    pulseRing.style.display = 'block';
                    pulseRing.style.animation = 'saysoSearchPulse 2s ease-out infinite';
                }
                if (pulseRingDelayed) {
                    pulseRingDelayed.style.display = 'block';
                    pulseRingDelayed.style.animation = 'saysoSearchPulse 2s ease-out infinite 0.5s';
                }

                setSelectedBusiness(business);
                if (onBusinessClick) {
                    onBusinessClick(business);
                }
            });

            markerElementsRef.current.set(business.id, markerElement);
            markersRef.current.push(marker);
        });

        // Fit bounds to show all markers if we have businesses
        if (markersRef.current.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            markersRef.current.forEach(marker => {
                bounds.extend(marker.getLngLat());
            });

            map.current.fitBounds(bounds, {
                padding: { top: 80, bottom: 80, left: 50, right: 50 },
                maxZoom: 15,
                duration: 400,
            });
        }
    }, [businesses, isLoaded, onBusinessClick]);

    if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
        return (
            <div className={`w-full h-full flex items-center justify-center bg-off-white/50 ${className}`}>
                <div className="text-center p-4">
                    <p className="text-sm text-charcoal/60 mb-2">Map unavailable</p>
                    <p className="text-sm text-charcoal/60">Mapbox token not configured</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative w-full h-full ${className}`}>
            <div ref={mapContainer} className="w-full h-full" style={{ minHeight: "280px" }} />
            {selectedBusiness && (
                <div className="absolute bottom-3 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 z-10 max-w-md mx-auto">
                    <div className="bg-white rounded-[12px] shadow-xl border border-white/30 p-3">
                        <BusinessCard
                            business={{
                                ...selectedBusiness,
                                alt: selectedBusiness.alt || selectedBusiness.name || '',
                                reviews: selectedBusiness.reviews || 0,
                                category: selectedBusiness.category || '',
                            } as any}
                            compact={true}
                        />
                    </div>
                </div>
            )}

            {/* Premium popup styles */}
            <style jsx global>{`
                .mapboxgl-popup-content {
                    padding: 0 !important;
                    border-radius: 12px !important;
                    box-shadow: 0 6px 24px rgba(0,0,0,0.12) !important;
                    border: 1px solid rgba(255,255,255,0.8) !important;
                    overflow: hidden;
                }
                .mapboxgl-popup-tip {
                    border-top-color: white !important;
                }
                .mapboxgl-ctrl-attrib {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
