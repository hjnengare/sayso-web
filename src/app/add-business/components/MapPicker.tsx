"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Search, Loader2, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";

const CAPE_TOWN_CENTER: [number, number] = [18.4241, -33.9249];

export interface MapPickerLocation {
  lat: number;
  lng: number;
  address: string;
  location: string;
}

interface MapPickerProps {
  lat: string;
  lng: string;
  onLocationSelect: (loc: MapPickerLocation) => void;
  disabled?: boolean;
  className?: string;
}

function MapPickerInner({ lat, lng, onLocationSelect, disabled, className = "" }: MapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const mapboxglRef = useRef<typeof import("mapbox-gl").default | null>(null);

  const currentLat = lat ? parseFloat(lat) : null;
  const currentLng = lng ? parseFloat(lng) : null;
  const hasValidCoords = currentLat != null && currentLng != null && !isNaN(currentLat) && !isNaN(currentLng);

  const reverseGeocode = useCallback(async (latitude: number, longitude: number): Promise<MapPickerLocation | null> => {
    try {
      const res = await fetch(
        `/api/reverse-geocode?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        return {
          lat: latitude,
          lng: longitude,
          address: data.address || "",
          location: data.location || "",
        };
      }
      return { lat: latitude, lng: longitude, address: "", location: "" };
    } catch {
      return { lat: latitude, lng: longitude, address: "", location: "" };
    }
  }, []);

  const placeMarkerAndNotify = useCallback(
    async (latitude: number, longitude: number) => {
      const loc = await reverseGeocode(latitude, longitude);
      if (loc) onLocationSelect(loc);
    },
    [onLocationSelect, reverseGeocode]
  );

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setIsSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && typeof data.lat === "number" && typeof data.lng === "number") {
        await placeMarkerAndNotify(data.lat, data.lng);
        if (map.current) {
          map.current.flyTo({ center: [data.lng, data.lat], zoom: 16, duration: 800 });
        }
      } else {
        setSearchError("Address not found. Try a different search or drop a pin on the map.");
      }
    } catch {
      setSearchError("Search failed. Try again or drop a pin on the map.");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, placeMarkerAndNotify]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      setHasError(true);
      return;
    }

    let mapboxgl: typeof import("mapbox-gl").default;
    import("mapbox-gl").then((mod) => {
      mapboxgl = mod.default;
      mapboxglRef.current = mapboxgl;
      mapboxgl.accessToken = token;
      // @ts-ignore - CSS import for side effects
      import("mapbox-gl/dist/mapbox-gl.css");

      const center: [number, number] = hasValidCoords ? [currentLng!, currentLat!] : CAPE_TOWN_CENTER;
      const zoom = hasValidCoords ? 15 : 12;

      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center,
        zoom,
        attributionControl: false,
      });

      const updateMarker = (lngLat: [number, number]) => {
        if (markerRef.current) markerRef.current.remove();
        const el = document.createElement("div");
        el.className = "map-picker-marker";
        el.innerHTML = `
          <div style="width:32px;height:32px;background:linear-gradient(145deg,#8A3A44 0%,#722F37 50%,#5E2830 100%);border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(114,47,55,0.4);border:2px solid white;">
            <svg style="transform:rotate(45deg)" width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
          </div>
        `;
        markerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(lngLat).addTo(map.current);
      };

      map.current.on("load", () => {
        setIsLoaded(true);
        if (hasValidCoords) {
          updateMarker([currentLng!, currentLat!]);
        }
      });

      map.current.on("click", (e: { lngLat: { lat: number; lng: number } }) => {
        if (disabled) return;
        const { lat: l, lng: ln } = e.lngLat;
        updateMarker([ln, l]);
        placeMarkerAndNotify(l, ln);
      });

      map.current.on("error", () => setHasError(true));

      return () => {
        if (markerRef.current) markerRef.current.remove();
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapboxglRef.current || !isLoaded) return;
    if (hasValidCoords) {
      const mapboxgl = mapboxglRef.current;
      if (markerRef.current) markerRef.current.remove();
      const el = document.createElement("div");
      el.className = "map-picker-marker";
      el.innerHTML = `
        <div style="width:32px;height:32px;background:linear-gradient(145deg,#8A3A44 0%,#722F37 50%,#5E2830 100%);border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(114,47,55,0.4);border:2px solid white;">
          <svg style="transform:rotate(45deg)" width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
        </div>
      `;
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([currentLng!, currentLat!])
        .addTo(map.current);
      map.current.flyTo({ center: [currentLng!, currentLat!], zoom: 15, duration: 400 });
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [isLoaded, hasValidCoords, currentLat, currentLng]);

  if (hasError) {
    return (
      <div className={`rounded-[12px] border border-charcoal/10 bg-off-white/50 p-6 text-center ${className}`}>
        <AlertCircle className="w-8 h-8 text-charcoal/50 mx-auto mb-2" />
        <p className="text-sm text-charcoal/70" style={{ fontFamily: "Urbanist, sans-serif" }}>
          Map unavailable. Use the search above or enter an address.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
          placeholder="Search for an address..."
          disabled={disabled}
          className="flex-1 bg-white/95 border border-white/60 rounded-full px-4 py-2.5 text-sm font-medium text-charcoal placeholder-charcoal/50 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
          style={{ fontFamily: "Urbanist, sans-serif" }}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={disabled || isSearching}
          className="shrink-0 px-4 py-2.5 rounded-full bg-sage/90 hover:bg-sage text-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span className="text-sm font-semibold" style={{ fontFamily: "Urbanist, sans-serif" }}>
            Search
          </span>
        </button>
      </div>
      {searchError && (
        <p className="text-xs text-coral font-medium" style={{ fontFamily: "Urbanist, sans-serif" }}>
          {searchError}
        </p>
      )}
      <div
        className="relative rounded-[12px] overflow-hidden border border-charcoal/10 bg-off-white/30"
        style={{ minHeight: "220px" }}
      >
        {!isLoaded && (
          <div className="absolute inset-0 z-10 bg-off-white/90 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-sage animate-spin" />
              <span className="text-sm text-charcoal/70" style={{ fontFamily: "Urbanist, sans-serif" }}>
                Loading map...
              </span>
            </div>
          </div>
        )}
        <div
          ref={mapContainer}
          className={`w-full h-full ${!isLoaded ? "opacity-0" : "opacity-100"}`}
          style={{ minHeight: "220px" }}
        />
        <div
          className="absolute bottom-3 left-3 right-3 text-center pointer-events-none"
          style={{ fontFamily: "Urbanist, sans-serif" }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-charcoal/80 text-xs font-medium shadow-sm">
            <MapPin className="w-3.5 h-3.5" />
            {disabled ? "Map disabled" : "Click on the map to set location"}
          </span>
        </div>
      </div>
    </div>
  );
}

const MapPicker = dynamic(() => Promise.resolve(MapPickerInner), {
  ssr: false,
  loading: () => (
    <div className="rounded-[12px] border border-charcoal/10 bg-off-white/30 min-h-[220px] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-sage animate-spin" />
    </div>
  ),
});

export default MapPicker;
