"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, AlertCircle, ZoomIn, ZoomOut } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapboxMapProps {
    latitude: number;
    longitude: number;
    name: string;
    interactive?: boolean;
}

// Inject global styles for marker animations (only once)
const injectMarkerStyles = () => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('sayso-marker-styles')) return;

    const style = document.createElement('style');
    style.id = 'sayso-marker-styles';
    style.textContent = `
        @keyframes saysoMarkerPulse {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(2.5); opacity: 0.3; }
            100% { transform: scale(4); opacity: 0; }
        }
        @keyframes saysoMarkerBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
        .sayso-marker:hover .sayso-marker-pin {
            transform: rotate(-45deg) scale(1.15) !important;
            box-shadow: 0 8px 25px rgba(114, 47, 55, 0.6), 0 4px 10px rgba(0,0,0,0.25) !important;
        }
        .sayso-marker:active .sayso-marker-pin {
            transform: rotate(-45deg) scale(1.05) !important;
        }
    `;
    document.head.appendChild(style);
};

// Custom marker HTML for a premium look - using navbar-bg color
const createCustomMarker = (): HTMLDivElement => {
    injectMarkerStyles();

    const el = document.createElement('div');
    el.className = 'sayso-marker';
    el.style.cssText = 'cursor: pointer; z-index: 10;';

    // navbar-bg is #722F37
    el.innerHTML = `
        <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
        ">
            <div class="sayso-marker-pin" style="
                width: 52px;
                height: 52px;
                background: linear-gradient(145deg, #8A3A44 0%, #722F37 50%, #5E2830 100%);
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow:
                    0 6px 20px rgba(114, 47, 55, 0.5),
                    0 3px 8px rgba(0,0,0,0.25),
                    inset 0 2px 4px rgba(255,255,255,0.15);
                border: 3px solid white;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            ">
                <svg
                    style="transform: rotate(45deg);"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="white"
                    stroke="none"
                >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
            </div>
            <div style="
                width: 24px;
                height: 8px;
                background: radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%);
                border-radius: 50%;
                margin-top: -4px;
            "></div>
            <div style="
                position: absolute;
                bottom: 2px;
                width: 14px;
                height: 14px;
                background: rgba(114, 47, 55, 0.5);
                border-radius: 50%;
                animation: saysoMarkerPulse 2s ease-out infinite;
            "></div>
            <div style="
                position: absolute;
                bottom: 2px;
                width: 14px;
                height: 14px;
                background: rgba(114, 47, 55, 0.3);
                border-radius: 50%;
                animation: saysoMarkerPulse 2s ease-out infinite;
                animation-delay: 0.5s;
            "></div>
        </div>
    `;

    return el;
};

