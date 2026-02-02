"use client";

import { useEffect, useRef, useState } from 'react';
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

// Location pin icon: white fill with dark outline for visibility on map
const MARKER_FILL = '#ffffff';
const MARKER_STROKE = '#374151';
// Cluster circles stay sage
const CLUSTER_COLOR = '#8BA888';

/** Create a location pin image for Mapbox (canvas → ImageData) */
function createLocationMarkerImage(): { width: number; height: number; data: Uint8Array | Uint8ClampedArray } {
  const size = 32;
  const scale = 2; // retina
  const w = size * scale;
  const h = size * scale;
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) {
    return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };

  const cx = w / 2;
  const headRadius = 10 * scale;
  const headY = headRadius + 2 * scale;
  const tipY = h - 2 * scale;
  const neckWidth = 6 * scale;

  ctx.clearRect(0, 0, w, h);
  // Pin: circle on top + triangle pointing down
  ctx.beginPath();
  ctx.arc(cx, headY, headRadius, 0, Math.PI * 2);
  ctx.moveTo(cx - neckWidth / 2, headY + headRadius);
  ctx.lineTo(cx, tipY);
  ctx.lineTo(cx + neckWidth / 2, headY + headRadius);
  ctx.closePath();
  ctx.fillStyle = MARKER_FILL;
  ctx.fill();
  ctx.strokeStyle = MARKER_STROKE;
  ctx.lineWidth = 2;
  ctx.stroke();

  const imageData = ctx.getImageData(0, 0, w, h);
  return { width: w, height: h, data: imageData.data };
}

export default function BusinessesMap({ businesses, className = '' }: BusinessesMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const router = useRouter();
  const [mapLoaded, setMapLoaded] = useState(false);

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

  // Update markers when businesses change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Filter valid businesses with coordinates
    const validBusinesses = businesses.filter(
      b => b.lat != null && b.lng != null && !isNaN(b.lat) && !isNaN(b.lng)
    );

    if (validBusinesses.length === 0) {
      // No businesses - center on Cape Town
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
      if (map.getLayer('unclustered-point')) map.removeLayer('unclustered-point');
      map.removeSource('businesses');
    }

    // Add location pin image once (for unclustered markers)
    if (!map.hasImage('location-marker')) {
      const { width, height, data } = createLocationMarkerImage();
      map.addImage('location-marker', { width, height, data }, { pixelRatio: 2 });
    }

    // Add source with clustering
    map.addSource('businesses', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Add cluster circles layer
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
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          10,
          30,
          30,
          40,
        ],
      },
    });

    // Add cluster count labels
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'businesses',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Add unclustered points as location pin markers
    map.addLayer({
      id: 'unclustered-point',
      type: 'symbol',
      source: 'businesses',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': 'location-marker',
        'icon-size': 0.5,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
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

    // Click handler for unclustered points - go to business profile
    map.on('click', 'unclustered-point', (e) => {
      if (!e.features || !e.features.length) return;

      const feature = e.features[0];
      const { id, slug } = feature.properties || {};
      if (!id) return;

      const path = slug ? `/business/${slug}` : `/business/${id}`;
      router.push(path);
    });

    // Change cursor on hover
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', 'unclustered-point', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'unclustered-point', () => {
      map.getCanvas().style.cursor = '';
    });

    // Fit bounds to show all markers
    if (validBusinesses.length === 1) {
      // Single business - center on it
      map.flyTo({
        center: [validBusinesses[0].lng, validBusinesses[0].lat],
        zoom: 14,
      });
    } else {
      // Multiple businesses - fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      validBusinesses.forEach(b => {
        bounds.extend([b.lng, b.lat]);
      });
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  }, [businesses, mapLoaded, router]);

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
    </div>
  );
}
