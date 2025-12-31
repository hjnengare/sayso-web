"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapboxMapProps {
    latitude: number;
    longitude: number;
    name: string;
    interactive?: boolean;
}

export default function MapboxMap({
    latitude,
    longitude,
    name,
    interactive = true,
}: MapboxMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        if (!mapboxToken) {
            console.warn("Mapbox token not found");
            setHasError(true);
            return;
        }

        mapboxgl.accessToken = mapboxToken;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12", // Colorful street map style
            center: [longitude, latitude],
            zoom: 15,
            interactive,
            attributionControl: false,
        });

        // Add marker
        new mapboxgl.Marker({
            color: "#E07A5F", // coral color
            scale: 1.2,
        })
            .setLngLat([longitude, latitude])
            .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(
                    `<div style="font-family: 'Urbanist', sans-serif; font-weight: 600; font-size: 14px;">${name}</div>`
                )
            )
            .addTo(map.current);

        map.current.on("load", () => {
            setIsLoaded(true);
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [latitude, longitude, name, interactive]);

    if (hasError) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-off-white/50" style={{ minHeight: "300px" }}>
                <div className="text-center p-4">
                    <p className="text-sm text-charcoal/60 mb-2">Map unavailable</p>
                    <p className="text-xs text-charcoal/40">Mapbox token not configured</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={mapContainer} className="w-full h-full" style={{ minHeight: "300px" }} />
    );
}