// Premium popup HTML
const createPopupHTML = (name: string): string => {
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
                margin-bottom: 6px;
                line-height: 1.3;
            ">${name}</div>
            <div style="
                font-size: 12px;
                color: #E07A5F;
                display: flex;
                align-items: center;
                gap: 5px;
                font-weight: 500;
            ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                View details
            </div>
        </div>
    `;
};

export default function MapboxMap({
    latitude,
    longitude,
    name,
    interactive = true,
}: MapboxMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markerRef = useRef<mapboxgl.Marker | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(15);

    // Zoom controls
    const handleZoomIn = useCallback(() => {
        if (map.current) {
            map.current.zoomIn({ duration: 300 });
        }
    }, []);

    const handleZoomOut = useCallback(() => {
        if (map.current) {
            map.current.zoomOut({ duration: 300 });
        }
    }, []);

    // Center on marker
    const handleCenterOnMarker = useCallback(() => {
        if (map.current) {
            map.current.flyTo({
                center: [longitude, latitude],
                zoom: 16,
                duration: 800,
                essential: true,
            });
        }
    }, [latitude, longitude]);

    useEffect(() => {
        if (!mapContainer.current) return;

        // Clean up existing map
        if (map.current) {
            map.current.remove();
            map.current = null;
        }

        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        if (!mapboxToken) {
            console.warn("Mapbox token not found");
            setHasError(true);
            return;
        }

        mapboxgl.accessToken = mapboxToken;

        try {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: "mapbox://styles/mapbox/streets-v12",
                center: [longitude, latitude],
                zoom: 15,
                interactive,
                attributionControl: false,
                pitchWithRotate: false,
                dragRotate: false,
            });

            // Track zoom level
            map.current.on('zoom', () => {
                if (map.current) {
                    setZoomLevel(map.current.getZoom());
                }
            });

            // Add custom marker
            const markerEl = createCustomMarker();
            const popup = new mapboxgl.Popup({
                offset: 35,
                closeButton: false,
                closeOnClick: true,
                className: 'premium-popup',
                maxWidth: '280px',
            }).setHTML(createPopupHTML(name));

            markerRef.current = new mapboxgl.Marker({
                element: markerEl,
                anchor: 'bottom',
            })
                .setLngLat([longitude, latitude])
                .setPopup(popup)
                .addTo(map.current);

            // Show popup on hover for desktop
            markerEl.addEventListener('mouseenter', () => {
                if (map.current && !popup.isOpen()) {
                    popup.addTo(map.current);
                }
            });
            markerEl.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (!markerEl.matches(':hover')) {
                        popup.remove();
                    }
                }, 100);
            });

            map.current.on("load", () => {
                setIsLoaded(true);

                // Add a subtle pulsing circle around the marker location
                if (map.current) {
                    map.current.addSource('marker-radius', {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: [longitude, latitude]
                            },
                            properties: {}
                        }
                    });

                    // Outer glow - navbar-bg color
                    map.current.addLayer({
                        id: 'marker-radius-glow',
                        type: 'circle',
                        source: 'marker-radius',
                        paint: {
                            'circle-radius': 80,
                            'circle-color': '#722F37',
                            'circle-opacity': 0.08,
                        }
                    });

                    // Inner circle - navbar-bg color
                    map.current.addLayer({
                        id: 'marker-radius-fill',
                        type: 'circle',
                        source: 'marker-radius',
                        paint: {
                            'circle-radius': 45,
                            'circle-color': '#722F37',
                            'circle-opacity': 0.15,
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#722F37',
                            'circle-stroke-opacity': 0.3,
                        }
                    });
                }
            });

            map.current.on('error', () => {
                setHasError(true);
            });

        } catch (error) {
            console.error("Failed to initialize map:", error);
            setHasError(true);
        }

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [latitude, longitude, name, interactive]);

    if (hasError) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-off-white" style={{ minHeight: "220px" }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center p-6"
                >
                    <div className="w-14 h-14 rounded-full bg-coral/10 flex items-center justify-center mx-auto mb-3">
                        <AlertCircle className="w-7 h-7 text-coral" />
                    </div>
                    <p
                        className="text-sm font-semibold text-charcoal mb-1"
                        style={{ fontFamily: 'Urbanist, sans-serif' }}
                    >
                        Map unavailable
                    </p>
                    <p
                        className="text-sm text-charcoal/60"
                        style={{ fontFamily: 'Urbanist, sans-serif' }}
                    >
                        Unable to load the map
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full" style={{ minHeight: "220px" }}>
            {/* Loading overlay */}
            {!isLoaded && (
                <div className="absolute inset-0 z-10 bg-off-white flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-3"
                    >
                        <motion.div
                            animate={{
                                scale: [1, 1.15, 1],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="w-14 h-14 rounded-full bg-coral/15 flex items-center justify-center"
                        >
                            <MapPin className="w-7 h-7 text-coral" />
                        </motion.div>
                        <div className="flex items-center gap-1.5">
                            <motion.div
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                                className="w-2 h-2 rounded-full bg-coral"
                            />
                            <motion.div
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                                className="w-2 h-2 rounded-full bg-coral"
                            />
                            <motion.div
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                                className="w-2 h-2 rounded-full bg-coral"
                            />
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Map container */}
            <div
                ref={mapContainer}
                className={`w-full h-full transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Custom zoom controls */}
            {isLoaded && interactive && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="absolute bottom-4 right-4 flex flex-col gap-1"
                >
                    <button
                        onClick={handleZoomIn}
                        className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-off-white transition-colors border border-white/80"
                        aria-label="Zoom in"
                    >
                        <ZoomIn className="w-5 h-5 text-charcoal" />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-off-white transition-colors border border-white/80"
                        aria-label="Zoom out"
                    >
                        <ZoomOut className="w-5 h-5 text-charcoal" />
                    </button>
                </motion.div>
            )}

            {/* Re-center button */}
            {isLoaded && interactive && (
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={handleCenterOnMarker}
                    className="absolute bottom-4 left-4 px-3 py-2 bg-white rounded-xl shadow-lg flex items-center gap-2 hover:bg-off-white transition-colors border border-white/80"
                    aria-label="Center on location"
                >
                    <MapPin className="w-4 h-4 text-coral" />
                    <span
                        className="text-sm font-semibold text-charcoal"
                        style={{ fontFamily: 'Urbanist, sans-serif' }}
                    >
                        Center
                    </span>
                </motion.button>
            )}

            {/* Custom styles for Mapbox elements */}
            <style jsx global>{`
                .mapboxgl-popup-content {
                    padding: 0 !important;
                    border-radius: 14px !important;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.15) !important;
                    border: 1px solid rgba(255,255,255,0.9) !important;
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
