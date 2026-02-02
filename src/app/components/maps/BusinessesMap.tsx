"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouter } from 'next/navigation';

// Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export type BusinessMapItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string;
  image_url?: string | null;
  slug?: string | null;
};

interface BusinessesMapProps {
  businesses: BusinessMapItem[];
  className?: string;
}

const CAPE_TOWN_CENTER: [number, number] = [18.4241, -33.9249];

// Brand colors
const CLUSTER_COLOR = '#8BA888';

/** Inject marker CSS once (hover effects) */
const injectMarkerStyles = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('sayso-businesses-marker-styles')) return;

  const style = document.createElement('style');
  style.id = 'sayso-businesses-marker-styles';
  style.textContent = `
    .sayso-biz-marker {
      cursor: pointer;
      z-index: 1;
    }
    .sayso-biz-marker:hover .sayso-biz-pin {
      transform: rotate(-45deg) scale(1.15) !important;
      box-shadow: 0 6px 20px rgba(224,122,95,0.5), 0 3px 8px rgba(0,0,0,0.2) !important;
    }
    .sayso-biz-marker:active .sayso-biz-pin {
      transform: rotate(-45deg) scale(1.05) !important;
    }
  `;
  document.head.appendChild(style);
};

/** Create a premium pin-shaped marker element */
function createPinMarker(): HTMLDivElement {
  injectMarkerStyles();

  const el = document.createElement('div');
  el.className = 'sayso-biz-marker';

  el.innerHTML = `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    ">
      <div class="sayso-biz-pin" style="
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
    </div>
  `;

  return el;
}

/** Premium popup HTML for hover */
function createHoverPopupHTML(name: string, category: string): string {
  return `
    <div style="
      padding: 12px 16px;
      font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif;
      background: white;
    ">
      <div style="
        font-weight: 700;
        font-size: 14px;
        color: #2D3436;
        margin-bottom: ${category ? '4px' : '0'};
        line-height: 1.3;
      ">${name}</div>
      ${category ? `<div style="
        font-size: 12px;
        color: #666;
        font-weight: 500;
      ">${category}</div>` : ''}
    </div>
  `;
}

export default function BusinessesMap({ businesses, className = '' }: BusinessesMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const domMarkersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const domMarkersOnScreenRef = useRef<Record<string, mapboxgl.Marker>>({});
  const router = useRouter();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Stable navigate callback
  const navigateToBusiness = useCallback((id: string, slug: string | null) => {
    const path = slug ? `/business/${slug}` : `/business/${id}`;
    router.push(path);
  }, [router]);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: CAPE_TOWN_CENTER,
      zoom: 11,
    });

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update source + layers when businesses change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;

    // Clean all DOM markers
    Object.values(domMarkersRef.current).forEach(m => m.remove());
    domMarkersRef.current = {};
    domMarkersOnScreenRef.current = {};

    // Filter valid businesses with coordinates
    const validBusinesses = businesses.filter(
      b => b.lat != null && b.lng != null && !isNaN(b.lat) && !isNaN(b.lng)
    );

    if (validBusinesses.length === 0) {
      // Remove source if it exists
      if (map.getSource('businesses')) {
        if (map.getLayer('clusters')) map.removeLayer('clusters');
        if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
        map.removeSource('businesses');
      }
      map.flyTo({ center: CAPE_TOWN_CENTER, zoom: 11 });
      return;
    }

    // Create GeoJSON
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: validBusinesses.map(b => ({
        type: 'Feature',
        properties: {
          id: b.id,
          name: b.name,
          category: b.category ?? '',
          slug: b.slug ?? '',
          image_url: b.image_url ?? '',
        },
        geometry: {
          type: 'Point',
          coordinates: [b.lng, b.lat],
        },
      })),
    };

    // Remove existing source and layers if they exist
    if (map.getSource('businesses')) {
      if (map.getLayer('clusters')) map.removeLayer('clusters');
      if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
      map.removeSource('businesses');
    }

    // Add source with clustering
    map.addSource('businesses', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Cluster circles with white ring
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'businesses',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          CLUSTER_COLOR,
          10,
          '#6B8E68',
          30,
          '#4A6E47',
        ],
        'circle-opacity': 0.9,
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          10,
          30,
          30,
          40,
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Cluster count labels
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'businesses',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 13,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Click handler for clusters - zoom in
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });

      if (!features.length) return;

      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource('businesses') as mapboxgl.GeoJSONSource;

      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;

        const coordinates = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({
          center: coordinates,
          zoom: zoom || 14,
        });
      });
    });

    // Cursor changes for clusters
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });

    // --- DOM markers for unclustered points ---
    // On each render, sync DOM markers with unclustered source features
    const updateDOMMarkers = () => {
      if (!map.getSource('businesses')) return;

      const features = map.querySourceFeatures('businesses');
      const newMarkers: Record<string, mapboxgl.Marker> = {};

      for (const feature of features) {
        const props = feature.properties;
        if (!props || props.cluster) continue; // Skip clusters

        const id = props.id as string;
        if (!id) continue;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

        let marker = domMarkersRef.current[id];
        if (!marker) {
          // Create new DOM marker
          const el = createPinMarker();

          // Hover popup
          const popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 25,
            maxWidth: '250px',
          }).setHTML(createHoverPopupHTML(props.name || '', props.category || ''));

          el.addEventListener('mouseenter', () => {
            if (map && !popup.isOpen()) {
              popup.setLngLat(marker.getLngLat()).addTo(map);
            }
          });
          el.addEventListener('mouseleave', () => {
            setTimeout(() => {
              if (!el.matches(':hover')) popup.remove();
            }, 100);
          });

          // Click → navigate
          const slug = props.slug || null;
          el.addEventListener('click', () => {
            navigateToBusiness(id, slug);
          });

          marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat(coords);

          domMarkersRef.current[id] = marker;
        }

        newMarkers[id] = marker;

        // Add to map if not already on screen
        if (!domMarkersOnScreenRef.current[id]) {
          marker.addTo(map);
        }
      }

      // Remove markers no longer visible
      for (const id in domMarkersOnScreenRef.current) {
        if (!newMarkers[id]) {
          domMarkersOnScreenRef.current[id].remove();
        }
      }

      domMarkersOnScreenRef.current = newMarkers;
    };

    map.on('render', updateDOMMarkers);

    // Fit bounds to show all markers
    if (validBusinesses.length === 1) {
      map.flyTo({
        center: [validBusinesses[0].lng, validBusinesses[0].lat],
        zoom: 14,
      });
    } else {
      const bounds = new mapboxgl.LngLatBounds();
      validBusinesses.forEach(b => {
        bounds.extend([b.lng, b.lat]);
      });
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }

    return () => {
      map.off('render', updateDOMMarkers);
    };
  }, [businesses, mapLoaded, navigateToBusiness]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full rounded-lg" />

      {/* Empty state overlay */}
      {businesses.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-off-white/90 rounded-lg">
          <div className="text-center px-4">
            <p className="font-urbanist text-base font-600 text-charcoal mb-2">
              No businesses with location yet
            </p>
            <p className="font-urbanist text-sm text-charcoal/60">
              Businesses will appear here once they add their location
            </p>
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
