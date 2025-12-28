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
    uploaded_image?: string;
    uploadedImage?: string;
    [key: string]: any;
}

interface SearchResultsMapProps {
    businesses: Business[];
    onBusinessClick?: (business: Business) => void;
    userLocation?: { lat: number; lng: number } | null;
    className?: string;
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
            style: "mapbox://styles/mapbox/light-v11",
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
    }, [businesses.length, userLocation]); // Re-init only if business count changes significantly

    // Update markers when businesses change
    useEffect(() => {
        if (!map.current || !isLoaded) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add markers for businesses with coordinates
        businesses.forEach((business) => {
            if (!business.lat || !business.lng) return;

            const markerElement = document.createElement('div');
            markerElement.className = 'business-marker';
            markerElement.innerHTML = `
                <div class="w-6 h-6 bg-coral rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center">
                    <div class="w-3 h-3 bg-white rounded-full"></div>
                </div>
            `;
            markerElement.style.cursor = 'pointer';

            const marker = new mapboxgl.Marker(markerElement)
                .setLngLat([business.lng, business.lat])
                .setPopup(
                    new mapboxgl.Popup({ offset: 25 })
                        .setHTML(`
                            <div style="font-family: 'Urbanist', sans-serif; min-width: 200px;">
                                <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${business.name}</div>
                                ${business.category ? `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">${business.category}</div>` : ''}
                                ${business.rating ? `<div style="font-size: 12px; color: #666;">⭐ ${business.rating.toFixed(1)}</div>` : ''}
                            </div>
                        `)
                )
                .addTo(map.current!);

            markerElement.addEventListener('click', () => {
                setSelectedBusiness(business);
                if (onBusinessClick) {
                    onBusinessClick(business);
                }
            });

            markersRef.current.push(marker);
        });

        // Fit bounds to show all markers if we have businesses
        if (markersRef.current.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            markersRef.current.forEach(marker => {
                bounds.extend(marker.getLngLat());
            });
            
            // Add padding
            map.current.fitBounds(bounds, {
                padding: { top: 50, bottom: 50, left: 50, right: 50 },
                maxZoom: 15,
            });
        }
    }, [businesses, isLoaded, onBusinessClick]);

    if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
        return (
            <div className={`w-full h-full flex items-center justify-center bg-off-white/50 ${className}`}>
                <div className="text-center p-4">
                    <p className="text-sm text-charcoal/60 mb-2">Map unavailable</p>
                    <p className="text-xs text-charcoal/40">Mapbox token not configured</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative w-full h-full ${className}`}>
            <div ref={mapContainer} className="w-full h-full" style={{ minHeight: "400px" }} />
            {selectedBusiness && (
                <div className="absolute bottom-4 left-4 right-4 z-10 max-w-md mx-auto">
                    <div className="bg-white rounded-[20px] shadow-xl border border-white/30 p-3">
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
        </div>
    );
}
